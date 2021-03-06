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
from django.conf.urls import url
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, re_path

from main.api import AdminApi, UserApi
from main.views import price_page, login_view, item_page, favicon
from django.conf import settings

urlpatterns = [
    path('', price_page),
    re_path('^item\/[0-9]*$', item_page),

    re_path(AdminApi.make_path(), AdminApi.dispatch),
    re_path(UserApi.make_path(), UserApi.dispatch),

    path('login', login_view),

    path('favicon.ico', favicon),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


