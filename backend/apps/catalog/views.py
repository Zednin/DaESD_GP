from rest_framework.viewsets import ModelViewSet
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer
from .filters import ProductFilter

class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
    #queryset = Product.objects.filter(status="available") for future use when we want to show only available products
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ProductFilter
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['name']


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