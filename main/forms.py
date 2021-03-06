from django import forms


# POST
from django.contrib.auth.forms import AuthenticationForm
from django.forms import TextInput


class EditItemForm(forms.Form):
    item_id = forms.IntegerField(required=True)
    name = forms.CharField(required=True, max_length=100)
    description = forms.CharField(required=True, max_length=100)
    condition = forms.CharField(required=True, max_length=100)
    category = forms.CharField(required=True, max_length=100)
    photos = forms.FileField(required=False)

    subcats = forms.JSONField(required=True)


class AddItemForm(EditItemForm):

    subcats = forms.JSONField(required=False)

    price = forms.IntegerField(required=False)
    amount = forms.IntegerField(required=False)
    param = forms.CharField(required=False, max_length=100)
    code = forms.CharField(required=False, max_length=100)


class DeleteItemForm(forms.Form):
    item_id = forms.IntegerField(required=True)


class EditFavouriteForm(forms.Form):
    item_id = forms.IntegerField(required=True)
    subcat_idx = forms.IntegerField(required=True)
    favourite = forms.BooleanField(initial=False, required=False)


class OrderForm(forms.Form):
    item_id = forms.IntegerField(required=True)
    subcat_id = forms.IntegerField(required=True)
    username = forms.CharField(required=True, max_length=100)
    message = forms.CharField(required=True, max_length=500)
    phone = forms.CharField(required=True, max_length=100)


class SavePhotosForm(forms.Form):
    item_id = forms.IntegerField(required=True)
    photos = forms.FileField(required=True)


class DeletePhotosForm(forms.Form):
    item_id = forms.IntegerField(required=True)
    filenames = forms.JSONField(required=True, max_length=500)


# GET
class GetHintsForm(forms.Form):
    query = forms.CharField(required=True, max_length=100)


class FetchItemsForm(forms.Form):
    query = forms.CharField(required=False, max_length=100)
    category = forms.IntegerField(required=False)
    item_id = forms.IntegerField(required=False)
    item_ids = forms.IntegerField(required=False)
    part = forms.IntegerField(required=True)
    part_size = forms.IntegerField(required=True)


class InitialPageDataForm(forms.Form):
    q = forms.CharField(max_length=100, required=False)
    cat = forms.IntegerField(required=False)


