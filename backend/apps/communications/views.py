import logging

from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.serializers import ModelSerializer
from .models import Announcement
from .email_service import send_announcement_to_producers

logger = logging.getLogger(__name__)


class AnnouncementSerializer(ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'body', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']


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