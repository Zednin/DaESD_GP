from rest_framework.viewsets import ModelViewSet
from .models import Allergen
from .serializers import AllergenSerializer


class AllergenViewSet(ModelViewSet):
    queryset = Allergen.objects.all()
    serializer_class = AllergenSerializer