import json

from django.http import HttpResponse


class Message:
    def __init__(self, title='', content=''):
        self.title = title
        self.content = content

    def json(self):
        return {'title': self.title, 'content': self.content}


class Response:
    def __init__(self, success, message="no message specified", payload=None, alert=False):

        if payload is None:
            payload = dict()

        self.success = success
        self.message = message.json() if isinstance(message, Message) else message
        self.payload = payload
        self.alert = alert

    def wrap(self):
        return HttpResponse(json.dumps({"success": self.success,
                                        "message": self.message,
                                        "alert": self.alert,
                                        "payload": self.payload, }), content_type="application/json")

