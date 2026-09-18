from django.db import models


class Skill(models.Model):
    """A reusable skill that can be required by many job postings."""

    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class JobPosting(models.Model):
    """A job that recruiters can publish and seekers can search."""

    class WorkArrangement(models.TextChoices):
        REMOTE = "remote", "Remote"
        HYBRID = "hybrid", "Hybrid"
        ON_SITE = "on_site", "On-site"

    title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    description = models.TextField()

    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)

    # Coordinates will later allow the frontend map to place a job marker.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    work_arrangement = models.CharField(
        max_length=10,
        choices=WorkArrangement.choices,
        default=WorkArrangement.ON_SITE,
    )
    offers_visa_sponsorship = models.BooleanField(default=False)

    # A job can require many skills; each skill can belong to many jobs.
    skills = models.ManyToManyField(Skill, related_name="job_postings", blank=True)
    posted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} at {self.company_name}"