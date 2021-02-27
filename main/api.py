import json
import os
import uuid
from datetime import time, date
from email.message import EmailMessage

from django.http import HttpResponse

from dbutils.convert import convert_to_webp
from main.ajax import Response
from main.models import Item, Order
from main.views import fetch, serialize_query, get_hints, validate_favs, get_cat_id


class AttrsSet:
    def __init__(self, obj, *attrs):
        for attr in attrs:
            self.__setattr__(attr, obj.get(attr))


def save_photos(request):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    filenames = []

    for photo in request.FILES.getlist('photo'):
        filename = str(uuid.uuid1())
        with open(f"{dir_path}/static/images/items/{filename}", "wb") as f:
            f.write(photo.read())

        filename = convert_to_webp(f"{dir_path}/static/images/items", filename)
        filenames.append(filename)

    return filenames


def edit_item(request):
    formdata = AttrsSet(request.POST, "id_to_edit", "name", "description", "condition", "photo", "category", "subcats")
    item = Item.objects.get(id=formdata.id_to_edit)
    subcats = json.loads(formdata.subcats)

    item.name = formdata.name
    item.subcats = subcats
    item.description = formdata.description
    item.condition = formdata.condition
    item.category = get_cat_id(formdata.category)
    item.photo_paths = save_photos(request)
    item.save()

    return Response(True, "edit success", payload={"item": item.serialize()})


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


def email(receivers, subject, message):

    email = EmailMessage(
        subject, message, to=receivers
    )
    email.content_subtype = "html"
    email.send()


def save_order(item_id, subcat_id, username, message, phone, ip):
    cwd = os.getcwd()
    print(f"{cwd}/settings.json")
    cfg = json.load(open(f"{cwd}/main/settings.json"))

    item = Item.objects.all().get(id=int(item_id))

    if item is None:
        email(cfg.get("rcv_mail"),
              'Bug detected',
              f'{username} ordered bad id: wtf!\nid was {item_id}\n from IP {ip}\nwith message {message}')
        return

    if int(subcat_id) >= len(item.subcats):
        email(cfg.get("rcv_mail"),
              'Bug detected',
              f'{username} subcat not found: wtf!\nid was {item_id}\nsubcat: {subcat_id}\nfrom IP {ip}\nwith message {message}')
        return

    subcat = item.subcats[int(subcat_id)]

    email(cfg.get("rcv_mail"),
          'Новый Заказ',

          f'<h2>{username} заказал <span style="color: red">{item.name}</span> </h2>'
          f'<p>(<span style="font-weight: 600">{subcat.get("code")}</span>: {subcat.get("param") or "-"})<p>'
          f'<article style="font-size: 20px">{message}</article>'
          f'<p style="font-size:15px; font-weight: 600">тел. {phone}</p>'
          f'<div style="font-size: 10px; color:gray; font-family: Consolas, monaco, monospace;">[{ip}]</div>')

    # "vfo@ukr.net", "pelicanzp@gmail.com",

    if item_id and username and message:
        Order.objects.create(ip=ip, name=username, message=message, item_id=int(item_id))


def process_order(request):
    ip = get_client_ip(request)

    save_order(request.GET.get("item_id_to_order"), request.GET.get("subcat_id_to_order"),
               request.GET.get("username"),
               request.GET.get("message"),
               request.GET.get("phone"),
               ip)
    return Response(success=True, message="order processed", payload={})


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def admin_post(request):
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


def user_post(request):
    if request.POST.get("id_to_fav") is not None \
            and request.POST.get("fav") is not None \
            and request.POST.get("fav_idx") is not None:

        item_id = request.POST.get("id_to_fav")
        fav_idx = int(request.POST.get("fav_idx"))
        fav = request.POST.get("fav") == "1"
        print(f'user {fav} fav {item_id} subcat {fav_idx}')

        if request.session.get('fav-ids'):

            # item_id : [1, 2, 4]
            fav_user_data = request.session.get('fav-ids')
            fav_indexes = fav_user_data.get(item_id) or []
            if fav:
                fav_indexes.append(fav_idx)
            else:
                fav_indexes = [x for x in fav_user_data.get(item_id) or [] if x != fav_idx]
            fav_user_data[item_id] = fav_indexes
            request.session['fav-ids'] = fav_user_data
        elif fav:

            data = dict()
            data[item_id] = [fav_idx]
            request.session['fav-ids'] = data

    return Response(True, {}).wrap()


def handle_command(request):
    command = request.GET.get('comamnd')
    if command == 'get_orders':
        data = ""
        for order in Order.objects.all():
            data += f"[{order.ip}] {order.name} ordered item {order.item_id}:\n{order.message}\n"

        return HttpResponse(data)
    return HttpResponse("request not supported")


def handle_query(request):
    query = request.GET.get("q")
    category = request.GET.get('cat')
    id = request.GET.get('id')
    part = request.GET.get('p')

    category = int(category) if category is not None and category.isdigit() else None
    id = int(id) if id is not None and id.isdigit() else None
    part = int(part) if part is not None and part.isdigit() else None

    if (query is not None or category is not None or id is not None) and part is not None:
        return serialize_query(query=query, cat=category, id=id, p=part, user_session=request.session).wrap()


def any_get(request):
    if request.GET.get('api_key') and request.GET.get('api_key') == "leet":
        return handle_command(request)

    if request.GET.get("item_id_to_order"):
        return process_order(request).wrap()

    if request.GET.get('pq') is not None:
        return get_hints(request.GET.get('pq')).wrap()

    if request.GET.get('get-favs'):
        validate_favs(request)
        fav_subcats_data = request.session.get('fav-ids')
        items = []

        if fav_subcats_data:

            for item_id in fav_subcats_data.keys():
                item = Item.find(id=int(item_id))[0]
                items.extend([item.serialize(subcat_idx=subcat_idx) for subcat_idx in fav_subcats_data[item_id]])

            return Response(success=True, message="fav items", payload={'items': items}).wrap()
        else:
            return Response(success=True, message="fav items", payload={'items': []}).wrap()

    #  no idea what it does
    if request.GET.get('max_data'):
        max_data = int(request.GET.get('max_data'))
        id = request.GET.get('id')
        # should stringify
        ids = request.GET.get('ids')
        query = request.GET.get('query')
        category = request.GET.get('category')
        return fetch(id=id, ids=ids, query=query, category=category, max_data=max_data, sess=request.session).wrap()

    # handle search requests
    if request.GET.get("q") is not None or request.GET.get('cat') is not None or request.GET.get('id') is not None:
        return handle_query(request)

    return Response(False, "bad request").wrap()


def handle_error(request):
    data = request.GET.get("data")
    if data is None:
        return HttpResponse("error")

    ip = get_client_ip(request)

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

        return HttpResponse("success")
    except PermissionError as e:
        print(e)
        return HttpResponse("error")


def api_view(request):
    if request.method == "POST":
        if request.user.is_superuser:
            return admin_post(request)
        return user_post(request)

    if request.method == "GET":
        return any_get(request)

    return Response(False, "forbidden").wrap()


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

