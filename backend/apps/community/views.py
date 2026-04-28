from django.shortcuts import render

from django.db.models import Avg, Count
from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response

from .models import Review
from .serializers import (
    ReviewListSerializer,
    ReviewWriteSerializer,
    ProducerResponseSerializer,
)
from apps.orders.models import OrderItem


class ReviewViewSet(ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = (
            Review.objects
            .select_related(
                "product",
                "customer",
                "order_item",
                "order_item__producer_order",
                "order_item__producer_order__order",
            )
        )

        product_id = self.request.query_params.get("product_id")
        rating = self.request.query_params.get("rating")
        sort = self.request.query_params.get("sort", "newest")

        if self.action == "mine":
            queryset = queryset.filter(customer=self.request.user)

        if product_id:
            queryset = queryset.filter(product_id=product_id)

        if rating:
            queryset = queryset.filter(rating=rating)

        ordering_map = {
            "newest": "-created_at",
            "oldest": "created_at",
            "highest": "-rating",
            "lowest": "rating",
        }

        return queryset.order_by(ordering_map.get(sort, "-created_at"))

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ReviewWriteSerializer
        if self.action == "producer_response":
            return ProducerResponseSerializer
        return ReviewListSerializer

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.customer_id != request.user.id:
            raise PermissionDenied("You can only edit your own review.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.customer_id != request.user.id:
            raise PermissionDenied("You can only edit your own review.")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.customer_id != request.user.id:
            raise PermissionDenied("You can only delete your own review.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        serializer = ReviewListSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"product/(?P<product_id>\d+)")
    def product_reviews(self, request, product_id=None):
        queryset = self.get_queryset().filter(product_id=product_id)
        serializer = ReviewListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"product/(?P<product_id>\d+)/summary")
    def product_summary(self, request, product_id=None):
        queryset = Review.objects.filter(product_id=product_id)

        aggregate = queryset.aggregate(
            average_rating=Avg("rating"),
            review_count=Count("id"),
        )

        distribution = {str(i): 0 for i in range(1, 6)}
        for row in queryset.values("rating").annotate(count=Count("id")):
            distribution[str(row["rating"])] = row["count"]

        can_review = False
        existing_review_id = None

        if request.user.is_authenticated:
            existing_review = Review.objects.filter(
                customer=request.user,
                product_id=product_id,
            ).only("id").first()

            if existing_review:
                existing_review_id = existing_review.id
            else:
                can_review = OrderItem.objects.filter(
                    producer_order__order__account=request.user,
                    product_id=product_id,
                    producer_order__status="delivered",
                ).exists()

        return Response({
            "average_rating": round(float(aggregate["average_rating"] or 0), 1),
            "review_count": aggregate["review_count"] or 0,
            "distribution": distribution,
            "can_review": can_review,
            "existing_review_id": existing_review_id,
        })

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def eligibility(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response(
                {"detail": "product_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_review = Review.objects.filter(
            customer=request.user,
            product_id=product_id,
        ).only("id").first()

        if existing_review:
            return Response({
                "product_id": int(product_id),
                "can_review": False,
                "reason": "already_reviewed",
                "order_item_id": None,
                "existing_review_id": existing_review.id,
            })

        eligible_item = OrderItem.objects.select_related(
            "producer_order",
            "producer_order__order",
        ).filter(
            producer_order__order__account=request.user,
            product_id=product_id,
            producer_order__status="delivered",
        ).first()

        if not eligible_item:
            return Response({
                "product_id": int(product_id),
                "can_review": False,
                "reason": "not_eligible",
                "order_item_id": None,
                "existing_review_id": None,
            })

        return Response({
            "product_id": int(product_id),
            "can_review": True,
            "reason": "eligible",
            "order_item_id": eligible_item.id,
            "existing_review_id": None,
        })

    @action(detail=True, methods=["patch"], permission_classes=[permissions.IsAuthenticated], url_path="producer-response")
    def producer_response(self, request, pk=None):
        review = self.get_object()
        product = review.product

        if not hasattr(request.user, "producer_profile"):
            raise PermissionDenied("Only producers can respond to reviews.")

        if product.producer_id != request.user.producer_profile.id:
            raise PermissionDenied("You can only respond to reviews for your own products.")

        serializer = ProducerResponseSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ReviewListSerializer(review).data)