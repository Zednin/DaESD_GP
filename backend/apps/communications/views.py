import logging

from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Announcement, Notification, ProductRecall
from .serializers import (
    AnnouncementSerializer,
    NotificationSerializer,
    ProductRecallSerializer,
)

from apps.orders.models import OrderItem
from .email_service import send_announcement_to_producers

logger = logging.getLogger(__name__)


class AnnouncementViewSet(ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        announcement = serializer.save(created_by=self.request.user)
        try:
            send_announcement_to_producers(announcement)
        except Exception:
            logger.exception("Failed to send announcement email to producers")
            
            
class NotificationViewSet(ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(account=self.request.user)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().filter(read=False).update(read=True)
        return Response({"detail": "All notifications marked as read."})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(self.get_serializer(notification).data)
    
    @action(detail=True, methods=["delete"], url_path="clear")
    def clear(self, request, pk=None):
        notification = self.get_object()
        notification.delete()
        return Response(status=204)


def preview_order_email(request):
    # Fake minimal data
    class FakeUser:
        first_name = "Jeff"
        username = "epstein123"

    class FakeProduct:
        name = "Organic Apples"

    class FakeItem:
        quantity = 2
        product = FakeProduct()
        line_total = 4.50

    class FakeProducerOrder:
        items = [FakeItem()]

    class FakeOrder:
        id = 123
        total_amount = 12.99
        account = FakeUser()

        def producer_orders(self):
            return [FakeProducerOrder()]

    order = FakeOrder()

    return render(request, "emails/order_confirmation.html", {"order": order})


class ProductRecallViewSet(ModelViewSet):
    serializer_class = ProductRecallSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProductRecall.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        order_start = serializer.validated_data["order_start"]
        order_end = serializer.validated_data["order_end"]
        description = serializer.validated_data["description"]

        if order_start > order_end:
            raise ValidationError("Start date must be before end date.")

        # Optional safety check: make sure producer owns this product.
        # Adjust based on your Product model.
        if hasattr(product, "producer") and product.producer.account != self.request.user:
            raise PermissionDenied("You can only recall your own products.")

        recall = serializer.save(created_by=self.request.user)
        producer_account = product.producer.account
        producer_email = producer_account.email
        producer_phone = ""

        producer_customer_profile = getattr(producer_account, "customer_profile", None)
        if producer_customer_profile:
            producer_phone = producer_customer_profile.phone_number or ""

        affected_accounts = (
            OrderItem.objects
            .filter(
                product=product,
                producer_order__order__created_at__gte=order_start,
                producer_order__order__created_at__lte=order_end,
            )
            .values_list("producer_order__order__account", flat=True)
            .distinct()
        )

        contact_lines = [
            "",
            "Producer contact information:",
            f"Email: {producer_email}",
        ]

        if producer_phone:
            contact_lines.append(f"Phone: {producer_phone}")

        notification_body = description + "\n\n" + "\n".join(contact_lines)

        notifications = [
            Notification(
                account_id=account_id,
                title=f"Product recall: {product.name}",
                body=notification_body,
                link="/dashboard/notifications",
            )
            for account_id in affected_accounts
        ]

        Notification.objects.bulk_create(notifications)

        return recall
