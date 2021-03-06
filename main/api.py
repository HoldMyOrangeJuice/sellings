import json
import os

from django.contrib.auth.middleware import AuthenticationMiddleware
from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponse

from Sellings import settings
from main.forms import *
from main.models import Item, Order, CustomUser
from main.views import serialize_query, get_cat_id
from utils.network.ajax import Response, Message
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
        method_name = url.split(instance.BASE_URL)[-1]
        method_name = method_name.split("?")[0]

        method = instance.__getattribute__(method_name)

        if method is None or not hasattr(method, "__call__"):
            raise NotImplementedError(f"Handler {method_name} not found")

        response = method(request)

        if isinstance(response, Response):
            return response.wrap()

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
            return Response(False, "no id specified")

        item = Item.objects.all().filter(id=form.item_id)

        if not item.exists():
            return Response(success=False,
                            message="item does not exist",
                            alert=True)

        item.delete()
        return Response(success=True, message="success")

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

        # save_photos will call .save() on item btw
        item.save_photos(request)

        return Response(True, "edit success", payload={"item": item.serialize()})

    @post
    def delete_photos(self, request):
        form = DeletePhotosForm(request.POST)

        if not form.is_valid():
            return Response(success=False,
                            message='invalid form',
                            alert=True)

        form_data = form.clean()
        item_id = form_data.get("item_id")
        photos = form_data.get("filenames")

        item = Item.objects.get(id=item_id)
        item.photo_paths = [x for x in item.photo_paths if x not in photos]
        item.save()

        for photo in photos:
            path = f"{settings.MEDIA_ROOT}images/items/{photo}"

            if not os.path.isfile(path):
                return Response(False,
                                message="File does not exist",
                                alert=True)
            os.remove(path)

        return Response(success=True,
                        message=f"успешно удалено {len(photos)} фото",
                        alert=True)

    @post
    def save_photos(self, request):

        form = SavePhotosForm(request.POST)
        if not form.is_valid():
            return Response(False,
                            "Фотографии не сохранены (invalid form)",
                            alert=True)

        form_data = form.cleaned_data
        item_id = form_data.get("item_id")
        photos = form_data.get("photos")

        item = Item.objects.get(id=item_id)
        file_names = item.save_photos(request)

        # send photo names to add client-side
        return Response(success=True,
                        message="photos added successfully",
                        payload={"filenames": file_names})


class UserApi(RequestDispatcher):
    BASE_URL = "api/user/"

    @get
    def make_query(self, request):

        form = FetchItemsForm(request.GET)

        if not form.is_valid():
            return Response(False,
                            Message("Ошибка",
                                    "Что-то пошло не так при загрузке предметов (1)"),
                            alert=True)

        form_data = form.cleaned_data
        query = form_data.get("query")
        category = form_data.get("category")
        item_id = form_data.get("item_id")
        part = form_data.get("part")
        part_size = form_data.get("part_size")

        if (query is None and category is None and item_id is None) or part is None:
            return Response(False,
                            Message("Ошибка",
                                    "Что-то пошло не так при загрузке предметов (2)"),
                            alert=True)

        return serialize_query(query=query,
                               cat=category,
                               id=item_id,
                               p=part,
                               part_size=part_size,
                               user_session=request.session).wrap()

    @get
    def get_favourite(self, request):
        user = CustomUser(request)
        favourite_items = user.get_favourite_json()
        return Response(success=True, payload={'items': favourite_items})

    @post
    def edit_favourite(self, request):
        user = CustomUser(request)
        form = EditFavouriteForm(request.POST)

        if not form.is_valid():
            return Response(False, form.errors)

        form_data = form.cleaned_data
        item_id = form_data.get('item_id')
        subcat_idx = form_data.get('subcat_idx')
        favourite = form_data.get('favourite') or False

        user.edit_favourite(item_id, subcat_idx, favourite)
        return Response(True)

    @post
    def order(self, request):
        ip = request.ip

        form = OrderForm(request.POST)
        if not form.is_valid():
            return Response(False, payload=form.errors)

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

        Order.objects.create(ip=ip, name=username,
                             message=message, item_id=item_id)

        return Response(success=True,
                        message=Message("Новый заказ", "Заказ успешно отправлен"),
                        alert=True)

    @get
    def get_hints(self, request):
        MAX_HINTS = 10

        form = GetHintsForm(request.GET)

        if not form.is_valid():
            return Response(False)

        q = form.cleaned_data.get("query")

        items = Item.find(query=q) if q != "" else []
        names = [item.name for item in items[:MAX_HINTS]]

        return Response(True, payload={"items": names})

    @get
    def error(self, request):
        data = request.GET.get("data")
        if data is None:
            return Response(False, "no data specified")

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

            return Response(True, "success")
        except PermissionError:
            return Response(True, "permission error")


def process_order(item_id, subcat_id, username, message, phone, ip):

    cfg = json.load(open(f"{settings.SETTINGS_JSON_PATH}"))
    item = Item.objects.all().filter(id=int(item_id))

    if not item.exists():
        email(
            cfg.get("admin_mail"),
            'Bug detected',
            f'{username} ordered bad id: wtf!'
            f'id was {item_id}'
            f'from IP {ip}'
            f'with message {message}')
        return False

    item = item[0]

    if subcat_id >= len(item.subcats):
        email(cfg.get("admin_mail"),
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


