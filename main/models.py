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


class Order(models.Model):
    ip = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    message = models.TextField()
    item_id = models.IntegerField()






