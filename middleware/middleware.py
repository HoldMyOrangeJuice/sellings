def get_ip_middleware(get_response):

    def middleware(request):

        import re
        """Return True if the request comes from a mobile device."""
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
