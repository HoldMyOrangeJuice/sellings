import json

import xlrd

from main.models import Item


def val(sheet, x, y):
    return sheet.cell_value(rowx=y, colx=x)

def genSub(param, code, amount, price):
    return {'param': param or None,
     'code': code or None,
     'amount': amount or None,
     'price': price or None}

def parse(sheet):
    cat = None
    cats = {}
    current = 0
    item = {}
    items = []
    for y in range(1, sheet.nrows):

        code = val(sheet, 0, y)
        name = val(sheet, 1, y)
        price = val(sheet, 2, y)
        amount = val(sheet, 3, y)
        param = val(sheet, 4, y)
        desc = val(sheet, 5, y)
        cond = val(sheet, 6, y)
        photos = val(sheet, 7, y)

        if code == "" and name != "":
            cat = name

            cats[current] = cat
            current += 1
            continue

        elif name != "":

            # skip first
            if item.get('name'):
                items.append(item)
                print(f"skip empty [{y}]")

            if name == "":
                print(f"[{y}] not valid item")
                item = {}
                continue

            item = {'name': name,
                    "description": desc or None,
                    "condition": cond or None,
                    "photos": [x + ".jpg" for x in photos.split(", ") if x],
                    "category": cat,
                    "subcats": [genSub(param, code, amount, price)]
                    }

        elif param != "":
            subcats = item.get('subcats')

            subcats.append(genSub(param, code, amount, price))

            item['subcats'] = subcats

    return items, cats


def xlToJson(file):

    book = xlrd.open_workbook(f'{file}', encoding_override="cp1252")
    sheet = book.sheet_by_index(0)
    parsed, cats = parse(sheet)
    result = {'data': parsed, 'usedCats': cats}

    with open("parsed.json", "w", encoding="utf-8") as f:
        json.dump(obj=result, fp=f, indent=4, ensure_ascii=False)

    print(f"saved {len(parsed)} items to parsed.json")


def save():
    data = []
    for obj in Item.objects.all():
        item = {'name': obj.name,
                'description': obj.description,
                'photos': obj.photo_paths,
                'condition': obj.condition,
                'subcats': obj.subcats,
                'category': obj.category}

        data.append(item)

    with open("exported.json", "w", encoding="utf8") as f:
        f.write(json.dumps(data, indent=4, ensure_ascii=False))


def merge_photos(source, dest):
    data = open(source, "r", encoding='utf-8').read()
    source = json.loads(data).get("data")  # dict
    dest = json.load(open(dest, "r", encoding='utf-8'))  # list

    def get_item(items, name):
        for item in items:
            if item['name'] == name:
                return item

    for item in dest:
        if not item.get('photos'):
            parsed_src_item = get_item(source, item['name'])
            new_photos = parsed_src_item.get("photos") or []
            print(f"added photos for {item.get('name')} from {parsed_src_item['name']} new photos: {new_photos}\n\n")
            item['photos'] = new_photos

    file = open("/utils/parse/merged.json", "w", encoding="utf-8")
    # print(str(dest).encode("utf-8"))
    # file.write(str(dest).encode("utf-8"))
    # file.close()
    json.dump(dest, file, indent=4, ensure_ascii=False)

