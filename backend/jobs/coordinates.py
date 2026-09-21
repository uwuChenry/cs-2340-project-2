from geopy.geocoders import Nominatim
geolocator = Nominatim(user_agent="roster-2340-project-2")

def jobLocation(job):
    """Returns the coordinates of the given job. If job cannot be found, returns None"""
    if job.work_arrangement == "remote":
        return None
    
    address = " ".join(component for component in [job.address, job.city, job.state] if component)
    try:
        location = geolocator.geocode(address)
    except Exception:
        return None
    
    if not location:
        return None
    return (round(location.latitude, 6), round(location.longitude, 6))
        