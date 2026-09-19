"""Serializers for seeker profiles.

There are deliberately two of these. OwnProfileSerializer is what a seeker sees
of themselves: everything, editable. PublicSeekerSerializer is what a recruiter
sees, and it honours the privacy switches by omitting values rather than relying
on the UI to hide them -- a hidden field that still ships over the wire is not
private.
"""

from rest_framework import serializers

from .models import (
    Education,
    Experience,
    ProfileLink,
    Project,
    SeekerProfile,
    Skill,
)


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name"]


class ExperienceSerializer(serializers.ModelSerializer):
    company = serializers.CharField(source="company_name")
    isCurrent = serializers.BooleanField(source="is_current", read_only=True)
    startDate = serializers.DateField(source="start_date")
    endDate = serializers.DateField(source="end_date", allow_null=True, required=False)

    class Meta:
        model = Experience
        fields = ["id", "company", "title", "description", "startDate", "endDate", "isCurrent"]


class EducationSerializer(serializers.ModelSerializer):
    fieldOfStudy = serializers.CharField(source="field_of_study", required=False, allow_blank=True)
    startYear = serializers.IntegerField(source="start_year", required=False, allow_null=True)
    graduationYear = serializers.IntegerField(
        source="graduation_year", required=False, allow_null=True,
    )

    class Meta:
        model = Education
        fields = ["id", "school", "degree", "fieldOfStudy", "startYear", "graduationYear"]


class ProfileLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileLink
        fields = ["id", "label", "url"]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description", "url"]


class PrivacySerializer(serializers.Serializer):
    """The four toggles on the profile screen."""

    name = serializers.BooleanField(source="show_full_name")
    contact = serializers.BooleanField(source="show_contact")
    current = serializers.BooleanField(source="show_current_employer")
    openToWork = serializers.BooleanField(source="open_to_work")


class OwnProfileSerializer(serializers.ModelSerializer):
    """The seeker's own profile: full contents, headline and privacy writable."""

    name = serializers.SerializerMethodField()
    email = serializers.CharField(source="user.email", read_only=True)
    initials = serializers.SerializerMethodField()

    skills = serializers.SerializerMethodField()
    experience = ExperienceSerializer(many=True, read_only=True)
    education = EducationSerializer(many=True, read_only=True)
    links = ProfileLinkSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    privacy = serializers.SerializerMethodField()

    openToRemote = serializers.BooleanField(source="open_to_remote", required=False)
    salaryExpectation = serializers.CharField(
        source="salary_expectation", required=False, allow_blank=True,
    )
    noticePeriod = serializers.CharField(
        source="notice_period", required=False, allow_blank=True,
    )

    class Meta:
        model = SeekerProfile
        fields = [
            "id", "name", "initials", "email", "headline", "about",
            "location", "latitude", "longitude", "openToRemote",
            "salaryExpectation", "noticePeriod",
            "skills", "experience", "education", "links", "projects", "privacy",
        ]
        # Identity and coordinates are not edited from this screen.
        read_only_fields = ["latitude", "longitude"]

    def get_name(self, profile):
        return profile.user.get_full_name() or profile.user.username

    def get_initials(self, profile):
        return "".join(w[0].upper() for w in self.get_name(profile).split() if w)[:2]

    def get_skills(self, profile):
        return [skill.name for skill in profile.skills.all()]

    def get_privacy(self, profile):
        return PrivacySerializer(profile).data

    def update(self, instance, validated_data):
        """Apply profile edits, including the nested privacy block."""
        privacy = self.initial_data.get("privacy") or {}
        privacy_fields = {
            "name": "show_full_name",
            "contact": "show_contact",
            "current": "show_current_employer",
            "openToWork": "open_to_work",
        }
        for key, field in privacy_fields.items():
            if key in privacy:
                setattr(instance, field, bool(privacy[key]))

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        skills = self.initial_data.get("skills")
        if skills is not None:
            instance.skills.set(
                Skill.objects.get_or_create(name=name)[0] for name in skills
            )
        return instance


class PublicSeekerSerializer(serializers.ModelSerializer):
    """What a recruiter is allowed to see.

    Every field below is gated on the seeker's own privacy switches. This is the
    only place those switches are enforced, so they must not be bypassed by
    serializing SeekerProfile directly anywhere in the recruiter flow.
    """

    name = serializers.CharField(source="display_name", read_only=True)
    role = serializers.CharField(source="headline", read_only=True)
    skills = serializers.SerializerMethodField()
    experience = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    currentEmployer = serializers.SerializerMethodField()
    openToWork = serializers.BooleanField(source="open_to_work", read_only=True)
    salaryExpectation = serializers.CharField(source="salary_expectation", read_only=True)
    noticePeriod = serializers.CharField(source="notice_period", read_only=True)

    class Meta:
        model = SeekerProfile
        fields = [
            "id", "name", "role", "location", "skills", "experience",
            "email", "currentEmployer", "openToWork",
            "salaryExpectation", "noticePeriod",
        ]

    def get_skills(self, profile):
        return [skill.name for skill in profile.skills.all()]

    def get_experience(self, profile):
        return ExperienceSerializer(profile.experience.all(), many=True).data

    def get_email(self, profile):
        return profile.user.email if profile.show_contact else None

    def get_currentEmployer(self, profile):
        if not profile.show_current_employer:
            return None
        current = profile.experience.filter(end_date__isnull=True).first()
        return current.company_name if current else None
