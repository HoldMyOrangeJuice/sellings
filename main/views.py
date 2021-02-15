import json
import math
import os
import random
import sys
import uuid

from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponse
from django.shortcuts import render, redirect

from main.ajax import Response
from main.models import Item, Order

CATEGORIES = {
                0: "Мебель складная",
                1: "Автомобиль",
                2: "Кухонное оборудование",
                3: "Все для чая/кофе",
                4: "Сервировка стола",
                5: "Разное",
                6: "Расходные материалы",
                7: "Кулинарные книги"
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


def mobile(request):
    import re
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
    formdata = AttrsSet(request.POST, "id_to_edit", "name", "description", "condition", "photo", "category", "subcats")
    item = Item.objects.get(id=formdata.id_to_edit)
    subcats = json.loads(formdata.subcats)

    # if len(subcats) == 0:
    #     item.delete()
    #     return Response(True, "item deleted", payload={"item": {}})

    item.name = formdata.name
    item.subcats = subcats
    item.description = formdata.description
    item.condition = formdata.condition
    item.category = get_cat_id(formdata.category)
    item.photo_paths = save_photos(request)
    item.save()

    return Response(True, "edit success", payload={"item" : serialize_item(item=item)})


def add_item(request):
    dir_path = os.path.dirname(os.path.realpath(__file__))

    name = request.POST.get("name")
    subcats = request.POST.get("subcats")
    if not subcats:
        if not request.POST.get("price") or not request.POST.get("amount") or not request.POST.get("param"):
            return Response(success=False, message='invalid form')

        subcats = [{"price": request.POST.get("price"),
                    "amount": request.POST.get("amount"),
                    "param": request.POST.get("param"),
                    "code": request.POST.get("code")}]

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
    COMPLETE_MATCH = 5000
    MID_DIFF_BORDER = 2
    LENGTH_IMPACT = 1
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
                        points += DIRECT_MATCH * len(name_word)*LENGTH_IMPACT
                        break
                    else:
                        rate = similar(query_word, name_word)
                        # print(f"item name word {name_word} similar to {query_word}: {rate}. add {rate * RATED_MATCH * len(name_word)}")
                        points += rate * RATED_MATCH * len(name_word)*LENGTH_IMPACT

            if simplify(query) in simplify(item.name):
                print(f'complete match: {query } in {item.name} add {COMPLETE_MATCH * len(query)}')
                points += COMPLETE_MATCH * len(query)*LENGTH_IMPACT
            # print(f"{item.name} fits {query} as {points}")

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
    serialized['code'] = subcat.get('code')
    serialized['subcat_id'] = subcat_idx
    return serialized


def serialize_item(item, id=None, subcat_idx=None, session=None):
    entry = {}
    if id is not None and subcat_idx is not None:
        return flatten_item_subcat(id, subcat_idx)

    entry["name"] = item.name
    entry["photo_paths"] = item.photo_paths
    entry["description"] = item.description
    entry["condition"] = item.condition
    entry["id"] = item.id
    entry["category"] = CATEGORIES.get(item.category)

    subcats = item.subcats
    if session:
        for subcat in subcats:
            subcat['fav'] = False

        if session.get('fav-ids'):
            favs = session.get('fav-ids') or {}
            for fav_idx in favs.get( str(item.id) ) or []:
                subcats[fav_idx]['fav'] = True

    entry["subcats"] = item.subcats

    return entry


def serialize(cat=None, query=None, part=0, id=None, session=None, ids=None, keep_order=False):
    ITEMS_PER_BATCH = 10

    if ids:
        items = Item.objects.filter(id__in=ids)
    elif id:
        items = [Item.objects.get(id=id)]
    else:
        items = search(cat=cat, query=query)

    max_parts = math.ceil(len(items) / ITEMS_PER_BATCH)
    part_of_items = items[part * ITEMS_PER_BATCH: (part + 1) * ITEMS_PER_BATCH]

    if keep_order:
        categorized = [["ordered", part_of_items]]
    else:
        categorized = categorize_items(part_of_items)

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
    items, parts = serialize(query=query, cat=cat, id=id, part=p, session=user_session, keep_order=query is not None)
    return Response(success=True, message='query success', payload={'items': items, 'parts': parts})


def save_order(item_id, username, message, ip):
    if item_id and username and message:
        Order.objects.create(ip=ip, name=username, message=message, item_id=int(item_id))


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


def fetch(id=None, ids=None, query=None, category=None, max_data=None, sess=None):
    items = []

    if id:
        items.append(Item.objects.get(id=id))
    if ids:
        items.extend([Item.objects.get(id=id) for id in ids])
    if query:
        items.append( search(query=query) )
    if category:
        items.append(search(cat=category))
    print(items)
    ser = items[:max_data] if max_data != 0 else items

    return Response(success=True, message='fetch success', payload={'items': serialize_items(items=ser, session=sess)})


def api_view(request):
    if request.method == "POST" and request.user.is_superuser:

        if request.POST.get("id_to_del"):
            id_to_del = request.POST.get("id_to_del")
            Item.objects.all().filter(id=id_to_del).delete()
            return Response(success=True, message="success", payload={}).wrap()

        if request.POST.get("filenames_to_delete"):
            return delete_photos(request).wrap()

        if request.POST.get("item_id_add_photo_for"):
            return add_photos(request).wrap()

        if request.POST.get("id_to_edit"):
            return edit_item(request).wrap()
        else:
            return add_item(request).wrap()

    if request.method == "POST":
        print(request.POST)
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
        if request.GET.get('api_key') and request.GET.get('api_key') == "leet":
            command = request.GET.get('comamnd')
            if command == 'get_orders':
                data=""
                for order in Order.objects.all():
                    data += f"[{order.ip}] {order.name} ordered item {order.item_id}:\n{order.message}\n"

                return HttpResponse(data)
            return HttpResponse("request not supported")


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

        if request.GET.get('max_data'):
            max_data = int(request.GET.get('max_data'))
            id = request.GET.get('id')
            # should stringify
            ids = request.GET.get('ids')
            query = request.GET.get('query')
            category = request.GET.get('category')
            return fetch(id=id, ids=ids, query=query, category=category, max_data=max_data, sess=request.session).wrap()

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


def reloadData(jsonFile):
    Item.objects.all().delete()
    def getCat(cats, name):
        for id_ in cats.keys():
            if cats[id_] == name:
                return int(id_)
        return -1
    import codecs
    f = codecs.open(jsonFile, "r", "utf_8_sig")
    data = f.read()
    parsed = json.loads(data)
    f.close()
    cats = parsed.get("usedCats")

    bulk = [Item(name=x['name'],
                 category=int(getCat(cats, x['category'])),
                 photo_paths=x['photos'],
                 description=x['description'],
                 condition=x['condition'],
                 subcats=x['subcats']) for x in parsed.get("data")]

    Item.objects.bulk_create(bulk)
    print(f"Items loaded, added {len(bulk)} entries.")

#reloadData("E:/myFignya/programs/python/django-projects/Sellings/parse/parsed.json")

def favicon(request):
    return HttpResponse(open(f'{os.getcwd()}/main/static/favicon.ico', 'rb').read(), content_type='image/x-icon')
