import json
import math
import os
import random
import sys
import uuid

from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.core.mail import send_mail, EmailMessage
from django.http import HttpResponse
from django.shortcuts import render, redirect

from dbutils.cleanup import deleteUnusedPhotos, deleteFailedReferences, fixNull
from dbutils.convert import convert_to_webp, convert_all, gen_minified
from main.ajax import Response
from main.models import Item, Order
from parse.xlsxParser import save, xlToJson, merge_photos

CATEGORIES = {
                0: "Мебель складная",
                1: "Автомобиль",
                2: "Кухонное оборудование",
                3: "Все для чая/кофе",
                4: "Сервировка стола",
                5: "Разное",
                6: "Расходные материалы",
                7: "Кулинарные книги",
              }


def get_cat_id(cat_):
    for cat_id, cat in zip(CATEGORIES.keys(), CATEGORIES.values()):
        if cat == cat_:
            return cat_id


def categorize_items(items, order_by_clicks=True):
    data = []

    for cat_id in CATEGORIES.keys():
        items_of_cat = []
        for item in items:
            if item.category == cat_id:
                items_of_cat.append(item)

        if len(items_of_cat) > 0:

            clicks = set([item.clicks for item in items_of_cat])
            sorted(clicks, reverse=True)
            sorted_by_clicks = []
            for click in clicks:
                for item in items_of_cat:
                    if item.clicks == click:
                        sorted_by_clicks.append(item)

            data.append( (CATEGORIES[cat_id], sorted_by_clicks) )

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


def serialize_items(items=None, categorized=None, session=None):

    if items is not None:
        items = items.order_by("-clicks")
        return [item.serialize(session) for item in items]

    if categorized is not None:
        return [[category, [item.serialize(session=session) for item in items]]
                for category, items in categorized if len(items) != 0]

    raise Exception("Nothing was passed to serialize function, probably a bug")


def get_items_page(cat=None, query=None, part=0, id=None, session=None, ids=None, order_by_weight=False):

    ITEMS_PER_BATCH = 10
    items = Item.find(cat=cat, query=query, id=id, ids=ids)

    if not order_by_weight:
        # order by clicks and category
        items = items.order_by("-clicks")

    max_parts = math.ceil(len(items) / ITEMS_PER_BATCH)

    part_of_items = items[part * ITEMS_PER_BATCH: (part + 1) * ITEMS_PER_BATCH]

    if order_by_weight:
        categorized = [["ordered", part_of_items]]
    else:
        categorized = categorize_items(part_of_items, order_by_clicks=True)

    return serialize_items(categorized=categorized, session=session), max_parts


def serialize_query(query=None, cat=None, id=None, p=0, user_session=None):
    print(f"search query: {query} | cat: {cat} | id: {id} | page: {p}\n keeps order: {bool(query)}")

    items, parts = get_items_page(query=query,
                                  cat=cat,
                                  id=id,
                                  part=p,
                                  session=user_session,
                                  order_by_weight=bool(query))

    return Response(success=True, message='query success', payload={'items': items, 'parts': parts})


def get_hints(q):
    items = []
    if q != "":
        items = Item.find(query=q)

    names = []
    for item in items:
        names.append(item.name)
    return Response(success=True, message="", payload={"sug": names[:10]})


def fetch(id=None, ids=None, query=None, category=None, max_data=None, sess=None):
    """Fetch max_data items. No idea what it does tbh"""
    items = []

    if id:
        items.append(Item.objects.get(id=id))
    if ids:
        items.extend([Item.objects.get(id=id) for id in ids])
    if query:
        items.append(Item.find(query=query))
    if category:
        items.append(Item.find(cat=category))

    ser = items[:max_data] if max_data != 0 else items

    return Response(success=True, message='fetch success', payload={'items': serialize_items(items=ser, session=sess)})


def validate_favs(request):
    """ Make sure user does not have any deleted ids in session's fav """
    data = dict(request.session.get('fav-ids') or {})

    for item_str_id in data.keys() or []:
        try:
            Item.objects.get(id=int(item_str_id))
        except:
            del request.session['fav-ids'][item_str_id]
            continue


def item_page(request):
    item_id = int(request.get_full_path().split("/")[-1])
    item = Item.find(id=item_id)

    if not item:
        return HttpResponse("<h1>Страница не найдена.</h1><button onclick='history.back();'>Назад</button>")
    item = item[0]

    item.add_click()

    return render(request, f"{gtp(request)}/item_page.html", context={'render_mode': 'single_item',
                                                      'item': item,
                                                      "categories": json.dumps(CATEGORIES),
                                                      'json_item': json.dumps(item.serialize(session=request.session)),
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




#gen_minified()
#convert_all()
#deleteFailedReferences()
#deleteUnusedPhotos()
#reloadData("E:/myFignya/programs/python/django-projects/Sellings/parse/exported.json")
#reloadData("E:/myFignya/programs/python/django-projects/Sellings/parse/merged.json")
#save()
#fixNull()
#deleteUnusedPhotos()
#deleteFailedReferences()
#xlToJson("E:/myFignya/programs/python/django-projects/Sellings/parse/full.xls")
#merge_photos("parse/parsed.json", "parse/exported.json")


def favicon(request):
    return HttpResponse(open(f'{os.getcwd()}/main/static/favicon.ico', 'rb').read(), content_type='image/x-icon')
