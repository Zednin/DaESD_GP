from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
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
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['producer', 'status']

class OrderItemViewSet(ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer