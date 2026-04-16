from rest_framework.viewsets import ModelViewSet
from rest_framework import filters, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Product, Category, RecommendationInteraction
from .serializers import ProductSerializer, CategorySerializer
from .filters import ProductFilter
from .services.recommendations import RecommenderError, get_recommended_products
from apps.api.cloudinary_utils import upload_file_to_cloudinary


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
    #queryset = Product.objects.filter(status="available") for future use when we want to show only available products
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['name']

    # Enable filtering + ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]

    # Fields the frontend can filter on
    filterset_fields = ['category__name', 'status', 'producer', 'producer__company_name', 'organic_certified', 'is_surplus']

    # Fields the frontend can sort by
    ordering_fields = [
        'name',
        'price',
        'created_at',
    ]

    # Default ordering
    ordering = ['name']

    @action(detail=False, methods=["get"], url_path="surplus-deals")
    def surplus_deals(self, request):
        """Return only active surplus deals (not expired)."""
        now = timezone.now()
        surplus_products = Product.objects.filter(
            is_surplus=True,
            status='available',
        ).exclude(
            surplus_end_date__lt=now
        )
        serializer = self.get_serializer(surplus_products, many=True)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get"],
        url_path="recommendations",
        permission_classes=[IsAuthenticated],
    )
    def recommendations(self, request):
        """Returns product suggestions for the logged-in user.

        Calls the recommender and gives each product an explanation tag (XAI tags)

        Falls back to the newest available products on any service failure
        so the UI never breaks.
        """
        try:
            limit = int(request.query_params.get("limit", 5))
        except (TypeError, ValueError):
            limit = 5
        limit = max(1, min(limit, 20))

        try:
            enriched = get_recommended_products(request.user, limit=limit)
        except RecommenderError:
            # fallback: newest products, no XAI reasons
            fallback = list(
                Product.objects.filter(status="available")
                .order_by("-created_at")[:limit]
            )
            serializer = self.get_serializer(fallback, many=True)
            return Response(serializer.data)

        response_data = []
        for rank, item in enumerate(enriched):
            product_data = self.get_serializer(item["product"]).data
            product_data["recommendation_reasons"] = item["reasons"]
            product_data["_rec_score"] = round(
                item["reorder_probability"], 4
            )
            product_data["_rec_rank"] = rank
            response_data.append(product_data)

        return Response(response_data)

    @action(
        detail=False,
        methods=["post"],
        url_path="recommendations/log",
        permission_classes=[IsAuthenticated],
    )
    def log_recommendation_interaction(self, request):
        """Logs a user's interaction with a recommendation card.

        request example:

            {
                "product_id": 42,
                "event_type": "added_to_cart",
                "recommendation_rank": 0,
                "reorder_probability": 0.8234
            }
        """
        product_id = request.data.get("product_id")
        event_type = request.data.get("event_type")
        rank = request.data.get("recommendation_rank")
        score = request.data.get("reorder_probability")

        valid_events = {choice[0] for choice in
                        RecommendationInteraction.EVENT_CHOICES}
        if event_type not in valid_events:
            return Response(
                {"detail": f"Invalid event_type '{event_type}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        RecommendationInteraction.objects.create(
            account=request.user,
            product=product,
            event_type=event_type,
            recommendation_rank=int(rank or 0),
            reorder_probability=float(score or 0.0),
        )
        return Response({"detail": "Logged."}, status=status.HTTP_201_CREATED)

    
# Used to whip up the image and whack it onto the cloud
class ProductImageUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Stores the image in cloudinary under productid/main
        image_url = upload_file_to_cloudinary(
            file_obj=image_file,
            folder=f"products/{product.id}",
            public_id="main",
            resource_type="image",
        )

        # Populates the cloudinary url into the image field in the database
        product.image = image_url
        product.save(update_fields=["image"])

        return Response(
            {
                "id": product.id,
                "image": product.image,
            },
            status=status.HTTP_200_OK,
        )