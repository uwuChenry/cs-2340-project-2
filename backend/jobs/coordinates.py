"""Turns a job posting into map coordinates.

This is the job-level rule (what to look up, and when not to). The actual
network call lives in geocoding.py, so there is only one Nominatim client in
the project.
"""

from .geocoding import geocode


def jobLocation(job):
    """Returns the (latitude, longitude) of the given job, or None if it is remote or cannot be found"""
    if job.work_arrangement == "remote":
        return None

    # The post form fills `address` with the first comma-separated part, which is
    # just the city when the recruiter only types "Atlanta, GA". Repeating the city
    # makes Nominatim miss, so it is dropped in that case.
    address = job.address or ""
    city = job.city or ""
    street = address if address.strip().lower() != city.strip().lower() else ""

    location = geocode(street, city, job.state or "")
    if location is None:
        return None
    return (round(location[0], 6), round(location[1], 6))
