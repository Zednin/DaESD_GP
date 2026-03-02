from rest_framework.viewsets import ModelViewSet
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    # Enable filtering + ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]

    # Fields the frontend can filter on
    filterset_fields = {
        'category': ['exact'],
        'organic_certified': ['exact'],
        'status': ['exact'],
        'producer': ['exact'],
    }

    # Fields the frontend can sort by
    ordering_fields = [
        'name',
        'price',
        'created_at',
    ]

    # Default ordering
    ordering = ['name']