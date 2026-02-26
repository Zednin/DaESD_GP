from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.catalog.views import ProductViewSet
from apps.addresses.views import AddressViewSet
from apps.cart.views import CartViewSet, CartItemViewSet
from apps.orders.views import (
    OrderViewSet,
    ProducerOrderViewSet,
    OrderItemViewSet,
)
from apps.producers.views import ProducerViewSet
from apps.traceability.views import AllergenViewSet



router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-item')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'producer-orders', ProducerOrderViewSet, basename='producer-order')
router.register(r'order-items', OrderItemViewSet, basename='order-item')
router.register(r'producers', ProducerViewSet, basename='producer')
router.register(r'allergens', AllergenViewSet, basename='allergen')

urlpatterns = [
    path("", include(router.urls)),
]

