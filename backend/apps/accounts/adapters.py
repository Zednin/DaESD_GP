from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from .utils import generate_unique_username



class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    '''
    Cusotm adapter to handle user data from Google OAuth2 login.
    This adapter populates the user model with email, first name, last name, and generates a unique username based on the email. It also defines the callback URL for Google OAuth2 login.
    '''
    
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)

        email = data.get("email", "") or ""
        user.email = email
        user.first_name = data.get("first_name", "") or ""
        user.last_name = data.get("last_name", "") or ""

        user.username = generate_unique_username(email=email)

        return user

    def get_callback_url(self, request, app):
        return (
            f"{settings.BACKEND_URL.rstrip('/')}"
            "/api/accounts/google/login/callback/"
        )