"""Google Maps / Places lookup adapter with safe local fallback."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.logging_setup import get_logger

log = get_logger(__name__)


def find_print_hub(*, location: dict[str, Any]) -> dict[str, Any] | None:
    settings = get_settings()
    api_key = settings.google_maps_api_key
    if not api_key:
        log.info("maps_lookup_skipped_no_api_key")
        return None

    query_parts = [
        settings.google_places_keyword,
        location.get("district"),
        location.get("state"),
        location.get("pincode"),
    ]
    text_query = ", ".join(part for part in query_parts if part)
    if not text_query:
        return None

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={
                    "query": text_query,
                    "key": api_key,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:  # noqa: BLE001
        log.warning("maps_lookup_failed", error=str(exc))
        return None

    results = payload.get("results") or []
    if not results:
        return None

    top = results[0]
    return {
        "name": top.get("name"),
        "category": "maps_place",
        "address": top.get("formatted_address"),
        "maps_query": text_query,
        "place_id": top.get("place_id"),
        "rating": top.get("rating"),
        "open_now": ((top.get("opening_hours") or {}).get("open_now")),
    }
