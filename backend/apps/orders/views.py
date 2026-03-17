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
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer