# Generated by Django 3.1.1 on 2020-12-13 17:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_auto_20201213_1934'),
    ]

    operations = [
        migrations.AlterField(
            model_name='item',
            name='condition',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='item',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
    ]
