from math import isfinite
import requests


class GeoapifyError(Exception):
    """Raised when Geoapify geocoding or routing fails."""


def geocode_postcode(postcode: str, api_key: str) -> dict:
    if not postcode:
        raise GeoapifyError("Postcode is required for geocoding.")

    response = requests.get(
        "https://api.geoapify.com/v1/geocode/search",
        params={
            "text": postcode.strip(),
            "filter": "countrycode:gb",
            "limit": 1,
            "apiKey": api_key,
        },
        timeout=15,
    )
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])
    if not features:
        raise GeoapifyError(f"No geocoding result found for postcode '{postcode}'.")

    props = features[0].get("properties", {})

    lat = props.get("lat")
    lon = props.get("lon")

    if lat is None or lon is None or not isfinite(lat) or not isfinite(lon):
        raise GeoapifyError(f"Invalid coordinates returned for postcode '{postcode}'.")

    return {
        "postcode": postcode.strip().upper(),
        "lat": lat,
        "lon": lon,
        "formatted": props.get("formatted", postcode.strip().upper()),
    }


def get_route(start: dict, end: dict, api_key: str) -> dict:
    response = requests.get(
        "https://api.geoapify.com/v1/routing",
        params={
            "waypoints": f"{start['lat']},{start['lon']}|{end['lat']},{end['lon']}",
            "mode": "drive",
            "details": "instruction_details",
            "apiKey": api_key,
        },
        timeout=20,
    )
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])
    if not features:
        raise GeoapifyError("No route found between the supplied postcodes.")

    feature = features[0]
    props = feature.get("properties", {})
    geometry = feature.get("geometry", {})

    distance_meters = props.get("distance")
    if distance_meters is None:
        raise GeoapifyError("Route distance was not returned by Geoapify.")

    coordinates = geometry.get("coordinates", [])
    if not coordinates:
        raise GeoapifyError("Route geometry was not returned by Geoapify.")

    # GeoJSON is [lon, lat] - convert to [lat, lon] for Leaflet
    polyline = [[lat, lon] for lon, lat in coordinates]

    return {
        "distance_meters": distance_meters,
        "distance_miles": meters_to_miles(distance_meters),
        "polyline": polyline,
    }


def meters_to_miles(meters: float) -> float:
    return round(meters / 1609.344, 2)