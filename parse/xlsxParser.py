import json

import xlrd


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

        if name == "" and param != "":

            subcats = item.get('subcats')

            subcats.append(genSub(param, code, amount, price))

            item['subcats'] = subcats
        else:
            if item.get('name'):
                items.append(item)
            else:
                print(f"[{y}] skip addition of item: {item}")
            if name == "":
                print(f"[{y}] not valid item")
                continue

            item = {'name': name,
                    "description": desc or None,
                    "condition": cond or None,
                    "photos": [x + ".jpg" for x in photos.split(", ") if x],
                    "category": cat,
                    "subcats": [genSub(param, code, amount, price)]
                    }

    return items, cats


file = input("filename >>> ")
book = xlrd.open_workbook(f'{file}', encoding_override="cp1252")
sheet = book.sheet_by_index(0)
parsed, cats = parse(sheet)
result = {'data': parsed, 'usedCats': cats}

with open("parsed.json", "w", encoding="utf8") as f:
    json.dump(obj=result, fp=f, indent=4, ensure_ascii=False)
