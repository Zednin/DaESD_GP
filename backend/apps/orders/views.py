from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from .models import Order, ProducerOrder, OrderItem, RecurringOrder
from .serializers import (
    OrderSerializer,
    ProducerOrderSerializer,
    OrderItemSerializer,
    ProducerRecurringOrderSerializer,
    RecurringOrderSerializer,
)
from .recurring_services import get_payable_event, skip_next_event
from .stock_services import deduct_stock_for_producer_order
from apps.payments.views import create_recurring_checkout_session

import logging

from apps.communications.models import Notification
from apps.communications.email_service import send_customer_order_status_update

logger = logging.getLogger(__name__)

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

    # status that determin if order has ended
    final_statuses = {"delivered", "cancelled", "rejected"}

    if all(status == "delivered" for status in statuses):
        return "completed"

    if all(status in ["cancelled", "rejected"] for status in statuses):
        return "cancelled"

    # if at least one producer delivered and all other producer orders are final, mark as completed
    if any(status == "delivered" for status in statuses) and all(
        status in final_statuses for status in statuses
    ):
        return "completed"

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
                "order__recurring_order_event__recurring_order",
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
        status_changed = False

        with transaction.atomic():
            instance = self.get_object()
            previous_status = instance.status

            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            new_status = serializer.validated_data.get("status", previous_status)

            # stock is deducted once when the producer accepts the order.
            if previous_status != "accepted" and new_status == "accepted":
                deduct_stock_for_producer_order(instance, request.user)

            self.perform_update(serializer)

            status_changed = previous_status != new_status

            if status_changed:
                Notification.objects.create(
                    account=instance.order.account,
                    title=f"Order #{instance.order.id} update",
                    body=f"{instance.producer.company_name} changed your order status from {previous_status} to {new_status}.",
                    link=f"/account/orders/{instance.order.id}",
                )

            sync_order_status_from_producer_orders(instance.order)

        if status_changed:
            try:
                send_customer_order_status_update(
                    order=instance.order,
                    producer_order=instance,
                    previous_status=previous_status,
                    new_status=new_status,
                )
            except Exception:
                logger.exception("Failed to send customer order status update email")

        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="contact-customer")
    def contact_customer(self, request, pk=None):
        producer_order = self.get_object()
        message = (request.data.get("message") or "").strip()

        if not message:
            return Response(
                {"detail": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Notification.objects.create(
            account=producer_order.order.account,
            title=f"Message from {producer_order.producer.company_name}",
            body=message,
            link="/my-account",
        )

        return Response({"detail": "Message sent to customer."})


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

    # custom actions to allow 
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if not is_restaurant_customer(user):
            return RecurringOrder.objects.none()

        return (
            RecurringOrder.objects
            .filter(organisation__customer__account=user)
            .select_related("organisation", "delivery_address")
            .prefetch_related("items__product__producer", "events__order")
            .order_by("next_run_at", "-created_at")
        )

    # 
    @action(detail=True, methods=["post"], url_path="skip-next")

    # skip if recurring status cancelled
    def skip_next(self, request, pk=None):
        # Skips the unpaid occurrence only.
        recurring_order = self.get_object()

        # blocks templates that are canclled by customer
        if recurring_order.status == "cancelled":
            return Response(
                {"detail": "This recurring order has already been cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # skip event function called then returns data to front end
        skip_next_event(recurring_order)
        recurring_order.refresh_from_db()
        serializer = self.get_serializer(recurring_order)
        return Response(serializer.data)


    # adds recurring order
    @action(detail=True, methods=["post"], url_path="confirm-next")
    def confirm_next(self, request, pk=None):
        # Creates a Stripe session for the next unpaid occurrence.
        recurring_order = self.get_object()

        #  again blocks templates that are canclled by customer
        if recurring_order.status == "cancelled":
            return Response(
                {"detail": "This recurring order has already been cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # gets events that can be paid and prevents already paid  events
        event = get_payable_event(recurring_order)
        if event.order_id:
            return Response(
                {"detail": "This recurring delivery has already been paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # runns checkout for recurring evengt
        session = create_recurring_checkout_session(request.user, event, request.data.get("items"))
        return Response({"url": session.url, "event_id": event.id})

    # gets recurring orders for producer
    @action(detail=False, methods=["get"], url_path="producer")
    def producer(self, request):
        user = request.user
        producer_id = request.query_params.get("producer")

        if hasattr(user, "producer_profile"):
            producer_id = user.producer_profile.id

        try:
            producer_id = int(producer_id)
        except (TypeError, ValueError):
            return Response([])

        if not (user.is_staff or user.is_superuser or hasattr(user, "producer_profile")):
            return Response([])

        rows = (
            RecurringOrder.objects
            .filter(items__product__producer_id=producer_id)
            .select_related("organisation", "delivery_address")
            .prefetch_related("items__product__producer", "events__order")
            .distinct()
            .order_by("next_run_at", "name")
        )
        serializer = ProducerRecurringOrderSerializer(
            rows,
            many=True,
            context={"producer_id": producer_id},
        )
        return Response(serializer.data)
