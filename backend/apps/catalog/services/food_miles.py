from math import isfinite
from typing import Any

import requests
from django.conf import settings

from apps.catalog.models import Product
from apps.addresses.models import Address


class FoodMilesError(Exception):
    """Raised when food miles calculation fails."""


def meters_to_miles(meters: float) -> float:
    return round(meters / 1609.344, 2)


def get_business_postcode_for_account(account) -> str | None:
    """
    Return the producer business postcode for an account, if present.
    """
    if not account:
        return None

    address = (
        Address.objects.filter(
            account=account,
            address_type=Address.AddressType.BUSINESS,
        )
        .order_by("-is_default", "-created_at")
        .first()
    )

    if address and address.postcode:
        return address.postcode.strip().upper()

    return None


def get_delivery_postcode_for_account(account) -> str | None:
    """
    Return the best delivery postcode for an account.
    Prefers default delivery address, then most recent delivery address.
    """
    if not account:
        return None

    address = (
        Address.objects.filter(
            account=account,
            address_type=Address.AddressType.DELIVERY,
        )
        .order_by("-is_default", "-created_at")
        .first()
    )

    if address and address.postcode:
        return address.postcode.strip().upper()

    return None


def get_product_producer_postcode(product: Product) -> str:
    producer_account = getattr(product.producer, "account", None)
    postcode = get_business_postcode_for_account(producer_account)

    if not postcode:
        raise FoodMilesError("Producer business postcode is unavailable for this product.")

    return postcode


def get_customer_postcode_for_request(request) -> tuple[str, str]:
    """
    Returns (postcode, source)

    source:
    - manual   : user entered a postcode override in the UI
    - saved    : taken from the user's saved default/latest delivery address
    - fallback : taken from settings fallback postcode
    """
    manual_postcode = request.query_params.get("postcode")
    if manual_postcode:
        cleaned = manual_postcode.strip().upper()
        if cleaned:
            return cleaned, "manual"

    saved_postcode = get_delivery_postcode_for_account(request.user)
    if saved_postcode:
        return saved_postcode, "saved"

    fallback = settings.FOOD_MILES_FALLBACK_POSTCODE.strip().upper()
    return fallback, "fallback"


def geocode_postcode(postcode: str) -> dict[str, Any]:
    if not settings.GEOAPIFY_API_KEY:
        raise FoodMilesError("Geoapify API key is not configured.")

    if not postcode:
        raise FoodMilesError("Postcode is required for geocoding.")

    response = requests.get(
        "https://api.geoapify.com/v1/geocode/search",
        params={
            "text": postcode,
            "filter": "countrycode:gb",
            "limit": 1,
            "apiKey": settings.GEOAPIFY_API_KEY,
        },
        timeout=15,
    )
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])
    if not features:
        raise FoodMilesError(f"No geocoding result found for postcode '{postcode}'.")

    props = features[0].get("properties", {})
    lat = props.get("lat")
    lon = props.get("lon")

    if lat is None or lon is None or not isfinite(lat) or not isfinite(lon):
        raise FoodMilesError(f"Invalid coordinates returned for postcode '{postcode}'.")

    return {
        "postcode": postcode.strip().upper(),
        "lat": lat,
        "lon": lon,
        "formatted": props.get("formatted", postcode.strip().upper()),
    }


def flatten_coordinates(coords):
    """
    Flatten GeoJSON coordinates into a simple list of [lon, lat] pairs.
    Supports LineString and MultiLineString-style nesting.
    """
    flattened = []

    for item in coords:
        if not item:
            continue

        # Case: already a single coordinate pair like [lon, lat]
        if isinstance(item[0], (int, float)) and len(item) >= 2:
            flattened.append(item[:2])

        # Case: nested list, recurse one level
        elif isinstance(item[0], list):
            flattened.extend(flatten_coordinates(item))

    return flattened


def get_route(start: dict[str, Any], end: dict[str, Any]) -> dict[str, Any]:
    if not settings.GEOAPIFY_API_KEY:
        raise FoodMilesError("Geoapify API key is not configured.")

    response = requests.get(
        "https://api.geoapify.com/v1/routing",
        params={
            "waypoints": f"{start['lat']},{start['lon']}|{end['lat']},{end['lon']}",
            "mode": "drive",
            "details": "instruction_details",
            "apiKey": settings.GEOAPIFY_API_KEY,
        },
        timeout=20,
    )
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])
    if not features:
        raise FoodMilesError("No route found between the supplied postcodes.")

    feature = features[0]
    props = feature.get("properties", {})
    geometry = feature.get("geometry", {})

    distance_meters = props.get("distance")
    if distance_meters is None:
        raise FoodMilesError("Route distance was not returned by Geoapify.")

    coordinates = geometry.get("coordinates", [])
    if not coordinates:
        raise FoodMilesError("Route geometry was not returned by Geoapify.")

    flat_coordinates = flatten_coordinates(coordinates)
    if not flat_coordinates:
        raise FoodMilesError("Route geometry could not be flattened.")

    # Convert [lon, lat] to [lat, lon] for Leaflet
    polyline = [[lat, lon] for lon, lat in flat_coordinates]

    return {
        "distance_meters": distance_meters,
        "distance_miles": meters_to_miles(distance_meters),
        "polyline": polyline,
    }


def calculate_product_food_miles(product: Product, request) -> dict[str, Any]:
    producer_postcode = get_product_producer_postcode(product)
    customer_postcode, postcode_source = get_customer_postcode_for_request(request)

    producer_location = geocode_postcode(producer_postcode)
    customer_location = geocode_postcode(customer_postcode)
    route = get_route(producer_location, customer_location)

    distance_miles = route["distance_miles"]
    local_radius = settings.FOOD_MILES_LOCAL_RADIUS_MILES

    return {
        "product_id": product.id,
        "product_name": product.name,
        "producer_name": product.producer.company_name,
        "producer_postcode": producer_postcode,
        "customer_postcode": customer_postcode,
        "postcode_source": postcode_source,
        "distance_meters": route["distance_meters"],
        "distance_miles": distance_miles,
        "within_local_radius": distance_miles <= local_radius,
        "local_radius_miles": local_radius,
        "methodology": (
            "Road route calculated from the producer's business postcode "
            "to the customer's delivery postcode using Geoapify routing."
        ),
        "producer_location": producer_location,
        "customer_location": customer_location,
        "polyline": route["polyline"],
    }


def compare_product_food_miles(
    product: Product,
    request,
    limit: int = 4,
) -> dict[str, Any]:
    customer_postcode, postcode_source = get_customer_postcode_for_request(request)
    customer_location = geocode_postcode(customer_postcode)
    local_radius = settings.FOOD_MILES_LOCAL_RADIUS_MILES

    comparison_products = (
        Product.objects.select_related("producer__account", "category")
        .filter(category=product.category)
        .exclude(id=product.id)
        .order_by("name")[:limit]
    )

    all_products = [product, *comparison_products]
    results: list[dict[str, Any]] = []

    for item in all_products:
        try:
            producer_postcode = get_product_producer_postcode(item)
            producer_location = geocode_postcode(producer_postcode)
            route = get_route(producer_location, customer_location)
            distance_miles = route["distance_miles"]

            results.append(
                {
                    "id": item.id,
                    "name": item.name,
                    "image": item.image,
                    "producer_name": item.producer.company_name,
                    "producer_postcode": producer_postcode,
                    "distance_miles": distance_miles,
                    "within_local_radius": distance_miles <= local_radius,
                    "is_current_product": item.id == product.id,
                }
            )
        except FoodMilesError:
            continue

    results.sort(key=lambda x: x["distance_miles"])

    return {
        "customer_postcode": customer_postcode,
        "postcode_source": postcode_source,
        "local_radius_miles": local_radius,
        "results": results,
    }