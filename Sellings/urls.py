"""Sellings URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path

from main.api import api_view, handle_error
from main.views import price_page, login_view, item_page, favicon

urlpatterns = [
    path('', price_page),
    re_path('^item\/[0-9]*$', item_page),
    path('login', login_view),
    path('api', api_view),
    path('error', handle_error),
    path('favicon.ico', favicon),
]
