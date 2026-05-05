from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Address
from .serializers import AddressSerializer
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


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
        try:
            serializer.save(account=self.request.user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(
                e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
            )

    def perform_update(self, serializer):
        serializer.save(account=self.request.user)