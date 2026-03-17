from rest_framework import serializers
from .models import Producer


class ProducerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producer
        fields = [
            "id",
            "account",
            "company_name",
            "company_number",
            "company_description",
            "lead_time_hours",
            "business_address",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "account"]