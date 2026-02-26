from rest_framework import serializers
from .models import Address

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "user",
            "address_line_1",
            "address_line_2",
            "city",
            "postcode",
            "created_at",
        ]
        read_only_fields = ["created_at"]