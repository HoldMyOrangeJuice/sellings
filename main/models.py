import jsonfield
from django.db import models


class Item(models.Model):
    name = models.CharField(max_length=100)
    category = models.IntegerField()
    # [filename, filename]
    photo_paths = jsonfield.JSONField(default=[])
    description = models.TextField(blank=True, null=True)
    condition = models.TextField(blank=True, null=True)
    #[{price, amount, param}]
    subcats = jsonfield.JSONField(default=[])
    clicks = models.IntegerField()

    def add_click(self):
        self.clicks += 1
        self.save()

    def flatten_subcat(self, subcat_idx):

        subcat = self.subcats[subcat_idx]
        serialized = self.serialize()
        del serialized['subcats']
        serialized['param'] = subcat['param']
        serialized['price'] = subcat['price']
        serialized['code'] = subcat.get('code')
        serialized['subcat_id'] = subcat_idx
        return serialized

    def serialize(self, subcat_idx=None, session=None):
        from main.views import CATEGORIES
        entry = {}

        if subcat_idx is not None:
            return self.flatten_subcat(subcat_idx)

        entry["name"] = self.name
        entry["photo_paths"] = self.photo_paths
        entry["description"] = self.description
        entry["condition"] = self.condition
        entry["id"] = self.id
        entry["category"] = CATEGORIES.get(self.category)

        subcats = self.subcats
        if session:
            for subcat in subcats:
                subcat['fav'] = False

            if session.get('fav-ids'):
                favs = session.get('fav-ids') or {}
                for fav_idx in favs.get(str(self.id)) or []:
                    subcats[fav_idx]['fav'] = True

        entry["subcats"] = self.subcats

        return entry

    @staticmethod
    def find(query=None, cat=None, id=None, ids=None):

        from difflib import SequenceMatcher

        def similar(a, b):
            return SequenceMatcher(None, a, b).ratio()

        if id is not None:
            item = Item.objects.filter(id=id)
            if item.exists():
                return item
            return None

        if ids is not None:
            items = Item.objects.filter(id__in=ids).order_by('-clicks')
            if items.exists():
                return items
            return None

        if cat is not None:

            if isinstance(cat, int):
                items = Item.objects.all().filter(category=cat)
            else:
                from main.views import get_cat_id
                items = Item.objects.all().filter(category=get_cat_id(cat))

            if items.exists():
                return items
            return None

        items = []
        total = 0

        # points per letter matched
        WORD_MATCH = 50

        # points per word matched
        RATED_MATCH = 50
        COMPLETE_MATCH = 1000
        MID_DIFF_BORDER = 2

        print(f"search: {query}")
        if query is not None:
            match_map = {}
            from main.views import simplify
            simple_query = simplify(query)

            if simple_query == "":
                return Item.objects.all()

            # check every item
            for item in Item.objects.all():

                points = 0
                name = simplify(item.name)
                name_words = name.split()
                query_words = simple_query.split()

                # check for matches in query
                if simplify(query) in simplify(item.name):

                    points += COMPLETE_MATCH * len(query)
                else:
                    # compare every name word to query word
                    for name_word in name_words:
                        for query_word in query_words:

                            rate = similar(query_word, name_word)
                            if rate < 0.5:
                                continue

                            points += (rate * RATED_MATCH)

                            if name_word in query_word or query_word in name_word:
                                points += WORD_MATCH * min(len(name_word), len(query_word))

                # save item with weight
                points = round(points)
                l = match_map.get(points) or []
                l.append(item)
                match_map[points] = l

            # all weights
            weights = match_map.keys()
            mid = sum(weights) / len(weights)
            good_weights = sorted(weights, reverse=True)

            for weight in good_weights:
                if weight < mid:
                    break

                items.extend(match_map[weight])
        else:
            items = Item.objects.all().filter(category=cat)

        return items


class Order(models.Model):
    ip = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    message = models.TextField()
    item_id = models.IntegerField()






