from rest_framework.viewsets import ModelViewSet
from .models import Order, ProducerOrder, OrderItem
from .serializers import (
    OrderSerializer,
    ProducerOrderSerializer,
    OrderItemSerializer,
)

class OrderViewSet(ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

class ProducerOrderViewSet(ModelViewSet):
    queryset = ProducerOrder.objects.all()
    serializer_class = ProducerOrderSerializer

class OrderItemViewSet(ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer