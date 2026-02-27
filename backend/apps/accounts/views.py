from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet
from .models import Account
from .serializers import AccountSerializer

class IsSelfOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and (request.user.is_staff or obj == request.user)

class AccountsViewSet(ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Account.objects.all()
        return Account.objects.filter(id=user.id)