from rest_framework import serializers
from .models import Account
from dj_rest_auth.registration.serializers import RegisterSerializer
from .utils import generate_unique_username

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        # Links model to database
        model = Account

        # Which fields to include into JSON (not include password n dat)
        fields = ['id', 
                  'username', 
                  'email', 
                  'date_joined', 
                  'first_name', 
                  'last_name', 
                  'account_type'
                  ]
        
        # Prevents frontend from changing 'id' value, assigned by DB
        read_only_fields = ['id', 'created_at']
        
        def validate_email(self, value):
            return value.lower().strip()
        

class CustomRegisterSerializer(RegisterSerializer):
    username = None

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        email = data.get("email")
        data["username"] = generate_unique_username(email=email)
        return data