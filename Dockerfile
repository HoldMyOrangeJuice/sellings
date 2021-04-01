FROM python:3.8-slim-buster

COPY . /srv/web/dom21/Sellings

RUN apt-get update && apt-get install build-essential -y

RUN pip install -r /srv/web/dom21/Sellings/docker/requirements.txt
RUN python3 /srv/web/dom21/Sellings/manage.py collectstatic --noinput


RUN pip install uwsgi

CMD ["uwsgi", "--ini", "/srv/web/dom21/Sellings/docker/dom21.ini"]


