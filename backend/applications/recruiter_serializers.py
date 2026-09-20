"""Candidate serializers -- the recruiter's view of an application.

The prototype modelled a "candidate" as its own type, but a candidate is just an
Application joined to the applicant's SeekerProfile. These serializers do that
join, so there is one row of truth behind both the seeker's tracker and the
recruiter's pipeline.

Every field sourced from the seeker goes through the privacy switches on
SeekerProfile. Do not serialize SeekerProfile directly in a recruiter response.
"""

from rest_framework import serializers

from jobs.matching import coarse, skill_match_pct

from .models import Application


class CandidateSerializer(serializers.ModelSerializer):
    """One applicant card in the pipeline and the candidate list."""

    name = serializers.CharField(source="applicant.display_name", read_only=True)
    initials = serializers.SerializerMethodField()
    role = serializers.CharField(source="applicant.headline", read_only=True)
    location = serializers.CharField(source="applicant.location", read_only=True)

    seekerId = serializers.IntegerField(source="applicant.id", read_only=True)
    jobId = serializers.IntegerField(source="job.id", read_only=True)
    jobTitle = serializers.CharField(source="job.title", read_only=True)

    stage = serializers.CharField(source="get_status_display", read_only=True)
    stageIndex = serializers.IntegerField(source="stage_index", read_only=True)

    skills = serializers.SerializerMethodField()
    matchPct = serializers.SerializerMethodField()

    note = serializers.CharField(source="tailored_note", read_only=True)
    appliedAt = serializers.DateTimeField(source="applied_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id", "seekerId", "jobId", "jobTitle",
            "name", "initials", "role", "location",
            "status", "stage", "stageIndex",
            "skills", "matchPct", "note",
            "latitude", "longitude", "appliedAt", "updatedAt",
        ]

    def get_initials(self, application):
        name = application.applicant.display_name
        return "".join(w[0].upper() for w in name.split() if w)[:2]

    def get_skills(self, application):
        return [skill.name for skill in application.applicant.skills.all()]

    def get_matchPct(self, application):
        """Overlap between the posting's required skills and the applicant's.

        Measured against the job applied to, so the same person can score
        differently on two different openings.
        """
        job_skills = [skill.name for skill in application.job.skills.all()]
        return skill_match_pct(job_skills, self.get_skills(application))

    def get_latitude(self, application):
        return coarse(application.applicant.latitude)

    def get_longitude(self, application):
        return coarse(application.applicant.longitude)


class CandidateDetailSerializer(CandidateSerializer):
    """The candidate review sheet.

    Adds the facts grid, the experience list and the skill split. Contact details
    and current employer stay behind the seeker's privacy switches.
    """

    email = serializers.SerializerMethodField()
    currentEmployer = serializers.SerializerMethodField()
    salaryExpectation = serializers.CharField(
        source="applicant.salary_expectation", read_only=True,
    )
    noticePeriod = serializers.CharField(
        source="applicant.notice_period", read_only=True,
    )
    openToWork = serializers.BooleanField(
        source="applicant.open_to_work", read_only=True,
    )
    experience = serializers.SerializerMethodField()
    matchedSkills = serializers.SerializerMethodField()
    missingSkills = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()

    class Meta(CandidateSerializer.Meta):
        fields = CandidateSerializer.Meta.fields + [
            "email", "currentEmployer", "salaryExpectation", "noticePeriod",
            "openToWork", "experience", "matchedSkills", "missingSkills", "projects",
        ]

    def get_email(self, application):
        seeker = application.applicant
        return seeker.user.email if seeker.show_contact else None

    def get_currentEmployer(self, application):
        seeker = application.applicant
        if not seeker.show_current_employer:
            return None
        current = seeker.experience.filter(end_date__isnull=True).first()
        return current.company_name if current else None

    def get_experience(self, application):
        from profiles.serializers import ExperienceSerializer

        return ExperienceSerializer(
            application.applicant.experience.all(), many=True,
        ).data

    def get_matchedSkills(self, application):
        """Required skills this candidate has -- the accent chips in the sheet."""
        have = set(self.get_skills(application))
        return [s.name for s in application.job.skills.all() if s.name in have]

    def get_missingSkills(self, application):
        have = set(self.get_skills(application))
        return [s.name for s in application.job.skills.all() if s.name not in have]

    def get_projects(self, application):
        from profiles.serializers import ProjectSerializer

        return ProjectSerializer(application.applicant.projects.all(), many=True).data


class StageUpdateSerializer(serializers.ModelSerializer):
    """Moving a card between pipeline columns."""

    class Meta:
        model = Application
        fields = ["status", "next_action"]


class SourcedCandidateSerializer(serializers.Serializer):
    """A seeker surfaced by candidate search who has not applied to anything.

    Sourcing reaches profiles with no Application behind them, so this cannot
    reuse CandidateSerializer. Match is measured against a chosen target role.
    """

    seekerId = serializers.IntegerField(source="id", read_only=True)
    name = serializers.CharField(source="display_name", read_only=True)
    role = serializers.CharField(source="headline", read_only=True)
    location = serializers.CharField(read_only=True)
    openToWork = serializers.BooleanField(source="open_to_work", read_only=True)
    skills = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    matchPct = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    hasApplied = serializers.SerializerMethodField()

    def get_skills(self, seeker):
        return [skill.name for skill in seeker.skills.all()]

    def get_initials(self, seeker):
        return "".join(w[0].upper() for w in seeker.display_name.split() if w)[:2]

    def get_matchPct(self, seeker):
        target_skills = self.context.get("target_skills", [])
        return skill_match_pct(target_skills, self.get_skills(seeker))

    def get_latitude(self, seeker):
        return coarse(seeker.latitude)

    def get_longitude(self, seeker):
        return coarse(seeker.longitude)

    def get_hasApplied(self, seeker):
        return seeker.id in self.context.get("applicant_ids", set())
