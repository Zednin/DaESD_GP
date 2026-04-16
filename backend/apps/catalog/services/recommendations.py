"""
Combines two signals into a single list:

1. ML reorder model — logistic-regression score returned by the
   FastAPI recommender service.
2. Collaborative-filtering (CF) — finds products that similar users
   frequently buy.

Out-of-season products are excluded before scoring so the model
only considers items currently available.
"""

import math
from typing import Optional

import requests
from django.conf import settings
from django.db.models import Count
from django.utils import timezone

from apps.catalog.models import Product
from apps.orders.models import Order, OrderItem


class RecommenderError(Exception):
    """Raised when the recommender service is unreachable or errors."""



# Seasonal helper
def _is_in_season(product: Product) -> bool:
    """Returns True if product is currently within its seasonal window."""
    if product.availability_mode != "seasonal":
        return False

    start = product.season_start_month
    end = product.season_end_month
    if start is None or end is None:
        return False

    current = timezone.now().month
    if start <= end:
        return start <= current <= end
    # Wrap-around: e.g. start=11 (Nov), end=2 (Feb)
    return current >= start or current <= end


# Global product statistics
def _build_global_product_stats() -> tuple[dict[int, int], dict[int, float]]:
    """Computes aggregate purchase counts and reorder rates across all users.

    Returns:
        product_total_purchases: Mapping of product_id to the total number
            of times it has been purchased by any user.
        product_reorder_rate: Mapping of product_id to the number of
            purchases that were a repeat buy by the same account.
    """
    product_total_purchases: dict[int, int] = {}
    product_reorder_count: dict[int, int] = {}
    seen_user_product: set[tuple[int, int]] = set()

    items = (
        OrderItem.objects
        .select_related("producer_order__order")
        .order_by("producer_order__order__created_at", "id")
        .values("product_id", "producer_order__order__account_id")
    )

    for item in items.iterator():
        product_id = item["product_id"]
        account_id = item["producer_order__order__account_id"]
        if account_id is None:
            continue

        product_total_purchases[product_id] = (
            product_total_purchases.get(product_id, 0) + 1
        )

        key = (account_id, product_id)
        if key in seen_user_product:
            product_reorder_count[product_id] = (
                product_reorder_count.get(product_id, 0) + 1
            )
        else:
            seen_user_product.add(key)

    product_reorder_rate: dict[int, float] = {}
    for product_id, total in product_total_purchases.items():
        reorders = product_reorder_count.get(product_id, 0)
        product_reorder_rate[product_id] = reorders / total if total else 0.0

    return product_total_purchases, product_reorder_rate


# Per-user statistics
def _build_user_stats(
    account,
) -> tuple[int, dict[int, int], dict[int, Optional[int]], float]:
    """Compute per-user features needed by the recommender.

    Returns:
        user_total_orders: Total number of orders placed by account.
        user_product_counts: Mapping of product_id to how many times a
            user has purchased that product.
        days_since_last_purchase: Mapping of product_id to the number of
            calendar days since the account's most recent purchase of that
            product.
        organic_preference: Fraction of all a user's order items that
            were organic-certified (0.0 when no history exists).
    """
    user_total_orders = Order.objects.filter(account=account).count()

    items_qs = (
        OrderItem.objects
        .filter(producer_order__order__account=account)
        .select_related("product")
        .values(
            "product_id",
            "product__organic_certified",
            "producer_order__order__created_at",
        )
    )

    user_product_counts: dict[int, int] = {}
    latest_purchase: dict[int, object] = {}
    total_items = 0
    organic_items = 0

    for row in items_qs.iterator():
        pid = row["product_id"]
        user_product_counts[pid] = user_product_counts.get(pid, 0) + 1

        order_dt = row["producer_order__order__created_at"]
        if order_dt is not None:
            order_day = order_dt.date()
            if pid not in latest_purchase or order_day > latest_purchase[pid]:
                latest_purchase[pid] = order_day

        total_items += 1
        if row["product__organic_certified"]:
            organic_items += 1

    today = timezone.now().date()
    days_since: dict[int, int] = {
        pid: (today - last_day).days
        for pid, last_day in latest_purchase.items()
    }
    organic_preference = (
        organic_items / total_items if total_items else 0.0
    )

    return user_total_orders, user_product_counts, days_since, organic_preference


# Collaborative filtering
def _score_collaborative(
    account,
    available_products: list[Product],
) -> dict[int, float]:
    """Computes collaborative-filtering scores for an account.

    Uses cosine similarity between user purchase vectors to find
    products that similar users frequently buy.

    Implementation details:
    - User-item purchase counts are loaded from the OrderItem table.
    - Vectors are stored as sparse dicts (col_index → count) to avoid
      creating a full dense matrix.
    - Cosine similarity is computed with a sparse dot product
      so no external ML library is required.
    - Only the 20 most similar neighbours contribute to the final scores.
    - Scores are normalised to [0, 1] before blending.

    Returns:
        Mapping of product_id to a normalised CF score in [0.0, 1.0].
        Products with no CF signal receive a score of 0.0.
    """
    if not available_products:
        return {}

    product_ids = [p.id for p in available_products]
    col_index: dict[int, int] = {pid: i for i, pid in enumerate(product_ids)}

    # Load purchase counts for all users * available products
    rows = (
        OrderItem.objects
        .filter(product_id__in=product_ids)
        .values("producer_order__order__account_id", "product_id")
        .annotate(count=Count("id"))
    )

    user_vectors: dict[int, dict[int, float]] = {}
    for row in rows:
        uid = row["producer_order__order__account_id"]
        pid = row["product_id"]
        count = float(row["count"])
        if uid is None or pid not in col_index:
            continue
        if uid not in user_vectors:
            user_vectors[uid] = {}
        user_vectors[uid][col_index[pid]] = count

    target_id = account.id
    if target_id not in user_vectors:
        # no history, return zero CF contribution
        return {pid: 0.0 for pid in product_ids}

    target_vec = user_vectors[target_id]

    def _dot(a: dict[int, float], b: dict[int, float]) -> float:
        """Computes the sparse dot product, iterating over the shorter vector."""
        small, large = (a, b) if len(a) <= len(b) else (b, a)
        return sum(v * large.get(k, 0.0) for k, v in small.items())

    def _norm(vec: dict[int, float]) -> float:
        """Computes the L2 norm of a sparse vector."""
        return math.sqrt(sum(v * v for v in vec.values()))

    target_norm = _norm(target_vec)
    if target_norm == 0.0:
        return {pid: 0.0 for pid in product_ids}

    # Computes similarity with every other user
    similarities: list[tuple[float, dict[int, float]]] = []
    for uid, vec in user_vectors.items():
        if uid == target_id:
            continue
        other_norm = _norm(vec)
        if other_norm == 0.0:
            continue
        sim = _dot(target_vec, vec) / (target_norm * other_norm)
        similarities.append((sim, vec))

    # Keeps top 20 most similar neighbours
    similarities.sort(key=lambda x: x[0], reverse=True)
    top_neighbours = similarities[:20]

    if not top_neighbours:
        return {pid: 0.0 for pid in product_ids}

    total_sim = sum(sim for sim, _ in top_neighbours)
    if total_sim == 0.0:
        return {pid: 0.0 for pid in product_ids}

    # Weighted-average purchase counts across neighbours
    cf_scores: dict[int, float] = {}
    for sim, vec in top_neighbours:
        weight = sim / total_sim
        for col_i, count in vec.items():
            cf_scores[col_i] = cf_scores.get(col_i, 0.0) + weight * count

    # Normalise to [0, 1]
    max_score = max(cf_scores.values(), default=1.0) or 1.0
    col_to_pid = {i: pid for pid, i in col_index.items()}
    return {
        col_to_pid[col_i]: score / max_score
        for col_i, score in cf_scores.items()
    }



# Recommender service call
def _score_rows(rows: list[dict]) -> list[dict]:
    """POST feature rows to the recommender service and return scores.

    Returns:
        List of {"product_id": int, "reorder_probability": float} dicts 

    Raises:
        RecommenderError: If the HTTP request fails or the response body
            does not contain the expected scores list.
    """
    url = f"{settings.RECOMMENDER_SERVICE_URL.rstrip('/')}/score"
    try:
        response = requests.post(
            url,
            json={"rows": rows},
            timeout=settings.RECOMMENDER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RecommenderError(
            f"Recommender service call failed: {exc}"
        ) from exc

    payload = response.json()
    scores = payload.get("scores")
    if not isinstance(scores, list):
        raise RecommenderError(
            "Recommender service returned an invalid response."
        )
    return scores


# Explainability (XAI)
def _generate_reasons(feature_row: dict) -> list[str]:
    """Produce explanation tags for a single recommendation.

    Uses feature values already computed for the ML model
    Returns 1–3 concise reason strings that are given
    badge labels on the frontend recommendation card.

    Returns:
        List of 1–3 reason strings.
    """
    reasons: list[str] = []

    purchase_count = int(feature_row.get("user_product_purchase_count", 0))
    if purchase_count >= 5:
        reasons.append(f"Ordered {purchase_count}\u00d7 by you")
    elif purchase_count >= 1:
        reasons.append("Previously ordered")

    reorder_rate = float(feature_row.get("product_reorder_rate", 0.0))
    if reorder_rate > 0.5:
        reasons.append("Popular repeat purchase")

    total_purchases = int(feature_row.get("product_total_purchases", 0))
    if total_purchases >= 20 and "Popular repeat purchase" not in reasons:
        reasons.append("Frequently bought")

    # Ensure at least one reason is always present
    if not reasons:
        reasons.append("Matches your order history")

    return reasons[:3]


# Public API
_ML_WEIGHT = 0.65
_CF_WEIGHT = 0.35


def get_recommended_products(
    account,
    limit: int = 5,
) -> list[dict]:
    """Builds personalised product recommendations for an account.

    1. Filters available products — excludes out-of-season seasonal items.
    2. Computes global product statistics.
    3. Computes per-user statistics.
    4. Sends features to the recommender service and receive
       per-product reorder probabilities.
    5. Computes collaborative-filtering scores in-process.
    6. Combines ML and CF scores (65 % ML, 35 % CF) and rank.
    7. Generates XAI reason tags from the feature values.

    Returns:
        List of dicts, each containing:
        - "product" — the Product instance.
        - "reasons" — list of 1–3 explanation strings.
        - "reorder_probability" — final combined score (float).

    Raises:
        RecommenderError: If the service is unavailable.
    """
    all_available = list(
        Product.objects
        .filter(status="available")
        .select_related("category")
    )
    # exclude seasonal products that are currently out of season.
    # year-round products and in-season seasonal products are always included.
    available_products = [
        p for p in all_available
        if p.availability_mode != "seasonal" or _is_in_season(p)
    ]
    if not available_products:
        return []

    products_by_id: dict[int, Product] = {
        p.id: p for p in available_products
    }

    product_total_purchases, product_reorder_rate = (
        _build_global_product_stats()
    )

    (
        user_total_orders,
        user_product_counts,
        days_since,
        organic_preference,
    ) = _build_user_stats(account)

    # Builds feature rows for the recommender service and XAI lookup
    ml_rows: list[dict] = []
    feature_map: dict[int, dict] = {}

    for product in available_products:
        category_name = (
            product.category.name if product.category else "unknown"
        )

        days_since_purchase = days_since.get(product.id, 365)

        ml_row = {
            "product_id": product.id,
            "user_total_orders": user_total_orders,
            "product_total_purchases": product_total_purchases.get(
                product.id, 0
            ),
            "product_reorder_rate": product_reorder_rate.get(
                product.id, 0.0
            ),
            "user_product_purchase_count": user_product_counts.get(
                product.id, 0
            ),
            "days_since_last_purchase": days_since_purchase,
            "organic_preference": organic_preference,
            "category": category_name.lower(),
        }
        ml_rows.append(ml_row)
        feature_map[product.id] = ml_row

    # ML model scores
    ml_scores_raw = _score_rows(ml_rows)
    ml_by_pid: dict[int, float] = {
        s["product_id"]: s.get("reorder_probability", 0.0)
        for s in ml_scores_raw
        if s.get("product_id") is not None
    }

    # Collaborative-filtering scores 
    cf_by_pid = _score_collaborative(account, available_products)

    # Combine and rank 
    blended: list[dict] = [
        {
            "product_id": pid,
            "reorder_probability": (
                _ML_WEIGHT * ml_by_pid.get(pid, 0.0)
                + _CF_WEIGHT * cf_by_pid.get(pid, 0.0)
            ),
        }
        for pid in products_by_id
    ]
    ranked = sorted(
        blended,
        key=lambda s: s["reorder_probability"],
        reverse=True,
    )

    # Create result with XAI reasons
    result: list[dict] = []
    for entry in ranked[:limit]:
        pid = entry["product_id"]
        product = products_by_id[pid]
        result.append({
            "product": product,
            "reasons": _generate_reasons(feature_map[pid]),
            "reorder_probability": entry["reorder_probability"],
        })

    return result
