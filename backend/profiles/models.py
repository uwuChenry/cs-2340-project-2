from django.contrib.auth.models import User
from django.db import models


class Skill(models.Model):
    """A reusable professional skill shared by profiles and jobs."""

    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class UserRole(models.Model):
    """Stores a platform role without replacing Django's existing User model."""

    class Role(models.TextChoices):
        JOB_SEEKER = "job_seeker", "Job Seeker"
        RECRUITER = "recruiter", "Recruiter"
        ADMIN = "admin", "Administrator"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="role")
    role = models.CharField(max_length=20, choices=Role.choices)

    def __str__(self):
        return f"{self.user.username}: {self.get_role_display()}"


class JobSeekerProfile(models.Model):
    """A professional profile that recruiters can search."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="job_seeker_profile",
    )
    headline = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=150, blank=True)
    about = models.TextField(blank=True)
    skills = models.ManyToManyField(Skill, blank=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Education(models.Model):
    """One education entry shown on a job seeker's profile."""

    profile = models.ForeignKey(
        JobSeekerProfile,
        on_delete=models.CASCADE,
        related_name="education",
    )
    school = models.CharField(max_length=200)
    degree = models.CharField(max_length=200)
    field_of_study = models.CharField(max_length=200, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)


class WorkExperience(models.Model):
    """One work-experience entry shown on a job seeker's profile."""

    profile = models.ForeignKey(
        JobSeekerProfile,
        on_delete=models.CASCADE,
        related_name="work_experience",
    )
    company = models.CharField(max_length=200)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)


class ProfileLink(models.Model):
    """An external professional link, such as LinkedIn, GitHub, or a portfolio."""

    profile = models.ForeignKey(
        JobSeekerProfile,
        on_delete=models.CASCADE,
        related_name="links",
    )
    label = models.CharField(max_length=50)
    url = models.URLField()


class Project(models.Model):
    """A portfolio project that recruiters can use in candidate search."""

    profile = models.ForeignKey(
        JobSeekerProfile,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)


class RecruiterProfile(models.Model):
    """A recruiter identity used to own job postings."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="recruiter_profile",
    )
    company_name = models.CharField(max_length=200)
    company_website = models.URLField(blank=True)