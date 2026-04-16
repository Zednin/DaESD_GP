"""Signal handlers for the catalog app."""

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

# How far back to look for a prior recommendation interaction when
# deciding whether a purchase should be attributed to a recommendation.
LOOKBACK_DAYS = 30


def handle_order_item_purchase(sender, instance, created, **kwargs):
    """Logs a purchased interaction when a recommended item is bought."""

    if not created:
        return

    from apps.catalog.models import RecommendationInteraction

    try:
        account = instance.producer_order.order.account
        product = instance.product
    except Exception:
        return

    cutoff = timezone.now() - timedelta(days=LOOKBACK_DAYS)

    prior = (
        RecommendationInteraction.objects
        .filter(
            account=account,
            product=product,
            event_type__in=["viewed", "added_to_cart"],
            created_at__gte=cutoff,
        )
        .order_by("-created_at")
        .first()
    )

    if prior is None:
        # Product was not recommended to this user recently.
        return

    # Avoids duplicate purchased rows for the same session.
    already_logged = RecommendationInteraction.objects.filter(
        account=account,
        product=product,
        event_type="purchased",
        created_at__gte=cutoff,
    ).exists()
    if already_logged:
        return

    try:
        RecommendationInteraction.objects.create(
            account=account,
            product=product,
            event_type="purchased",
            recommendation_rank=prior.recommendation_rank,
            reorder_probability=prior.reorder_probability,
        )
    except Exception as exc:
        logger.warning(
            "Failed to log purchased recommendation interaction "
            "for product %s / account %s: %s",
            product.id,
            account.id,
            exc,
        )
