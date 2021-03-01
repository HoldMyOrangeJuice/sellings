import os

from PIL import Image

from main.models import Item


def convert_to_webp(path, f_filename):

    format = None
    filename = f_filename

    if len(f_filename.split(".")) > 1:
        filename = ".".join(f_filename.split(".")[:-1])
        format = f_filename.split(".")[-1]

    img = Image.open(f"{path}/{f_filename}").convert("RGB")

    if img.format == "webp":
        return path

    # remove original file
    os.remove(f"{path}/{f_filename}")

    # save converted
    img.save(f"{path}/{filename}.webp", "webp")

    return filename + ".webp"


def convert_all():
    for item in Item.objects.all():
        print(f"converting {item.name} ({len(item.photo_paths)} photos)")
        paths = []
        for photo in item.photo_paths:
            if os.path.isfile(f"{os.getcwd()}/main/static/images/items/{photo}"):
                paths.append(convert_to_webp(f"{os.getcwd()}/main/static/images/items", photo))
            else:
                print(f"file {photo} is missing")
        print(f"new paths: {paths}")
        item.photo_paths = paths
        item.save()
        print(f"item saved. new paths: {item.photo_paths}\n")


def gen_minified():
    size = 200
    images_path = f"{os.getcwd()}/main/static/images/items"
    images_min_path = f"{os.getcwd()}/main/static/images/min"
    for photo in os.listdir(images_path):
        img = Image.open(f"{images_path}/{photo}")
        width, height = img.size
        percent = (size / float(min(width, height)))
        img = img.resize((int(width * percent), int(height * percent)), Image.ANTIALIAS)
        img.save(f"{images_min_path}/{photo}")
        print(f"{photo} minified")