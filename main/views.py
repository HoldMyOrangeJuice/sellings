import json
import math
import os
import sys
import uuid

from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponse
from django.shortcuts import render, redirect

from main.ajax import Response
from main.models import Item

CATEGORIES = {0: "Кухонное оборудование",
              1: "Оборудование для чая/кофе/кофе-брейка",
              2: "Бытовая техника",
              3: "Сервировка стола",
              4: "Стекло для сервировки",
              5: "Текстиль для сервировки",
              6: "Аксессуары и расходные материалы для сервировки",
              7: "Кухонный инвентарь",
              8: "Посуда для приготовления пищи",
              9: "Книги по кулинарии",
              10: "Упаковка для транспортировки пищевых продуктов",
              11: "Разное",
              }


# print(Item.objects.all()[0].category)

def get_cat_id(cat_):
    for cat_id, cat in zip(CATEGORIES.keys(), CATEGORIES.values()):
        if cat == cat_:
            return cat_id


def categorize_items(items):
    data = []

    for cat_id in CATEGORIES.keys():
        items_of_cat = []
        for item in items:
            if item.category == cat_id:
                items_of_cat.append(item)
        if len(items_of_cat) > 0:
            data.append((CATEGORIES[cat_id], items_of_cat))
    return data


def count_cats():
    """returns set of (category, entry count)"""
    cats_to_use = zip(CATEGORIES.keys(), CATEGORIES.values())
    r = {}
    for cat_id, cat in cats_to_use:
        r[cat_id] = 0

    for item in Item.objects.all():

        if r.get(item.category) is None:
            continue
        r[item.category] = r[item.category] + 1

    s = []
    for cat_id in r.keys():
        s.append((cat_id, CATEGORIES.get(cat_id), r[cat_id]))
    return s


def gtp(request):
    if not mobile(request):
        return "desktop"
    return "mobile"

def price_page(request):
    query = None
    cat_id = None
    if request.GET.get('q'):
        query = request.GET.get('q')
    if request.GET.get('cat'):
        cat_id = request.GET.get('cat')
    if not query and not cat_id:
        query = ""
    return render(request, f"{gtp(request)}/price_template.html", context={"admin": request.user.is_superuser,
                                                           "categories": json.dumps(CATEGORIES),
                                                           "counted_categories": count_cats(),
                                                           'render_mode': 'price_list',
                                                           'query': query,
                                                           'cat_id': cat_id})


def login_view(request):
    if request.method == "POST":
        u = request.POST.get("username")
        p = request.POST.get("password")
        user = authenticate(username=u, password=p)
        if user:
            login(request, user)

    if request.user.is_anonymous:
        return render(request, "login.html", context={"form": AuthenticationForm()})

    else:
        return redirect("/")


import re


def mobile(request):
    """Return True if the request comes from a mobile device."""
    MOBILE_AGENT_RE = re.compile(r".*(iphone|mobile|androidtouch)", re.IGNORECASE)
    if MOBILE_AGENT_RE.match(request.META['HTTP_USER_AGENT']):
        return True
    else:
        return False


class AttrsSet:
    def __init__(self, obj, *attrs):
        for attr in attrs:
            self.__setattr__(attr, obj.get(attr))


# Item.objects.all().delete()
def save_photos(request):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    filenames = []

    for photo in request.FILES.getlist('photo'):
        filename = str(uuid.uuid1())
        with open(f"{dir_path}/static/images/items/{filename}", "wb") as f:
            f.write(photo.read())
        filenames.append(filename)

    return filenames


def edit_item(request):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    formdata = AttrsSet(request.POST, "id_to_edit", "name", "description", "condition", "photo", "category", "subcats")
    item = Item.objects.get(id=formdata.id_to_edit)
    item.name = formdata.name
    item.subcats = json.loads(formdata.subcats)
    item.description = formdata.description
    item.condition = formdata.condition
    item.category = get_cat_id(formdata.category)
    item.photo_paths = save_photos(request)
    item.save()

    return Response(True, "edit success")


def add_item(request):
    dir_path = os.path.dirname(os.path.realpath(__file__))

    name = request.POST.get("name")
    subcats = request.POST.get("subcats")
    if not subcats:
        if not request.POST.get("price") or not request.POST.get("amount") or not request.POST.get("param"):
            return Response(success=False, message='invalid form')

        subcats = [{"price": request.POST.get("price"),
                    "amount": request.POST.get("amount"),
                    "param": request.POST.get("param")}]

    category = get_cat_id(request.POST.get("category"))
    filenames = save_photos(request)
    description = request.POST.get("description")
    condition = request.POST.get("condition")

    if not name or not subcats or category is None or not filenames or not description or not condition:
        return Response(success=False, message="invalid form")

    Item.objects.create(name=name, subcats=subcats, photo_paths=filenames, category=category, description=description,
                        condition=condition)
    return Response(success=True, message="added successfully")


def add_photos(request):
    item_id = request.POST.get("item_id_add_photo_for")
    filenames = save_photos(request)
    item = Item.objects.get(id=item_id)
    paths = item.photo_paths
    paths.extend(filenames)
    item.photo_paths = paths
    item.save()

    # send photo names to add client-side
    return Response(success=True, message="photos added successfully", payload={"filenames": filenames})


def delete_photos(request):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    photos = json.loads(request.POST.get("filenames_to_delete"))
    item_id = request.POST.get("item_id")
    if item_id:
        item = Item.objects.get(id=item_id)
        item.photo_paths = [x for x in item.photo_paths if x not in photos]
        item.save()

        for photo in photos:
            os.remove(f"{dir_path}/static/images/items/{photo}")

        return Response(success=True, message="deleted successfully")
    return Response(success=False, message='specify item id')


from difflib import SequenceMatcher


def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()


def search(query=None, cat=None):
    items = []
    total = 0
    DIRECT_MATCH = 500
    RATED_MATCH = 50
    COMPLETE_MATCH = 1000
    MID_DIFF_BORDER = 2
    print(f"search: {query}")
    if query is not None:
        match_map = {}
        simple_query = simplify(query)
        # print(f"query: {simple_query}")
        if simple_query == "":
            return Item.objects.all()

        for item in Item.objects.all():
            points = 0
            name = simplify(item.name)
            name_words = name.split()
            for name_word in name_words:
                # print(f"word: {name_word}")
                for query_word in simple_query.split():
                    if name_word in query_word or query_word in name_word:
                        # print(f"word in query, add {DIRECT_MATCH * len(name_word)}")
                        points += DIRECT_MATCH * len(name_word)
                        break
                    else:
                        rate = similar(query_word, name_word)
                        # print(f"item name word {name_word} similar to {query_word}: {rate}. add {rate * RATED_MATCH * len(name_word)}")
                        points += rate * RATED_MATCH * len(name_word)

            if simplify(query) in simplify(item.name):
                # print(f'complete match: add {COMPLETE_MATCH * len(query)}')
                points += COMPLETE_MATCH * len(query)
            # print(f"{item.name} fits {query} as {points}")
            points /= max(len(simple_query), 1)
            points = round(points)
            l = match_map.get(points) or []
            l.append(item)
            match_map[points] = l
        weights = sorted(match_map.keys(), reverse=True)
        mid = sum(weights) / len(weights)
        mid_diff = sum([abs(weights[i] - weights[i - 1]) for i in range(1, len(weights))]) / len(weights)
        good_weights = []

        for i in range(1, len(weights)):
            weight = weights[i - 1]

            next_weight = weights[i]
            if weight > mid:
                good_weights.append(weight)
            # elif weight > mid:
            #     good_weights.append(weights[i - 1])

        print(weights, "\n\n", mid, mid_diff)

        for weight in good_weights:
            print("good weight: ", weight)
            items.extend(match_map[weight])
    else:
        items = Item.objects.all().filter(category=cat)
    print(f"FOUND {len(items)} items")
    return items


def serialize_items(items=None, ids=None, session=None):
    if ids:
        items = Item.objects.filter(id__in=ids)

    return [serialize_item(item, session) for item in items]

def flatten_item_subcat(id, subcat_idx):
    item = Item.objects.get(id=id)
    subcat = item.subcats[subcat_idx]
    serialized = serialize_item(item=item)
    del serialized['subcats']
    serialized['param'] = subcat['param']
    serialized['price'] = subcat['price']
    serialized['subcat_id'] = subcat_idx
    return serialized


def serialize_item(item, id=None, subcat_idx=None, session=None):
    entry = {}
    if id is not None and subcat_idx is not None:
        return flatten_item_subcat(id, subcat_idx)

    entry["name"] = item.name
    entry["photo_paths"] = item.photo_paths

    subcats = item.subcats
    if session:
        for subcat in subcats:
            subcat['fav'] = False

        if session.get('fav-ids'):
            print(f" fav id data {session.get('fav-ids')}")
            favs = session.get('fav-ids') or {}
            for fav_idx in favs.get( str(item.id) ) or []:
                print("subcat: ", subcats[fav_idx])
                subcats[fav_idx]['fav'] = True
    entry["subcats"] = item.subcats
    entry["subcats"] = item.subcats

    entry["category"] = CATEGORIES.get(item.category)
    entry["description"] = item.description
    entry["condition"] = item.condition
    entry["id"] = item.id
    return entry


def serialize(cat=None, query=None, part=0, id=None, session=None, ids=None):
    ITEMS_PER_BATCH = 10

    if ids:
        items = Item.objects.filter(id__in=ids)
    elif id:
        items = [Item.objects.get(id=id)]
    else:
        items = search(cat=cat, query=query)

    max_parts = math.ceil(len(items) / ITEMS_PER_BATCH)
    part = items[part * ITEMS_PER_BATCH: (part + 1) * ITEMS_PER_BATCH]
    categorized = categorize_items(part)
    serialized = []
    for category, items in categorized:
        data = []
        for item in items:
            ser_item = serialize_item(item, session=session)
            data.append(ser_item)
        if len(data) > 0:
            serialized.append([category, data])
    return serialized, max_parts


def serialize_query(query=None, cat=None, id=None, p=0, user_session=None):
    items, parts = serialize(query=query, cat=cat, id=id, part=p, session=user_session)
    return Response(success=True, message='query success', payload={'items': items, 'parts': parts})


def save_order(item_id, username, message, ip):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    with open(f'{dir_path}/orders.txt', "r+") as f:
        f.read()
        f.write(f"====\n[{item_id}]\n{username} ({ip})\n{message}\n====")


def process_order(request):
    ip = get_client_ip(request)
    save_order(request.GET.get("item_id_to_order"), request.GET.get("username"), request.GET.get("message"), ip)
    return Response(success=True, message="order processed", payload={})


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_hints(q):
    items = []
    if q != "":
        items = search(query=q)
    names = []
    for item in items:
        names.append(item.name)
    return Response(success=True, message="", payload={"sug": names[:10]})


def api_view(request):
    if request.method == "POST" and request.user.is_superuser:

        if request.POST.get("id_to_del"):
            id_to_del = request.POST.get("id_to_del")
            Item.objects.all().filter(id=id_to_del).delete()
            return HttpResponse("delete items client side pls")  # serialize_query(request.POST.get("q") or "").wrap()

        if request.POST.get("filenames_to_delete"):
            return delete_photos(request).wrap()

        if request.POST.get("item_id_add_photo_for"):
            return add_photos(request).wrap()

        if request.POST.get("id_to_edit"):
            return edit_item(request).wrap()
        else:
            return add_item(request).wrap()

    if request.method == "POST":

        if request.POST.get("id_to_fav") is not None \
            and request.POST.get("fav") is not None\
                and request.POST.get("fav_idx") is not None:


            item_id = request.POST.get("id_to_fav")
            fav_idx = int(request.POST.get("fav_idx"))
            fav = request.POST.get("fav") == "1"
            print(f'user {fav} fav {item_id} subcat {fav_idx}')

            if request.session.get('fav-ids'):

                # item_id : [1, 2, 4]
                fav_user_data = request.session.get('fav-ids')
                print(f"favs before: {fav_user_data}")
                fav_indexes = fav_user_data.get(item_id) or []
                print(f'indexes of item: {fav_indexes}')
                if fav:
                    fav_indexes.append(fav_idx)
                else:
                    fav_indexes = [x for x in fav_user_data.get(item_id) or [] if x != fav_idx]
                print(f'indexes updated: {fav_indexes}')
                fav_user_data[item_id] = fav_indexes
                print(f'data updated: {fav_user_data}')
                request.session['fav-ids'] = fav_user_data
                print("1", request.session['fav-ids'])
            elif fav:

                data = {}
                data[item_id] = [fav_idx]
                print(data)
                request.session['fav-ids'] = data
            else:
                print("do nothing")
            print(request.session.get('fav-ids'))

    if request.method == "GET":
        if request.GET.get("item_id_to_order"):
            return process_order(request).wrap()

        if request.GET.get('pq') is not None:
            return get_hints(request.GET.get('pq')).wrap()

        if request.GET.get('get-favs'):
            fav_subcats_data = request.session.get('fav-ids')
            items = []
            if fav_subcats_data:
                for item_id in fav_subcats_data.keys():
                    for subcat_idx in fav_subcats_data[item_id]:
                        item = serialize_item(item=None, id=item_id, subcat_idx=subcat_idx)
                        items.append(item)
                return Response(success=True, message="fav items", payload={'items': items}).wrap()
            else:
                return Response(success=True, message="fav items", payload={'items': []}).wrap()

        query = request.GET.get("q")
        category = request.GET.get('cat')
        id = request.GET.get('id')
        part = request.GET.get('p')

        category = int(category) if category is not None and category.isdigit() else None
        id = int(id) if id is not None and id.isdigit() else None
        part = int(part) if part is not None and part.isdigit() else None

        if (query is not None or category is not None or id is not None) and part is not None:
            return serialize_query(query=query, cat=category, id=id, p=part, user_session=request.session).wrap()

        return Response(False, "bad request").wrap()
    return Response(False, "forbidden").wrap()


def item_page(request):
    item_id = request.get_full_path().split("/")[-1]
    item = None
    try:
        item_id = int(item_id)
        item = Item.objects.get(id=item_id)
    except:
        pass

    return render(request, f"{gtp(request)}/item_page.html", context={'render_mode': 'single_item',
                                                      'item': item,
                                                      "categories": json.dumps(CATEGORIES),
                                                      'json_item': json.dumps(serialize_item(item, request.session)),
                                                      "counted_categories": count_cats()})


def simplify(s):
    s = s.lower().replace(".", " "). \
        replace(",", " ").replace("/", " "). \
        replace("\\", " ").replace("-", " "). \
        replace("#", " ").replace("\"", " "). \
        replace("'", " ")
    while "  " in s:
        s = s.replace("  ", " ")
    return s


def load_from_xls(filename):
    import xlrd
    dir_path = os.path.dirname(os.path.realpath(__file__))
    print(f'{dir_path}/{filename}')
    book = xlrd.open_workbook(f'{dir_path}/{filename}')
    sheet = book.sheet_by_index(0)
    # name desc cond

    name_col = cat_col = 0
    price_col = 1
    amount_col = 2
    param_col = 3
    desc_col = 4
    cond_col = 5

    class Parser:

        def __init__(self):
            self.cur_cat = None
            self.name = None
            self.desc = None
            self.cond = None
            self.subcats = []

        def a(self):
            for y in range(sheet.nrows):

                if (sheet.cell_value(rowx=y, colx=price_col) == "") and sheet.cell_value(rowx=y,
                                                                                         colx=cat_col) is not None:
                    # print(f"[{y+1}] new cat: {sheet.cell_value(rowx=y, colx=0)}")
                    if sheet.cell_value(rowx=y, colx=0) == "end":
                        print("END REACHED")
                        return
                    self.cur_cat = int(sheet.cell_value(rowx=y, colx=0))

                elif sheet.cell_value(rowx=y, colx=name_col) and sheet.cell_value(rowx=y, colx=price_col) != "":
                    # this means that entry just started, collect subcats
                    # print(f"item done: {self.name} {self.subcats}")
                    # print(f"[{y+1}] start of new item: {sheet.cell_value(rowx=y, colx=name_col)} {sheet.cell_value(rowx=y, colx=price_col)}")
                    # yield prev data
                    if self.name:
                        yield self.name, self.desc, self.cond, self.cur_cat, self.subcats
                    self.subcats = [{'param': sheet.cell_value(rowx=y, colx=param_col),
                                     'price': sheet.cell_value(rowx=y, colx=price_col)}]
                    self.name = sheet.cell_value(rowx=y, colx=name_col)
                    self.desc = sheet.cell_value(rowx=y, colx=desc_col)
                    self.cond = sheet.cell_value(rowx=y, colx=cond_col)


                elif sheet.cell_value(rowx=y, colx=name_col) == "" and sheet.cell_value(rowx=y, colx=price_col) != "":
                    # we are collecting subcats
                    param = sheet.cell_value(rowx=y, colx=param_col)
                    price = sheet.cell_value(rowx=y, colx=price_col)
                    # print(f"[{y+1}] add subcat: {param} {price}")

                    self.subcats.append({"param": param, "price": price})

    bulk = []
    for name, desc, cond, cur_cat, subcats in Parser().a():
        print(name)
        bulk.append(Item(name=name, category=cur_cat, description=desc or None, condition=cond or None, subcats=subcats,
                         photo_paths=[]))

    Item.objects.bulk_create(bulk)
    print(bulk)
    print(f"Done, loaded {len(bulk)} objects")


# Item.objects.all().delete()
# load_from_xls('price.xls')

def favicon(request):
    return HttpResponse(open('/static/favicon.ico', 'rb').read(), content_type='image/x-icon')
