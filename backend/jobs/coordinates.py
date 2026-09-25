from geopy.geocoders import Nominatim

# Nominatim's usage policy requires an identifying user agent. Its default 1s
# timeout is often too short, so a slow response doesn't count as "not found".
geolocator = Nominatim(user_agent="roster-2340-project-2", timeout=5)

def jobLocation(job):
    """Returns the (latitude, longitude) of the given job, or None if it is remote or cannot be found"""
    if job.work_arrangement == "remote":
        return None

    # The post form fills `address` with the first comma-separated part, which is
    # just the city when the recruiter only types "Atlanta, GA". Repeating the city
    # makes Nominatim miss, so it is dropped in that case.
    street = job.address if job.address.strip().lower() != job.city.strip().lower() else ""
    query = ", ".join(part.strip() for part in [street, job.city, job.state] if part and part.strip())
    if not query:
        return None

    try:
        location = geolocator.geocode(query, country_codes="us")
    except Exception:
        return None

    if not location:
        return None
    return (round(location.latitude, 6), round(location.longitude, 6))
