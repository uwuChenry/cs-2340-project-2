"""Serializers for job postings.

Two conventions the frontend adapter relies on:

* Timestamps go out as ISO 8601, never as "2d ago". Relative phrasing is a
  presentation choice and belongs in the UI.
* Salaries go out in whole dollars, the same unit the column stores. The search
  UI shows thousands; that division happens in the frontend.
"""

from rest_framework import serializers

from .matching import distance_miles, is_recommended, skill_match_pct
from .models import JobPosting


class JobPostingSerializer(serializers.ModelSerializer):
    """A posting as the search list and map need it."""

    company = serializers.CharField(source="company.name", read_only=True)
    companyMark = serializers.CharField(source="company.mark", read_only=True)
    logoBg = serializers.CharField(source="company.logo_bg", read_only=True)

    location = serializers.CharField(read_only=True)
    setup = serializers.CharField(source="work_arrangement", read_only=True)
    visa = serializers.BooleanField(source="offers_visa_sponsorship", read_only=True)

    salaryMin = serializers.IntegerField(source="salary_min", read_only=True)
    salaryMax = serializers.IntegerField(source="salary_max", read_only=True)

    latitude = serializers.FloatField(read_only=True)
    longitude = serializers.FloatField(read_only=True)

    postedAt = serializers.DateTimeField(source="posted_at", read_only=True)

    skills = serializers.SerializerMethodField()
    matchPct = serializers.SerializerMethodField()
    recommended = serializers.SerializerMethodField()
    distanceMi = serializers.SerializerMethodField()
    shortlisted = serializers.SerializerMethodField()
    applied = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = [
            "id", "title", "company", "companyMark", "logoBg",
            "location", "city", "state", "address", "latitude", "longitude",
            "salaryMin", "salaryMax", "setup", "visa",
            "level", "team_size", "description",
            "skills", "matchPct", "recommended", "distanceMi",
            "shortlisted", "applied", "postedAt",
        ]

    def get_skills(self, job):
        return [skill.name for skill in job.skills.all()]

    def get_matchPct(self, job):
        return skill_match_pct(self.get_skills(job), self._seeker_skills())

    def get_recommended(self, job):
        return is_recommended(self.get_matchPct(job))

    def get_distanceMi(self, job):
        return distance_miles(job, self.context.get("seeker"))

    def get_shortlisted(self, job):
        return job.id in self.context.get("shortlisted_ids", set())

    def get_applied(self, job):
        return job.id in self.context.get("applied_ids", set())

    def _seeker_skills(self):
        """Seeker skill names, resolved once per request by the view."""
        return self.context.get("seeker_skills", [])


class JobPostingDetailSerializer(JobPostingSerializer):
    """The job sheet. Adds the fields only the detail view shows."""

    companyWebsite = serializers.CharField(source="company.website", read_only=True)
    matchedSkills = serializers.SerializerMethodField()

    class Meta(JobPostingSerializer.Meta):
        fields = JobPostingSerializer.Meta.fields + ["companyWebsite", "matchedSkills"]

    def get_matchedSkills(self, job):
        """Which required skills the seeker has.

        The job sheet styles matching skills as accent chips and the rest as
        neutral, so it needs the split rather than just the percentage.
        """
        have = set(self._seeker_skills())
        return [name for name in self.get_skills(job) if name in have]
