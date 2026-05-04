from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from apps.catalog.models import Product, InventoryAdjustment
from .models import Order, ProducerOrder, OrderItem, RecurringOrder
from .serializers import (
    OrderSerializer,
    ProducerOrderSerializer,
    OrderItemSerializer,
    RecurringOrderSerializer,
)

# Checks to see if logged customer is a restaurant
def is_restaurant_customer(user):
    if getattr(user, "account_type", "") == "restaurant":
        return True

    customer = getattr(user, "customer_profile", None)
    organisation = getattr(customer, "organisation", None)
    return getattr(organisation, "organisation_type", "") == "restaurant"

# Get item status on order items from producers
def get_order_status_from_producer_statuses(statuses):
    if not statuses:
        return "pending"

    if all(status == "delivered" for status in statuses):
        return "completed"

    if all(status in ["cancelled", "rejected"] for status in statuses):
        return "cancelled"

    if any(status in ["accepted", "preparing", "ready", "delivered"] for status in statuses):
        return "confirmed"

    return "pending"


def sync_order_status_from_producer_orders(order):
    statuses = list(order.producer_orders.values_list("status", flat=True))
    next_status = get_order_status_from_producer_statuses(statuses)

    if order.status != next_status:
        Order.objects.filter(pk=order.pk).update(status=next_status)
        order.status = next_status


class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Returns all orders belonging to the authenticated user."""
        return Order.objects.filter(
            account=self.request.user).select_related("delivery_address").prefetch_related(
                "producer_orders__producer",
                "producer_orders__items__product",
            ).order_by("-created_at")

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

    def partial_update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance = self.get_object()
            previous_status = instance.status
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            new_status = serializer.validated_data.get("status", previous_status)

            if previous_status == "accepted" and new_status == "preparing":
                self.apply_order_inventory_adjustments(instance, request.user)

            self.perform_update(serializer)
            sync_order_status_from_producer_orders(instance.order)

        return Response(serializer.data)

    def apply_order_inventory_adjustments(self, producer_order, user):
        for item in producer_order.items.select_related("product"):
            adjustment_exists = InventoryAdjustment.objects.filter(
                order_item=item,
                reason="order_adjustment",
            ).exists()
            if adjustment_exists:
                continue

            product = Product.objects.select_for_update().get(pk=item.product_id)
            if product.stock < item.quantity:
                raise ValidationError(
                    {"detail": f"Not enough stock for {product.name}."}
                )

            InventoryAdjustment.objects.create(
                product=product,
                order_item=item,
                delta_quantity=-item.quantity,
                reason="order_adjustment",
                changed_by=user,
            )


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


# Handles the customer's recurring orders in My Account.
# Users can list, edit, or delete recurring orders, but only their own ones.
class RecurringOrderViewSet(ModelViewSet):
    serializer_class = RecurringOrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if not is_restaurant_customer(user):
            return RecurringOrder.objects.none()

        return (
            RecurringOrder.objects
            .filter(organisation__customer__account=user)
            .select_related("organisation", "delivery_address")
            .prefetch_related("items__product")
            .order_by("next_run_at", "-created_at")
        )