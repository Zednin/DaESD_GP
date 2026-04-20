from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import csrf

from apps.accounts.views import (
    AccountsViewSet,
    CustomerRegisterView,
    ProducerRegisterView,
)

from apps.catalog.views import ProductViewSet, CategoryViewSet, ProductImageUploadView
from apps.catalog.api.food_miles_views import (
    ProductFoodMilesView,
    ProductFoodMilesComparisonView,
)
from apps.addresses.views import AddressViewSet
from apps.cart.views import CartViewSet, CartItemViewSet
from apps.orders.views import (
    OrderViewSet,
    ProducerOrderViewSet,
    OrderItemViewSet,
)
from apps.producers.views import (
    ProducerViewSet,
    RecipeViewSet,
    FarmStoryViewSet,
    RecipeImageUploadView,
    FarmStoryImageUploadView,
)
from apps.traceability.views import AllergenViewSet
from apps.payments.views import CreateCheckoutSessionView, stripe_webhook
from apps.communications.views import AnnouncementViewSet




router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'accounts', AccountsViewSet, basename='account')
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-item')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'producer-orders', ProducerOrderViewSet, basename='producer-order')
router.register(r'order-items', OrderItemViewSet, basename='order-item')
router.register(r'producers', ProducerViewSet, basename='producer')
router.register(r'recipes', RecipeViewSet, basename='recipe')
router.register(r'farm-stories', FarmStoryViewSet, basename='farm-story')
router.register(r'allergens', AllergenViewSet, basename='allergen')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path("auth/csrf/", csrf),
    path("", include(router.urls)),
    # Registration endpoints
    path("auth/", include("dj_rest_auth.urls")),
    
    #Google Accounts Auth
    path("accounts/", include("allauth.urls")),
    
    # Custom registration endpoints
    path("auth/register/customer/", CustomerRegisterView.as_view(), name="customer-register"),
    path("auth/register/producer/", ProducerRegisterView.as_view(), name="producer-register"),
    
    
    path("checkout/create-session/", CreateCheckoutSessionView.as_view()),
    path("stripe/webhook/", stripe_webhook),
    path("products/<int:product_id>/upload-image/", ProductImageUploadView.as_view(), name="product-upload-image"),
    path("recipes/<int:recipe_id>/upload-image/", RecipeImageUploadView.as_view(), name="recipe-upload-image"),
    path("farm-stories/<int:story_id>/upload-image/", FarmStoryImageUploadView.as_view(), name="farm-story-upload-image"),
    
    # Food Miles
    path("food-miles/products/<int:product_id>/", ProductFoodMilesView.as_view(), name="product-food-miles",),
    path("food-miles/products/<int:product_id>/compare/",ProductFoodMilesComparisonView.as_view(), name="product-food-miles-compare",
    ),
]

