from uuid import uuid4
from django.contrib.auth import get_user_model



# This will generate a unique username by taking in the email, and adding a unique code afterwards
def generate_unique_username(email=None):
    User = get_user_model()

    base = "user"
    if email:
        email_prefix = email.split("@")[0].strip().lower()
        if email_prefix:
            cleaned = "".join(
                ch for ch in email_prefix if ch.isalnum() or ch == "_"
            )
            base = cleaned[:20] or "user"

    while True:
        candidate = f"{base}_{uuid4().hex[:8]}"
        if not User.objects.filter(username=candidate).exists():
            return candidate