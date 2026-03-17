from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from .utils import generate_unique_username


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)

        email = data.get("email", "") or ""
        user.email = email
        user.first_name = data.get("first_name", "") or ""
        user.last_name = data.get("last_name", "") or ""

        # Internal username only
        user.username = generate_unique_username(email=email)

        return user