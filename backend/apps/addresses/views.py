from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Address
from .serializers import AddressSerializer


def is_admin_user(user):
    return (
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "account_type", None) == "admin")
    )


class AddressViewSet(ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Address.objects.select_related("account")
        user = self.request.user

        if is_admin_user(user):
            return queryset.all()

        address_type = self.request.query_params.get("address_type")

        queryset = queryset.filter(account=user)

        if address_type:
            queryset = queryset.filter(address_type=address_type)

        return queryset

    def perform_create(self, serializer):
        serializer.save(account=self.request.user)

    def perform_update(self, serializer):
        serializer.save(account=self.request.user)