import os

from main.models import Item


def fixNull():
    for item in Item.objects.all():
        if item.description == "null":
            item.description = None
        if item.condition == "null":
            item.condition = None
        if isinstance(item.photo_paths, dict):
            item.photo_paths = []

        subcats = item.subcats

        for cat in subcats:
            if cat['param']:
                if "O" in cat['param']:
                    print(f"replace in {cat['param']}")
                    cat['param'].replace("O", "Ø")
            if cat['code'] == "null":
                cat['price'] = None

            if cat['code'] == "null":
                cat['code'] = None

            if cat['amount'] == "null":
                cat['amount'] = None

            if cat['param'] == "null":
                cat['param'] = "-"

        item.subcats = subcats

        item.save()

def deleteFailedReferences():
    all_photos = os.listdir(path=f"{os.getcwd()}/main/static/images/items")
    for item in Item.objects.all():
        paths = item.photo_paths
        for path in paths.copy():
            if path not in all_photos:
                print(f"delete photo {path} of {item.name}")
                paths.remove(path)
        item.paths = paths
        item.save()

def deleteUnusedPhotos():
    for photo in os.listdir(path=f"{os.getcwd()}/main/static/images/items"):
        used = False
        for item in Item.objects.all():
            if photo in item.photo_paths:
                used = True
                break

        if not used:
            print(f"deleted {photo}")
            os.remove(f"{os.getcwd()}/main/static/images/items/{photo}")