from rest_framework.viewsets import ModelViewSet
from .models import CartItem
from .serializers import CartItemSerializer


class CartItemViewSet(ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer