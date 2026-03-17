from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import Customer
from apps.producers.models import Producer

Account = get_user_model()


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "username",
            "email",
            "account_type",
            "first_name",
            "last_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "account_type"]

    def validate_email(self, value):
        return value.lower().strip()


class BaseRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Account
        fields = ["username", "email", "password", "first_name", "last_name"]
        extra_kwargs = {
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
        }

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")

        if Account.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")

        return value

    def validate_email(self, value):
        value = value.lower().strip()
        if not value:
            raise serializers.ValidationError("Email is required.")

        if Account.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")

        return value


class CustomerRegisterSerializer(BaseRegisterSerializer):
    @transaction.atomic
    def create(self, validated_data):
        account = Account.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            account_type="customer",
        )

        Customer.objects.create(account=account)
        return account


class ProducerRegisterSerializer(BaseRegisterSerializer):
    company_name = serializers.CharField(max_length=255)
    company_number = serializers.CharField(max_length=15)
    company_description = serializers.CharField(required=False, allow_blank=True)
    lead_time_hours = serializers.IntegerField(required=False, min_value=48)

    class Meta(BaseRegisterSerializer.Meta):
        fields = BaseRegisterSerializer.Meta.fields + [
            "company_name",
            "company_number",
            "company_description",
            "lead_time_hours",
        ]

    def validate_company_email(self, value):
        return value.lower().strip()

    @transaction.atomic
    def create(self, validated_data):
        producer_data = {
            "company_name": validated_data.pop("company_name"),
            "company_number": validated_data.pop("company_number"),
            "company_description": validated_data.pop("company_description", ""),
            "lead_time_hours": validated_data.pop("lead_time_hours", 48),
        }

        account = Account.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            account_type="producer",
        )

        Producer.objects.create(
            account=account,
            **producer_data,
        )

        return account