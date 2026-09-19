"""Derived values the frontend used to compute from mock data.

The prototype worked these out in lib/derive.ts because all the data was already
in the browser. Now that a seeker's skills live server-side, the server is the
only place that can compute them, so they belong here.

Nothing in this module is stored on a model -- these are recomputed per request,
which is what the design handoff calls for.
"""

from math import asin, cos, radians, sin, sqrt

# A job clearing this share of its required skills counts as a recommendation.
RECOMMENDATION_THRESHOLD = 75

EARTH_RADIUS_MILES = 3958.8


def skill_match_pct(job_skill_names, seeker_skill_names):
    """Share of a job's required skills the seeker has, 0-100.

    Mirrors skillMatchPct in lib/derive.ts: the denominator is the job's skill
    count, so a job asking for one skill the seeker has scores 100.
    """
    job_skills = set(job_skill_names)
    if not job_skills:
        return 0
    have = job_skills & set(seeker_skill_names)
    return round(len(have) / len(job_skills) * 100)


def is_recommended(pct):
    return pct >= RECOMMENDATION_THRESHOLD


def haversine_miles(lat1, lon1, lat2, lon2):
    """Great-circle distance in miles, or None if either point is unknown."""
    if None in (lat1, lon1, lat2, lon2):
        return None
    lat1, lon1, lat2, lon2 = (radians(float(v)) for v in (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * asin(sqrt(a))


def distance_miles(job, seeker):
    """Miles between a seeker and a posting.

    Returns 0 for remote roles, matching the prototype's convention where a
    distance of 0 means "anywhere" rather than "next door". Returns None when
    either side has no coordinates, so the UI can omit the label entirely.
    """
    from jobs.models import JobPosting

    if job.work_arrangement == JobPosting.WorkArrangement.REMOTE:
        return 0
    if seeker is None:
        return None
    miles = haversine_miles(
        job.latitude, job.longitude, seeker.latitude, seeker.longitude
    )
    return None if miles is None else round(miles, 1)
