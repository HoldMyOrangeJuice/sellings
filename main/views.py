import json
import math
import os

from django.conf import settings
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponse
from django.shortcuts import render, redirect

import Sellings.settings as django_settings
from Sellings.settings import STATIC_ROOT
from main.forms import InitialPageDataForm
from utils.network.ajax import Response
from main.models import Item


class SiteSettings:
    settings = django_settings

    title = django_settings.title
    text_title = django_settings.text_title
    text_main = django_settings.text_main
    version = django_settings.version

    MEDIA_URL = settings.MEDIA_URL
    STATIC_URL = settings.STATIC_URL


def render_with_settings(**kwargs):
    context = kwargs.get("context") or {}
    context['settings'] = SiteSettings
    kwargs['context'] = context
    return render(**kwargs)


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
    """ returns set of (category, entry count) """
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
    return "mobile" if request.mobile else "desktop"


def price_page(request):
    form = InitialPageDataForm(request.GET)
    query = cat_id = None

    if form.is_valid():
        form_data = form.cleaned_data

        query = form_data.get('q')
        cat_id = form_data.get('cat')

    if not query and not cat_id:
        query = ""

    return render_with_settings(request=request,
                                template_name=f"{gtp(request)}/price_template.html",
                                context={"admin": request.user.is_superuser,
                                         "categories": CATEGORIES,
                                         "counted_categories": count_cats(),
                                         'render_mode': 'price_list',
                                         'query': query,
                                         'cat_id': cat_id})


def item_page(request):
    item_id = int(request.get_full_path().split("/")[-1])
    item = Item.find(id=item_id)

    if not item:
        return HttpResponse("<h1>Страница не найдена.</h1><button onclick='history.back();'>Назад</button>")

    item = item[0]
    item.add_click()
    print(item.photo_paths)
    return render_with_settings(request=request,
                                template_name=f'{gtp(request)}/item_page.html',
                                context={'render_mode': 'single_item',
                                         'item': item,
                                         'categories': CATEGORIES,
                                         'photo': item.photo_paths[0] if item.photo_paths else "placeholder",
                                         'counted_categories': count_cats()})


def login_view(request):
    form = AuthenticationForm(data=request.POST)

    if not form.is_valid():

        return render_with_settings(request=request,
                                    template_name="login.html",
                                    context={"form": form})

    data = form.cleaned_data
    u = data.get("username")
    p = data.get("password")

    user = authenticate(username=u, password=p)

    if user:
        login(request, user)

    if request.user.is_anonymous:
        return render_with_settings(request=request,
                                    template_name="login.html",
                                    context={"form": AuthenticationForm()})

    else:
        return redirect(settings.LOGIN_REDIRECT_URL)


def make_sublist_of_categorized(categorized_items, start, limit):
    """ this method is used to create sublist of categorized query response
    it is required in order to keep everything in correct sequence, since it is possible for item to be loaded in it's
    category on page that already was scrolled otherwise, this way it will be impossible to see that item. """
    result = []

    index = 0
    for category, items in categorized_items:
        part = []

        if index + len(items) >= start:

            local_index = max(0, start - index)
            index += local_index

            while index-start < limit and local_index < len(items):
                part.append(items[local_index])
                local_index += 1
                index += 1

        else:
            index += len(items)

        result.append([category, part])
        if index-start == limit:
            break

    return result


def get_items_page(cat=None, query=None, id=None, ids=None,
                   part_size=None, part=0,
                   session=None,
                   order_by_weight=False):

    items = Item.find(cat=cat, query=query, id=id, ids=ids)

    if not order_by_weight:
        # order by clicks and category
        items = items.order_by("clicks")

    max_parts = math.ceil(len(items) / part_size)

    if order_by_weight:
        items_part = items[part * part_size: (part + 1) * part_size]
        categorized_part = [["ordered", items_part]]
    else:
        categorized = categorize_items(items, order_by_clicks=True)
        categorized_part = make_sublist_of_categorized(categorized,
                                                       start=part * part_size,
                                                       limit=part_size)

    return Item.serialize_items(categorized=categorized_part, session=session), max_parts, len(items)


def serialize_query(query=None, cat=None, id=None,
                    p=0, part_size=10,
                    user_session=None):

    items, parts, total = get_items_page(query=query,
                                         cat=cat,
                                         id=id,
                                         part=p,
                                         session=user_session,
                                         part_size=part_size,
                                         order_by_weight=bool(query))

    return Response(success=True,
                    message='query success',
                    payload={'items': items,
                             'parts': parts,
                             'total': total})


def simplify(s):
    s = s.lower().replace(".", " "). \
        replace(",", " ").replace("/", " "). \
        replace("\\", " ").replace("-", " "). \
        replace("#", " ").replace("\"", " "). \
        replace("\'", " ")
    while "  " in s:
        s = s.replace("  ", " ")
    return s


def favicon(request):
    file = open(f'{STATIC_ROOT}/favicon.ico', 'rb').read()
    return HttpResponse(file, content_type='image/x-icon')
