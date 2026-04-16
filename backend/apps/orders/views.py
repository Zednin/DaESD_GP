from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
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
        """Returns all orders belonging to the authenticated user."""
        return Order.objects.filter(
            account=self.request.user).order_by("-created_at")

    @action(
        detail=False,
        methods=["get"],
        url_path="last-completed",
        permission_classes=[IsAuthenticated],
    )
    def last_completed(self, request):
        """Returns items from the user's most recent non-cancelled order."""
        completed_statuses = [
            "confirmed",
            "in transit",
            "ready for collection",
            "completed",
        ]
        order = (
            Order.objects
            .filter(account=request.user, status__in=completed_statuses)
            .prefetch_related("producer_orders__items__product")
            .order_by("-created_at")
            .first()
        )
        if order is None:
            return Response({"items": []})

        items = []
        for producer_order in order.producer_orders.all():
            for item in producer_order.items.all():
                product = item.product
                items.append({
                    "product_id": product.id,
                    "name": product.name,
                    "unit": product.unit,
                    "price": str(product.price),
                    "image": product.image or None,
                    "quantity": item.quantity,
                    "available": product.status == "available",
                })

        return Response({
            "order_id": order.id,
            "created_at": order.created_at,
            "items": items,
        })


class ProducerOrderViewSet(ModelViewSet):
    serializer_class = ProducerOrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_queryset(self):
        user = self.request.user
        qs = (
            ProducerOrder.objects
            .select_related(
                "order__account__customer_profile",
                "order__delivery_address",
                "producer",
            )
            .prefetch_related("items__product")
            .order_by("delivery_date", "-created_at")
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