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