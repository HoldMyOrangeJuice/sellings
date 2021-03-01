from django.core.mail import EmailMessage


def email(receivers, subject, message):
    emailObj = EmailMessage(subject, message, to=receivers)
    emailObj.content_subtype = "html"
    emailObj.send()