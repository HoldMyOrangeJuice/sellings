# Generated by Django 3.1.1 on 2020-12-12 13:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0004_auto_20201206_2206'),
    ]

    operations = [
        migrations.AlterField(
            model_name='item',
            name='category',
            field=models.IntegerField(),
        ),
    ]
