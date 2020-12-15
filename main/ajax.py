import json

from django.http import HttpResponse


class Response:
    def __init__(self, success, message, payload={}):
        self.success = success
        self.message = message
        self.payload = payload

    def wrap(self):
        return HttpResponse(json.dumps({"success": self.success, "message": self.message, "payload": self.payload}), content_type="application/json")

