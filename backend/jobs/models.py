from django.contrib.auth.models import User
from django.db import models

from profiles.models import Company, RecruiterProfile, Skill


class JobPosting(models.Model):
    """A role a recruiter publishes and seekers search."""

    class WorkArrangement(models.TextChoices):
        REMOTE = "remote", "Remote"
        HYBRID = "hybrid", "Hybrid"
        ON_SITE = "on_site", "On-site"

    class Status(models.TextChoices):
        # "Save draft" and "Publish opening" on the post-a-role screen.
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CLOSED = "closed", "Closed"

    recruiter = models.ForeignKey(
        RecruiterProfile,
        on_delete=models.CASCADE,
        related_name="postings",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="postings",
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    level = models.CharField(max_length=60, blank=True, default="")
    team_size = models.CharField(max_length=60, blank=True, default="")

    address = models.CharField(max_length=250, blank=True, default="")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Stored in whole dollars. The UI shows thousands; that conversion is the
    # frontend's job so the database keeps one unambiguous unit.
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)

    work_arrangement = models.CharField(
        max_length=10,
        choices=WorkArrangement.choices,
        default=WorkArrangement.ON_SITE,
    )
    offers_visa_sponsorship = models.BooleanField(default=False)

    skills = models.ManyToManyField(Skill, related_name="job_postings", blank=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    posted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-posted_at"]
        indexes = [
            # Every seeker search filters on status first.
            models.Index(fields=["status", "-posted_at"]),
        ]

    @property
    def location(self):
        if self.work_arrangement == self.WorkArrangement.REMOTE:
            return "Remote (US)"
        return f"{self.city}, {self.state}".strip(", ")

    def __str__(self):
        return f"{self.title} at {self.company.name}"


class SavedSearch(models.Model):
    """A stored query with an alert toggle.

    Recruiters save candidate searches; seekers save job searches. The filter
    payload is free-form JSON because the two sides filter on different fields.
    """

    class Kind(models.TextChoices):
        JOBS = "jobs", "Job search"
        CANDIDATES = "candidates", "Candidate search"

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="saved_searches",
    )
    kind = models.CharField(max_length=12, choices=Kind.choices)
    name = models.CharField(max_length=200)
    filters = models.JSONField(default=dict, blank=True)
    alerts_on = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    # "6 new matches" counts rows created since the search was last opened,
    # so the count stays derived rather than becoming a column to keep in sync.
    last_viewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "saved searches"

    def __str__(self):
        return self.name
