from rest_framework import serializers
from .models import Allergen


class AllergenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = [
            "id",
            "name",
        ]