import django_filters
from .models import Product

class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    category__name = django_filters.CharFilter(field_name="category__name", lookup_expr="iexact")
    producer__company_name = django_filters.CharFilter(field_name="producer__company_name", lookup_expr="iexact")

    class Meta:
        model = Product
        fields = [
            'category',
            'organic_certified',
            'status',
            'producer',
        ]