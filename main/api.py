import json
import os
import types
import uuid
from django.core.mail import EmailMessage
from django.http import HttpResponse

from Sellings import settings
from Sellings.settings import SETTINGS_JSON_PATH
from main.forms import *

from utils.network.ajax import Response, Message
from main.models import Item, Order
from main.views import fetch, serialize_query, validate_favs, get_cat_id
from utils.network.mail import email

dir_path = os.path.dirname(os.path.realpath(__file__))


class RequestDispatcher:

    BASE_URL = None

    def __init__(self, **kwargs):

        for key in kwargs:
            self.__setattr__(key, kwargs.get(key))

    @classmethod
    def dispatch(cls, request):
        instance = cls(request=request)

        if instance.BASE_URL is None:
            raise NotImplementedError("BASE_URL must be overridden")

        url = request.build_absolute_uri()
        if instance.BASE_URL not in url:
            raise NotImplementedError(f"url {url} cant be handled by this handler ({RequestDispatcher.BASE_URL})")
        method = url.split(instance.BASE_URL)[-1]
        method = method.split("?")[0]

        clble = instance.__getattribute__(method)

        if clble is None or not hasattr(clble, "__call__"):
            raise NotImplementedError(f"Handler {method} not found")

        response = clble(request)

        if not isinstance(response, HttpResponse):
            raise ValueError("dispatch() didn't return HttpResponse")

        return response

    @classmethod
    def make_path(cls):
        escaped = cls.BASE_URL.replace("/", "\\/")
        return f'^{escaped}.*$'


def method_decorator(function, method):

    def test(self, request):
        if request.method != method:
            return HttpResponse(False, "bad request")
        return function(self, request)

    return test


def get(function):
    return method_decorator(function, method="GET")


def post(function):
    return method_decorator(function, method="POST")


class AdminApi(RequestDispatcher):
    BASE_URL = "api/admin/"

    @post
    def add_item(self, request):
        form = AddItemForm(request)

        if not form.is_valid():
            return Response(success=False, message="invalid form")

        subcats = form.subcats

        if not subcats:
            if not form.price or not form.amount or not form.param or not form.code:
                return Response(success=False, message='invalid form')

            subcats = [{"price": form.price,
                        "amount": form.amount,
                        "param": form.param,
                        "code": form.code}]

        file_names = Item.save_photos(request)

        if not file_names:
            return Response(success=False, message="invalid form")

        Item.objects.create(name=form.name,
                            subcats=subcats,
                            photo_paths=file_names,
                            category=form.category,
                            description=form.description,
                            condition=form.condition)

        return Response(success=True, message="added successfully")

    @post
    def delete_item(self, request):
        form = DeleteItemForm(request)

        if not form.is_valid():
            return Response(False, "no id specified").wrap()

        item = Item.objects.all().filter(id=form.item_id)

        if not item.exists():
            return Response(success=False,
                            message="item does not exist").wrap()

        item.delete()
        return Response(success=True, message="success").wrap()

    @post
    def update_item(self, request):
        form = EditItemForm(request)

        if not form.is_valid():
            return Response(False, "invalid form")

        item = Item.objects.filter(id=form.item_id)

        if not item.exists():
            return Response(False, "item does not exist")

        item = item[0]

        subcats = json.loads(form.subcats)

        item.name = form.name
        item.subcats = subcats
        item.description = form.description
        item.condition = form.condition
        item.category = get_cat_id(form.category)
        item.photo_paths = Item.save_photos(form.photo_paths)
        item.save()

        return Response(True, "edit success", payload={"item": item.serialize()})

    @post
    def delete_photos(self, request):
        item_id = request.POST.get("item_id")
        photos = json.loads(request.POST.get("filenames"))

        if item_id:
            item = Item.objects.get(id=item_id)
            item.photo_paths = [x for x in item.photo_paths if x not in photos]
            item.save()

            for photo in photos:
                path = f"{settings.MEDIA_ROOT}images/items/{photo}"
                if os.path.isfile(path):
                    os.remove(path)
                else:
                    return Response(False, message="File does not exist", alert=True).wrap()
            return Response(success=True, message="deleted successfully", alert=True).wrap()
        return Response(success=False, message='specify item id', alert=True).wrap()

    @post
    def save_photos(self, request):

        form = SavePhotosForm(request.POST)
        if not form.is_valid():
            return Response(False, "Invalid form", alert=True).wrap()

        form_data = form.cleaned_data
        item_id = form_data.get("item_id")

        filenames = Item.save_photos(request)

        item = Item.objects.get(id=item_id)
        item.photo_paths.extend(filenames)
        item.save()

        # send photo names to add client-side
        return Response(success=True,
                        message="photos added successfully",
                        payload={"filenames": filenames}).wrap()


class UserApi(RequestDispatcher):
    BASE_URL = "api/user/"

    @get
    def make_query(self, request):

        form = FetchItemsForm(request.GET)

        if not form.is_valid():
            return Response(False,
                            Message("Ошибка", "Что-то пошло не так при загрузке предметов"),
                            alert=True).wrap()

        form_data = form.cleaned_data
        query = form_data.get("query")
        category = form_data.get("category")
        item_id = form_data.get("item_id")
        part = form_data.get("part")
        part_size = form_data.get("part_size")

        if (query is None and category is None and item_id is None) or part is None:
            return Response(False, "invalid form").wrap()

        print(f"find items: {query} {item_id} {category}")
        return serialize_query(query=query,
                               cat=category,
                               id=item_id,
                               p=part,
                               part_size=part_size,
                               user_session=request.session).wrap()

    @get
    def get_favourite(self, request):
        validate_favs(request)
        valid_items = request.session.get('fav-ids') or {}
        items = []

        for item_id in valid_items.keys():
            item = Item.objects.get(id=int(item_id))
            items.extend([item.serialize(subcat_idx=subcat_idx) for subcat_idx in valid_items[item_id]])

        return Response(success=True, message="fav items", payload={'items': items}).wrap()

    @post
    def edit_favourite(self, request):

        form = EditFavouriteForm(request.POST)

        if not form.is_valid():
            return Response(False, form.errors).wrap()

        form_data = form.cleaned_data
        item_id = form_data.get('item_id')
        subcat_idx = form_data.get('subcat_idx')
        favourite = form_data.get('favourite') or False

        fav_user_data = request.session.get('fav-ids') or {}

        fav_indexes = fav_user_data.get(item_id) or []

        if favourite:
            fav_indexes.append(subcat_idx)
        else:
            fav_indexes = [x for x in
                           fav_user_data.get(item_id) or []
                           if x != subcat_idx]

        fav_user_data[item_id] = fav_indexes

        request.session['fav-ids'] = fav_user_data

        return Response(True, "").wrap()

    @post
    def order(self, request):
        ip = request.ip

        form = OrderForm(request.POST)
        if not form.is_valid():
            return Response(False, "form invalid", form.errors, alert=False).wrap()
        form_data = form.cleaned_data

        item_id = form_data.get("item_id")
        subcat_id = form_data.get("subcat_id")
        username = form_data.get("username")
        message = form_data.get("message")
        phone = form_data.get("phone")

        if not process_order(item_id, subcat_id, username, message, phone, ip):
            return Response(False,
                            message=Message("Ошибка", "Не получилось создать заказ"),
                            alert=True).wrap()

        Order.objects.create(ip=ip, name=username, message=message, item_id=item_id)

        return Response(success=True,
                        message=Message("Новый заказ", "Заказ успешно отправлен"),
                        alert=True).wrap()

    @get
    def get_hints(self, request):
        MAX_HINTS = 10
        form = GetHintsForm(request.GET)
        items = [i.name for i in Item.find(query=form.query)[:MAX_HINTS]]
        return Response(True, "success", {"items": items}).wrap()


def process_order(item_id, subcat_id, username, message, phone, ip):

    cfg = json.load(open(f"{SETTINGS_JSON_PATH}"))
    item = Item.objects.all().filter(id=int(item_id))

    if not item.exists():
        email(
            cfg.get("rcv_mail"),
            'Bug detected',
            f'{username} ordered bad id: wtf!'
            f'id was {item_id}'
            f'from IP {ip}'
            f'with message {message}')
        return False

    item = item[0]

    if subcat_id >= len(item.subcats):
        email(cfg.get("rcv_mail"),
              'Bug detected',
              f'{username} subcat not found: wtf!'
              f'id was {item_id}'
              f'subcat: {subcat_id}'
              f'from IP {ip}'
              f'with message {message}')
        return False

    subcat = item.subcats[subcat_id]

    email(cfg.get("rcv_mail"),
          'Новый Заказ',

          f'<h2>{username} заказал <span style="color: red">{item.name}</span> </h2>'
          f'<p>(<span style="font-weight: 600">{subcat.get("code")}</span>: {subcat.get("param") or "-"})<p>'
          f'<article style="font-size: 20px">{message}</article>'
          f'<p style="font-size:15px; font-weight: 600">тел. {phone}</p>'
          f'<div style="font-size: 10px; color:gray; font-family: Consolas, monaco, monospace;">[{ip}]</div>')
    return True


def handle_command(request):
    command = request.GET.get('comamnd')
    if command == 'get_orders':
        data = ""
        for order in Order.objects.all():
            data += f"[{order.ip}] {order.name} ordered item {order.item_id}:\n{order.message}\n"

        return HttpResponse(data)
    return HttpResponse("request not supported")


def handle_error(request):
    data = request.GET.get("data")
    if data is None:
        return Response(False, "no data specified").wrap()

    ip = request.ip

    from datetime import datetime

    today = datetime.now()
    day = today.strftime("%b-%d-%Y")
    f_time = today.strftime("%B %d, %Y %H:%M:%S")

    log_folder = "js-logs"
    log_name = f"js-error-log-{day}.txt"

    try:

        if not os.path.exists(f"{os.getcwd()}/{log_folder}/{log_name}"):
            if not os.path.exists(log_folder):
                os.mkdir(log_folder)

            open(f"{os.getcwd()}/{log_folder}/{log_name}", "w").close()

        with open(f"{os.getcwd()}/{log_folder}/{log_name}", "r+") as f:
            f.read()
            f.write(f"[{f_time}] JS threw an error at client [{ip}]:\n{data}\n")

        return Response(True, "success").wrap()
    except PermissionError as e:
        return Response(True, "permission error").wrap()


def reloadData(jsonFile):

    def getCat(cats, name):
        if isinstance(name, int) or name.isdigit():
            return int(name)

        print(f"get cat: {cats} {name}")
        for id_ in cats.keys():
            if cats[id_] == name:
                print(f"id is: {id_}")
                return int(id_)
        print("no id")
        return -1

    print(f"open {jsonFile}")
    file = open(jsonFile, "r", encoding="utf-8")

    parsed = json.load(file)
    file.close()

    if isinstance(parsed, dict):
        cats = parsed.get("usedCats")
        items = parsed.get("data")
    else:
        cats = None
        items = parsed

    bulk = [Item(name=x['name'],
                 category=int(getCat(cats, x['category'])),
                 photo_paths=x['photos'],
                 description=x['description'],
                 condition=x['condition'],
                 subcats=x['subcats']) for x in items]

    Item.objects.all().delete()
    Item.objects.bulk_create(bulk)
    print(f"Items loaded, added {len(bulk)} entries.")

