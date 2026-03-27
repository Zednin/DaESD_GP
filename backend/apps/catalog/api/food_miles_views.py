import requests
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.catalog.services.food_miles import (
    FoodMilesError,
    calculate_product_food_miles,
    compare_product_food_miles,
)


class ProductFoodMilesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        try:
            product = Product.objects.select_related("producer__account").get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            data = calculate_product_food_miles(product, request)
            return Response(data, status=status.HTTP_200_OK)
        except FoodMilesError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except requests.RequestException:
            return Response(
                {"detail": "Routing provider request failed."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ProductFoodMilesComparisonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        try:
            product = Product.objects.select_related("producer__account", "category").get(
                id=product_id
            )
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        limit_param = request.query_params.get("limit", 4)
        try:
            limit = max(1, min(int(limit_param), 8))
        except (TypeError, ValueError):
            limit = 4

        try:
            data = compare_product_food_miles(product, request, limit=limit)
            return Response(data, status=status.HTTP_200_OK)
        except FoodMilesError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except requests.RequestException:
            return Response(
                {"detail": "Routing provider request failed."},
                status=status.HTTP_502_BAD_GATEWAY,
            )