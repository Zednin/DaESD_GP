from rest_framework import serializers
from .models import Account

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        # Links model to database
        model = Account

        # Which fields to include into JSON (not include password n dat)
        fields = ['id', 'username', 'email', 'account_type']
        
        # Prevents frontend from changing 'id' value, assigned by DB
        read_only_fields = ['id']