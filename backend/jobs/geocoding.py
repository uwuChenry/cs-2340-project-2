"""Turns a posting's typed address into coordinates (story 18).

Uses OpenStreetMap's Nominatim search API: free, no API key, no new dependency
(stdlib urllib is enough for one GET request). Nominatim's usage policy
(https://operations.osmfoundation.org/policies/nominatim/) asks for a
descriptive User-Agent and no more than ~1 request/second, both of which are a
non-issue here since this only runs once per job-posting save.

Geocoding is best-effort. A posting always has to be saveable even if the
address can't be resolved -- the same "unknown coordinates are not an error"
stance the rest of the project takes for jobs and seekers with no lat/long
(see JobsMapPanel and the radius filter, which both just skip pinless rows).
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "CareerConnect/1.0 (CS 2340 course project; contact via GitHub repo)"
TIMEOUT_SECONDS = 5


def geocode(address: str, city: str, state: str) -> tuple[float, float] | None:
    """Best-effort (latitude, longitude) for a free-text address, or None.

    Never raises: a network error, timeout, or "no match" all just mean the
    posting keeps null coordinates, same as it does today.
    """
    query = ", ".join(part.strip() for part in (address, city, state) if part and part.strip())
    if not query:
        return None

    params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1})
    request = urllib.request.Request(
        f"{NOMINATIM_URL}?{params}",
        headers={"User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            results = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        logger.warning("Geocoding failed for %r: %s", query, error)
        return None

    if not results:
        return None

    try:
        return float(results[0]["lat"]), float(results[0]["lon"])
    except (KeyError, TypeError, ValueError):
        return None