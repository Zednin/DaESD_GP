from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Customer, Organisation, Account
from apps.producers.models import Producer
from apps.addresses.models import Address

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
            "date_joined",
            "organisation",
        ]
        read_only_fields = ["id", "date_joined", "account_type"]

    def validate_email(self, value):
        return value.lower().strip()

    # Check to see if account is an organisation
    organisation = serializers.SerializerMethodField()

    def get_organisation(self, obj):

        # Check if customer
        customer = getattr(obj, "customer_profile", None)
        if not customer:
            return None

        # check if customer is linked to organisation
        organisation = getattr(customer, "organisation", None)
        if not organisation:
            return None

        return OrganisationSettingsSerializer(organisation).data
    
class AddressSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "address_line_1",
            "address_line_2",
            "city",
            "postcode",
        ]


class OrganisationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = [
            "organisation_name",
            "organisation_email",
            "organisation_type",
        ]


class AccountSettingsSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(required=False, allow_blank=True)
    default_delivery_address = AddressSettingsSerializer(required=False)
    organisation = OrganisationSettingsSerializer(required=False)

    class Meta:
        model = Account
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "default_delivery_address",
            "organisation",
        ]

    def validate_email(self, value):
        return value.lower().strip()

    def to_representation(self, obj):
        data = super().to_representation(obj)

        customer = getattr(obj, "customer_profile", None)

        data["phone_number"] = (
            customer.phone_number
            if customer and customer.phone_number
            else ""
        )

        data["default_delivery_address"] = (
            AddressSettingsSerializer(customer.default_delivery_address).data
            if customer and customer.default_delivery_address
            else None
        )

        organisation = getattr(customer, "organisation", None) if customer else None

        data["organisation"] = (
            OrganisationSettingsSerializer(organisation).data
            if organisation
            else None
        )

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        phone_number = validated_data.pop("phone_number", None)
        address_payload = validated_data.pop("default_delivery_address", None)
        organisation_payload = validated_data.pop("organisation", None)

        # Update Account fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Ensure customer exists
        customer, _ = Customer.objects.get_or_create(account=instance)

        # Update phone number
        if phone_number is not None:
            customer.phone_number = phone_number.strip()
            customer.save()

        # Update/create address
        if address_payload is not None:
            address = customer.default_delivery_address

            try:
                if address is None:
                    address = Address.objects.create(
                        account=instance,
                        address_type=Address.AddressType.DELIVERY,
                        is_default=True,
                        address_line_1=address_payload.get("address_line_1", "").strip(),
                        address_line_2=address_payload.get("address_line_2", "").strip(),
                        city=address_payload.get("city", "").strip(),
                        postcode=address_payload.get("postcode", "").strip(),
                    )
                    customer.default_delivery_address = address
                    customer.save()
                else:
                    if "address_line_1" in address_payload:
                        address.address_line_1 = address_payload["address_line_1"].strip()

                    if "address_line_2" in address_payload:
                        address.address_line_2 = address_payload.get("address_line_2", "").strip()

                    if "city" in address_payload:
                        address.city = address_payload["city"].strip()

                    if "postcode" in address_payload:
                        address.postcode = address_payload["postcode"].strip()

                    address.account = instance
                    address.address_type = Address.AddressType.DELIVERY
                    address.is_default = True
                    address.save()

            except DjangoValidationError as e:
                raise serializers.ValidationError(
                    e.message_dict if hasattr(e, "message_dict") else {"detail": e.messages}
                )

        # Update/create organisation
        if organisation_payload is not None:
            organisation, _ = Organisation.objects.get_or_create(
                customer=customer,
                defaults={
                    "organisation_name": "",
                    "organisation_email": "",
                    "organisation_type": None,
                },
            )

            if "organisation_name" in organisation_payload:
                organisation.organisation_name = organisation_payload["organisation_name"].strip()

            if "organisation_email" in organisation_payload:
                organisation.organisation_email = organisation_payload["organisation_email"].strip()

            if "organisation_type" in organisation_payload:
                organisation.organisation_type = organisation_payload["organisation_type"] or None

            organisation.save()

        instance.refresh_from_db()
        return instance
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
    phone_number = serializers.CharField(
        max_length=15,
        required=True,
        allow_blank=False,
    )
    
    organisation_type = serializers.ChoiceField(
        choices=Organisation.ORGANISATION_TYPE_CHOICES,
        required=False,
        allow_blank=True,
    )
    organisation_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )
    default_delivery_address = AddressSettingsSerializer(required=True)

    class Meta(BaseRegisterSerializer.Meta):
        fields = BaseRegisterSerializer.Meta.fields + [
            "phone_number",
            "organisation_type",
            "organisation_name",
            "default_delivery_address",
        ]

    def validate(self, attrs):
        organisation_type = attrs.get("organisation_type", "").strip() if attrs.get("organisation_type") else ""
        organisation_name = attrs.get("organisation_name", "").strip() if attrs.get("organisation_name") else ""

        if organisation_type and not organisation_name:
            raise serializers.ValidationError({
                "organisation_name": "Organisation name is required when organisation type is selected."
            })

        if organisation_name and not organisation_type:
            raise serializers.ValidationError({
                "organisation_type": "Organisation type is required when organisation name is provided."
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        phone_number = validated_data.pop("phone_number").strip()
        organisation_type = validated_data.pop("organisation_type", "").strip()
        organisation_name = validated_data.pop("organisation_name", "").strip()
        address_data = validated_data.pop("default_delivery_address")

        account = Account.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            account_type="customer",
        )

        address = Address.objects.create(
            account=account,
            address_type=Address.AddressType.DELIVERY,
            is_default=True,
            address_line_1=address_data["address_line_1"].strip(),
            address_line_2=address_data.get("address_line_2", "").strip(),
            city=address_data["city"].strip(),
            postcode=address_data["postcode"].strip(),
        )

        customer = Customer.objects.create(
            phone_number=phone_number,
            account=account,
            default_delivery_address=address,
        )

        if organisation_type:
            Organisation.objects.create(
                customer=customer,
                organisation_name=organisation_name,
                organisation_email=account.email,
                organisation_type=organisation_type,
            )

        return account


class ProducerRegisterSerializer(BaseRegisterSerializer):
    company_name = serializers.CharField(max_length=255)
    company_email = serializers.EmailField(required=False, allow_blank=True)
    company_number = serializers.CharField(max_length=15)
    company_description = serializers.CharField(required=False, allow_blank=True)
    lead_time_hours = serializers.IntegerField(required=False, min_value=48)
    business_address = AddressSettingsSerializer(required=True)

    class Meta(BaseRegisterSerializer.Meta):
        fields = BaseRegisterSerializer.Meta.fields + [
            "company_name",
            "company_email",
            "company_number",
            "company_description",
            "lead_time_hours",
            "business_address",
        ]

    @transaction.atomic
    def create(self, validated_data):
        address_data = validated_data.pop("business_address")

        producer_data = {
            "company_name": validated_data.pop("company_name"),
            "company_number": validated_data.pop("company_number"),
            "company_description": validated_data.pop("company_description", ""),
            "lead_time_hours": validated_data.pop("lead_time_hours", 48),
        }

        validated_data.pop("company_email", "")

        account = Account.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            account_type="producer",
        )

        address = Address.objects.create(
            account=account,
            address_type=Address.AddressType.BUSINESS,
            is_default=True,
            address_line_1=address_data["address_line_1"].strip(),
            address_line_2=address_data.get("address_line_2", "").strip(),
            city=address_data["city"].strip(),
            postcode=address_data["postcode"].strip(),
        )

        Producer.objects.create(
            account=account,
            business_address=address,
            **producer_data,
        )

        return account