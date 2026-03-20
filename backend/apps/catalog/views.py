from rest_framework.viewsets import ModelViewSet
from rest_framework import filters, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from .filters import ProductFilter
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