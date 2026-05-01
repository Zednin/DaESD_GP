from rest_framework import serializers
from .models import Address


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "account",
            "address_type",
            "is_default",
            "address_line_1",
            "address_line_2",
            "city",
            "postcode",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "account",
            "is_default",
            "created_at",
            "updated_at",
        ]