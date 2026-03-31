import django_filters
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q
from django.db.models.functions import Greatest
from .models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    category__name = django_filters.CharFilter(field_name="category__name", lookup_expr="iexact")
    producer__company_name = django_filters.CharFilter(field_name="producer__company_name", lookup_expr="iexact")
    is_surplus = django_filters.BooleanFilter(field_name="is_surplus")
    search = django_filters.CharFilter(method='fuzzy_search')
    exclude_allergens = django_filters.CharFilter(method='filter_exclude_allergens')

    class Meta:
        model = Product
        fields = [
            'category',
            'organic_certified',
            'status',
            'producer',
            'is_surplus',
        ]

    def fuzzy_search(self, queryset, name, value):
        """Fuzzy search across name, description, category and producer.
        Combines substring matching (icontains) with trigram similarity
        so short search terms like 'ch' still return all relevant results.
        """
        substring_match = Q(name__icontains=value)

        return queryset.annotate(
            similarity=Greatest(
                TrigramSimilarity('name', value),
                TrigramSimilarity('description', value),
                TrigramSimilarity('category__name', value),
                TrigramSimilarity('producer__company_name', value),
            )
        ).filter(substring_match | Q(similarity__gte=0.2)).order_by('-similarity')

    def filter_exclude_allergens(self, queryset, name, value):
        """Exclude products containing ANY of the given allergen IDs."""
        allergen_ids = [int(x) for x in value.split(',') if x.strip().isdigit()]
        if allergen_ids:
            queryset = queryset.exclude(allergens__id__in=allergen_ids)
        return queryset