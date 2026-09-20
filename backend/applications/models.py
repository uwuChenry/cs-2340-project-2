from django.db import models

from jobs.models import JobPosting
from profiles.models import SeekerProfile


class Application(models.Model):
    """A seeker's application to one posting.

    This single row is what both sides of the product read. The seeker's tracker
    renders it as a progress rail; the recruiter's pipeline renders the same row
    as a Kanban card joined to the seeker's profile. There is deliberately no
    separate "candidate" table -- a candidate is an application plus a profile.
    """

    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        REVIEW = "review", "Under Review"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        CLOSED = "closed", "Closed"

    # Stage order drives the five-step rail and the pipeline columns.
    STAGE_ORDER = [
        Status.APPLIED,
        Status.REVIEW,
        Status.INTERVIEW,
        Status.OFFER,
        Status.CLOSED,
    ]

    applicant = models.ForeignKey(
        SeekerProfile,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    tailored_note = models.TextField(blank=True, max_length=400)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.APPLIED,
    )
    # Free text the recruiter sets, e.g. "Onsite loop Thu".
    next_action = models.CharField(max_length=200, blank=True, default="")

    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["applicant", "job"],
                name="one_application_per_job_seeker",
            )
        ]

    @property
    def stage_index(self):
        """Position in STAGE_ORDER, which is what the progress rail draws."""
        return self.STAGE_ORDER.index(self.status)

    def __str__(self):
        return f"{self.applicant} -> {self.job.title} ({self.get_status_display()})"


class ShortlistItem(models.Model):
    """A job a seeker saved to compare before applying.

    The prototype kept this in React state, so it vanished on refresh. Persisting
    it is what makes the compare table and "apply to all" survive a reload.
    """

    seeker = models.ForeignKey(
        SeekerProfile,
        on_delete=models.CASCADE,
        related_name="shortlist",
    )
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        related_name="shortlisted_by",
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["seeker", "job"],
                name="one_shortlist_entry_per_job",
            )
        ]

    def __str__(self):
        return f"{self.seeker} saved {self.job.title}"
