from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes  
from rest_framework.response import Response     # Sends JSON back to React.
from rest_framework import status                # HTTP status codes (201 = created or 400 = bad request)
from rest_framework.permissions import AllowAny  # Allow for any new users to access web endpoint# 
from .models import Account                      # Our Account model to save to DB

@api_view(['POST'])  # Only accept POST requests (React is POSTING data to us)
@permission_classes([AllowAny])
def register(request):
    
    # Get the data sent from React
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    account_type = request.data.get('account_type', 'customer')  # Default to customer

    # Check if there are inputs in fields, Username, email & password
    if not username or not email or not password:
        return Response(
            {"error": "Username, email and password are required"},
            status=status.HTTP_400_BAD_REQUEST  # 400 = bad request
        )

    # Check if username already exists in DB
    if Account.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already taken"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create and save the account to the database
    # 'create_user' automatically hashes the password 
    Account.objects.create_user(
        username=username,
        email=email,
        password=password,
        account_type=account_type
    )

    # Send success response back to React
    return Response(
        {"message": "Account created successfully!"},
        status=status.HTTP_201_CREATED  # 201 = successfully created
    )