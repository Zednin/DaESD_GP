from rest_framework.viewsets import ModelViewSet
from .models import CartItem, Cart
from .serializers import CartItemSerializer, CartSerializer


class CartItemViewSet(ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    
class CartViewSet(ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer
    