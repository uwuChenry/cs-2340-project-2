from django.contrib.auth.models import User
from django.db import models


class Skill(models.Model):
    """A professional skill.

    This is the one canonical skill table on the platform: both job postings and
    seeker profiles point at it. Matching a seeker's skills against a posting's
    required skills is what drives the match badge, the recommendation banner and
    candidate ranking, so the two sides have to share rows for any of that to work.
    """

    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Profile(models.Model):
    """Platform-level account data hanging off Django's own User.

    Role lives here rather than on a swapped-in custom user model because the
    project already has users and legacy apps with foreign keys to auth.User.
    Everything role-independent belongs here too, so the join earns its keep.
    """

    class Role(models.TextChoices):
        JOB_SEEKER = "job_seeker", "Job Seeker"
        RECRUITER = "recruiter", "Recruiter"
        ADMIN = "admin", "Administrator"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.JOB_SEEKER)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_seeker(self):
        return self.role == self.Role.JOB_SEEKER

    @property
    def is_recruiter(self):
        return self.role == self.Role.RECRUITER

    def __str__(self):
        return f"{self.user.username}: {self.get_role_display()}"


class Company(models.Model):
    """An employer. Job postings and recruiters both point here.

    Two recruiters at the same company must show candidates one consistent
    identity, which is why the display colour lives here and not on the posting.
    """

    name = models.CharField(max_length=200, unique=True)
    website = models.URLField(blank=True)
    # Background colour behind the company initials in the UI's company mark.
    logo_bg = models.CharField(max_length=7, default="#1A1917")

    class Meta:
        verbose_name_plural = "companies"
        ordering = ["name"]

    @property
    def mark(self):
        """Two-letter initials the frontend draws in the company square."""
        words = [w for w in self.name.split() if w]
        if len(words) >= 2:
            return (words[0][0] + words[1][0]).upper()
        return self.name[:2].upper()

    def __str__(self):
        return self.name


class SeekerProfile(models.Model):
    """A job seeker's professional profile."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="seeker_profile",
    )
    headline = models.CharField(max_length=200, blank=True)
    about = models.TextField(blank=True)

    location = models.CharField(max_length=150, blank=True)
    # Needed to measure distance to a posting; the seeker is one end of that line.
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    open_to_remote = models.BooleanField(default=True)

    skills = models.ManyToManyField(Skill, blank=True, related_name="seekers")

    # Shown to a recruiter reviewing an application.
    salary_expectation = models.CharField(max_length=60, blank=True)
    notice_period = models.CharField(max_length=60, blank=True)

    # Privacy switches. These gate what the recruiter-facing serializer emits --
    # hiding a field in the UI alone would still ship the value over the wire.
    show_full_name = models.BooleanField(default=True)
    show_contact = models.BooleanField(default=False)
    show_current_employer = models.BooleanField(default=True)
    open_to_work = models.BooleanField(default=True)

    # Resized and re-encoded on upload (see profiles/photos.py), so what is stored
    # is always a small square JPEG with no embedded metadata.
    photo = models.ImageField(upload_to="avatars/", blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    @property
    def display_name(self):
        """Full name, or initials when the seeker has hidden it."""
        full = self.user.get_full_name() or self.user.username
        if self.show_full_name:
            return full
        return "".join(word[0].upper() for word in full.split() if word)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Experience(models.Model):
    """One work-history entry on a seeker's profile."""

    profile = models.ForeignKey(
        SeekerProfile,
        on_delete=models.CASCADE,
        related_name="experience",
    )
    company_name = models.CharField(max_length=200)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    # Null end date means this is the seeker's current role.
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-start_date"]

    @property
    def is_current(self):
        return self.end_date is None

    def __str__(self):
        return f"{self.title} at {self.company_name}"


class Education(models.Model):
    """One education entry on a seeker's profile."""

    profile = models.ForeignKey(
        SeekerProfile,
        on_delete=models.CASCADE,
        related_name="education",
    )
    school = models.CharField(max_length=200)
    degree = models.CharField(max_length=200)
    field_of_study = models.CharField(max_length=200, blank=True)
    start_year = models.PositiveIntegerField(null=True, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-graduation_year"]

    def __str__(self):
        return f"{self.degree}, {self.school}"


class ProfileLink(models.Model):
    """An external professional link, such as a portfolio or GitHub."""

    profile = models.ForeignKey(
        SeekerProfile,
        on_delete=models.CASCADE,
        related_name="links",
    )
    label = models.CharField(max_length=50)
    url = models.URLField()

    def __str__(self):
        return self.label


class Project(models.Model):
    """A portfolio project. Recruiter candidate search matches on these keywords."""

    profile = models.ForeignKey(
        SeekerProfile,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)

    def __str__(self):
        return self.name


class RecruiterProfile(models.Model):
    """A recruiter identity. Owns job postings and candidate searches."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="recruiter_profile",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="recruiters",
    )
    title = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"{self.user.username} at {self.company.name}"
