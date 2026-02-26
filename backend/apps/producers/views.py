from rest_framework.viewsets import ModelViewSet
from .models import Producer
from .serializers import ProducerSerializer


class ProducerViewSet(ModelViewSet):
    queryset = Producer.objects.all()
    serializer_class = ProducerSerializer