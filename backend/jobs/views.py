from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import JobPosting


def serialize_job(job):
    """Convert a job model into JSON React can display."""

    return {
        "id": job.id,
        "title": job.title,
        "companyName": job.recruiter.company_name,
        "location": f"{job.city}, {job.state}",
        "latitude": float(job.latitude) if job.latitude else None,
        "longitude": float(job.longitude) if job.longitude else None,
        "salaryMin": job.salary_min,
        "salaryMax": job.salary_max,
        "workArrangement": job.work_arrangement,
        "offersVisaSponsorship": job.offers_visa_sponsorship,
        "skills": list(job.skills.values_list("name", flat=True)),
    }


@require_GET
def job_list(request):
    """Return published jobs matching optional search filters."""

    jobs = JobPosting.objects.filter(
        moderation_status=JobPosting.ModerationStatus.PUBLISHED
    ).select_related("recruiter").prefetch_related("skills")

    title = request.GET.get("title", "").strip()
    location = request.GET.get("location", "").strip()
    skills = request.GET.get("skills", "").split(",")
    work_style = request.GET.get("work_arrangement", "")
    visa = request.GET.get("visa_sponsorship", "")

    if title:
        jobs = jobs.filter(title__icontains=title)

    if location:
        jobs = jobs.filter(
            Q(city__icontains=location) | Q(state__icontains=location)
        )

    for skill in [skill.strip() for skill in skills if skill.strip()]:
        jobs = jobs.filter(skills__name__iexact=skill)

    if work_style in JobPosting.WorkArrangement.values:
        jobs = jobs.filter(work_arrangement=work_style)

    if visa in {"true", "false"}:
        jobs = jobs.filter(offers_visa_sponsorship=(visa == "true"))

    return JsonResponse({"results": [serialize_job(job) for job in jobs.distinct()]})