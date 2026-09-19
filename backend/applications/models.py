from django.db import models

from jobs.models import JobPosting
from profiles.models import JobSeekerProfile


class Application(models.Model):
    """A job seeker's application to one specific job posting."""

    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        REVIEW = "review", "Under Review"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        CLOSED = "closed", "Closed"

    applicant = models.ForeignKey(
        JobSeekerProfile,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    tailored_note = models.TextField(blank=True)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.APPLIED,
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # A seeker may apply to a particular job only once.
        constraints = [
            models.UniqueConstraint(
                fields=["applicant", "job"],
                name="one_application_per_job_seeker",
            )
        ]