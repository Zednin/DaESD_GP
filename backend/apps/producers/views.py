from django.db import models
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend

from .models import Producer
from .serializers import ProducerSerializer, RecipeSerializer, FarmStorySerializer
from apps.accounts.permissions import IsProducer

from apps.community.models import Recipe, FarmStory
from apps.api.cloudinary_utils import upload_file_to_cloudinary


def is_admin_user(user):
    return (
        user
        and user.is_authenticated
        and (user.is_staff or getattr(user, "account_type", None) == "admin")
    )


# PRODUCER PERMISSIONS

class IsProducerOwnerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return is_admin_user(request.user) or obj.account_id == request.user.id


class ProducerViewSet(ModelViewSet):
    serializer_class = ProducerSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return []

        return [IsAuthenticated(), IsProducerOwnerOrAdmin()]

    def get_queryset(self):
        queryset = Producer.objects.select_related("account", "business_address")
        user = self.request.user

        if self.request.method in permissions.SAFE_METHODS:
            return queryset.all()

        if is_admin_user(user):
            return queryset.all()

        return queryset.filter(account=user)


# PUBLIC READ / PRIVATE WRITE

class IsOwnerProducerOrAdminForWrites(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return (
            is_admin_user(request.user)
            or obj.producer.account_id == request.user.id
        )


# RECIPES

class RecipeViewSet(ModelViewSet):
    serializer_class = RecipeSerializer
    permission_classes = [IsOwnerProducerOrAdminForWrites]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["producer", "is_published", "seasonal_tag", "products"]

    def get_queryset(self):
        queryset = Recipe.objects.select_related(
            "producer",
            "producer__account",
        ).prefetch_related("products")

        user = self.request.user

        if user.is_authenticated and is_admin_user(user):
            return queryset.all()

        if user.is_authenticated and getattr(user, "account_type", None) == "producer":
            return queryset.filter(
                models.Q(is_published=True) | models.Q(producer__account=user)
            )

        return queryset.filter(is_published=True)

    def perform_create(self, serializer):
        producer = serializer.validated_data.get("producer")

        if not producer:
            raise PermissionDenied("Producer is required.")

        if not is_admin_user(self.request.user) and producer.account_id != self.request.user.id:
            raise PermissionDenied("You cannot create recipes for this producer.")

        serializer.save()

    def perform_update(self, serializer):
        producer = serializer.validated_data.get(
            "producer", serializer.instance.producer
        )

        if not is_admin_user(self.request.user) and producer.account_id != self.request.user.id:
            raise PermissionDenied("You cannot update recipes for this producer.")

        serializer.save()



# FARM STORIES

class FarmStoryViewSet(ModelViewSet):
    serializer_class = FarmStorySerializer
    permission_classes = [IsOwnerProducerOrAdminForWrites]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["producer", "is_published"]

    def get_queryset(self):
        queryset = FarmStory.objects.select_related(
            "producer",
            "producer__account"
        )

        user = self.request.user

        if user.is_authenticated and is_admin_user(user):
            return queryset.all()

        if user.is_authenticated and getattr(user, "account_type", None) == "producer":
            return queryset.filter(
                models.Q(is_published=True) | models.Q(producer__account=user)
            )

        return queryset.filter(is_published=True)

    def perform_create(self, serializer):
        producer = serializer.validated_data.get("producer")

        if not producer:
            raise PermissionDenied("Producer is required.")

        if not is_admin_user(self.request.user) and producer.account_id != self.request.user.id:
            raise PermissionDenied("You cannot create farm stories for this producer.")

        serializer.save()

    def perform_update(self, serializer):
        producer = serializer.validated_data.get(
            "producer", serializer.instance.producer
        )

        if not is_admin_user(self.request.user) and producer.account_id != self.request.user.id:
            raise PermissionDenied("You cannot update farm stories for this producer.")

        serializer.save()



# IMAGE UPLOADS

class RecipeImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, recipe_id):
        try:
            recipe = Recipe.objects.select_related(
                "producer",
                "producer__account"
            ).get(id=recipe_id)
        except Recipe.DoesNotExist:
            return Response({"detail": "Recipe not found."}, status=status.HTTP_404_NOT_FOUND)

        if not is_admin_user(request.user) and recipe.producer.account_id != request.user.id:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

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

        return Response({"id": recipe.id, "image": recipe.image})


class FarmStoryImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, story_id):
        try:
            story = FarmStory.objects.select_related(
                "producer",
                "producer__account"
            ).get(id=story_id)
        except FarmStory.DoesNotExist:
            return Response({"detail": "Story not found."}, status=status.HTTP_404_NOT_FOUND)

        if not is_admin_user(request.user) and story.producer.account_id != request.user.id:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

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

        return Response({"id": story.id, "image": story.image})