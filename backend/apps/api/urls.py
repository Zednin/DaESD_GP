from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.catalog.views import ProductViewSet
from apps.addresses.views import AddressViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'addresses', AddressViewSet, basename='address')
urlpatterns = [
    path("", include(router.urls)),
]

