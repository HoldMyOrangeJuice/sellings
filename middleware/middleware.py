from django.conf import settings
from django.contrib.auth.middleware import AuthenticationMiddleware, get_user
from django.contrib.auth.models import AnonymousUser
from django.utils.functional import SimpleLazyObject

from main.api import write_log


def activity_recorder_middleware(get_response):
    def middleware(request):
        url = request.build_absolute_uri()
        if "static" in url or "media" in url:
            return get_response(request)
        write_log(f"User {request.ip} requested url {url}", "access log")
        return get_response(request)

    return middleware


def get_ip_middleware(get_response):

    def middleware(request):

        import re
        MOBILE_AGENT_RE = re.compile(r".*(iphone|mobile|androidtouch)", re.IGNORECASE)
        mobile = MOBILE_AGENT_RE.match(request.META['HTTP_USER_AGENT'])
        request.__setattr__("mobile", mobile)

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        request.__setattr__("ip", ip)

        response = get_response(request)

        return response

    return middleware


class CustomAnonymousAuthMiddleware(AuthenticationMiddleware):
    def process_request(self, request):
        assert hasattr(request, 'session'), (
            "The Django authentication middleware requires session middleware "
            "to be installed. Edit your MIDDLEWARE setting to insert "
            "'django.contrib.sessions.middleware.SessionMiddleware' before "
            "'django.contrib.auth.middleware.AuthenticationMiddleware'."
        )
        user = get_user(request)

        # swap users here
        if isinstance(user, AnonymousUser):
            user = settings.ANONYMOUS_MODEL(request)

        request.user = SimpleLazyObject(lambda: user)
