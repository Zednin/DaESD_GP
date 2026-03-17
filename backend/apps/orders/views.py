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
        qs = (
            ProducerOrder.objects
            .select_related("order__account", "producer")
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

        # Admin/staff: allow filtering by ?producer=<id>
        if user.is_staff or user.is_superuser:
            producer_id = self.request.query_params.get("producer")
            if producer_id:
                qs = qs.filter(producer_id=producer_id)
            return qs

        # Regular producer: scope to their own orders
        if hasattr(user, "producer_profile"):
            return qs.filter(producer=user.producer_profile)

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