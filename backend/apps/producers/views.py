from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from .models import Producer
from .serializers import ProducerSerializer
from apps.accounts.permissions import IsProducer


class IsProducerOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_staff or obj.account == request.user
        )


class ProducerViewSet(ModelViewSet):
    serializer_class = ProducerSerializer
    permission_classes = [permissions.IsAuthenticated, IsProducerOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Producer.objects.all()
        return Producer.objects.filter(account=user)

    @action(detail=False, methods=["get"], permission_classes=[IsProducer])
    def dashboard(self, request):
        return Response({
            "message": "Producer dashboard data"
        })