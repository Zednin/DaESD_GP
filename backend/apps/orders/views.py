from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Order, ProducerOrder, OrderItem, RecurringOrder, RecurringOrderEvent
from .serializers import (
    OrderSerializer,
    ProducerOrderSerializer,
    OrderItemSerializer,
    RecurringOrderSerializer,
    RecurringOrderEventSerializer,
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


class RecurringOrderViewSet(ModelViewSet):
    """CRUD for recurring orders scoped to the user's organisation."""
    serializer_class = RecurringOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "organisation"):
            return RecurringOrder.objects.filter(
                organisation=user.organisation
            ).prefetch_related("items__product").order_by("-created_at")
        return RecurringOrder.objects.none()


class RecurringOrderEventViewSet(ReadOnlyModelViewSet):
    """Read-only list of recurring order events."""
    serializer_class = RecurringOrderEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "organisation"):
            return RecurringOrderEvent.objects.filter(
                recurring_order__organisation=user.organisation
            ).order_by("-scheduled_for")
        return RecurringOrderEvent.objects.none()