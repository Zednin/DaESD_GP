from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from .models import Producer
from apps.community.models import Recipe, FarmStory
from .serializers import ProducerSerializer, RecipeSerializer, FarmStorySerializer
from apps.api.cloudinary_utils import upload_file_to_cloudinary


class ProducerViewSet(ModelViewSet):
    queryset = Producer.objects.all()
    serializer_class = ProducerSerializer


class RecipeViewSet(ModelViewSet):
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["producer", "is_published", "seasonal_tag"]

    def get_queryset(self):
        return Recipe.objects.prefetch_related("products").all()


class FarmStoryViewSet(ModelViewSet):
    serializer_class = FarmStorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["producer", "is_published"]

    def get_queryset(self):
        return FarmStory.objects.all()


class RecipeImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, recipe_id):
        try:
            recipe = Recipe.objects.get(id=recipe_id)
        except Recipe.DoesNotExist:
            return Response({"detail": "Recipe not found."}, status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        image_url = upload_file_to_cloudinary(
            file_obj=image_file,
            folder=f"recipes/{recipe.id}",
            public_id="main",
            resource_type="image",
        )

        recipe.image = image_url
        recipe.save(update_fields=["image"])

        return Response({"id": recipe.id, "image": recipe.image}, status=status.HTTP_200_OK)


class FarmStoryImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, story_id):
        try:
            story = FarmStory.objects.get(id=story_id)
        except FarmStory.DoesNotExist:
            return Response({"detail": "Story not found."}, status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        image_url = upload_file_to_cloudinary(
            file_obj=image_file,
            folder=f"farm-stories/{story.id}",
            public_id="main",
            resource_type="image",
        )

        story.image = image_url
        story.save(update_fields=["image"])

        return Response({"id": story.id, "image": story.image}, status=status.HTTP_200_OK)