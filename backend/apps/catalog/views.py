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
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    # Fields the frontend can filter on
    filterset_fields = ['category__name', 'status', 'producer', 'producer__company_name', 'organic_certified']

    # Fields searched by ?search=
    search_fields = ['name']

    # Fields the frontend can sort by
    ordering_fields = [
        'name',
        'price',
        'created_at',
    ]

    # Default ordering
    ordering = ['name']