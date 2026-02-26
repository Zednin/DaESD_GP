from django.urls import path
from . import views  # Import views from THIS folder (accounts)

urlpatterns = [
    # When React hits /api/accounts/register/, run the register function
    path('register/', views.register, name='register'),
]