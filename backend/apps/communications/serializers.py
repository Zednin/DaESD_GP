from rest_framework.serializers import ModelSerializer

from .models import Announcement, Notification


class AnnouncementSerializer(ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'body', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']


class NotificationSerializer(ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "link", "read", "created_at"]
        read_only_fields = ["id", "title", "body", "link", "created_at"]