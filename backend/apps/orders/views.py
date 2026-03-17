from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Order, ProducerOrder, OrderItem
from .serializers import (
    OrderSerializer,
    ProducerOrderSerializer,
    OrderItemSerializer,
)


class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(account=self.request.user).order_by("-created_at")


class ProducerOrderViewSet(ModelViewSet):
    serializer_class = ProducerOrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "producer_profile"):
            return ProducerOrder.objects.filter(
                producer=user.producer_profile
            ).order_by("-created_at")
        return ProducerOrder.objects.none()


class OrderItemViewSet(ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if hasattr(user, "producer_profile"):
            return OrderItem.objects.filter(
                producer_order__producer=user.producer_profile
            ).select_related("product", "producer_order")

        return OrderItem.objects.filter(
            producer_order__order__account=user
        ).select_related("product", "producer_order")