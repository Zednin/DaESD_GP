import logging

from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Announcement, Notification
from .serializers import AnnouncementSerializer, NotificationSerializer
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