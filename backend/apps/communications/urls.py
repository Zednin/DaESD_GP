from django.urls import path
from .views import preview_order_email

urlpatterns = [
    path("email-preview/", preview_order_email, name="email_preview"),
]