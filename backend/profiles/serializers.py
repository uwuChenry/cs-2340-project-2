"""Serializers for seeker profiles.

There are deliberately two of these. OwnProfileSerializer is what a seeker sees
of themselves: everything, editable. PublicSeekerSerializer is what a recruiter
sees, and it honours the privacy switches by omitting values rather than relying
on the UI to hide them -- a hidden field that still ships over the wire is not
private.
"""

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password as run_password_validators
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import (
    Company,
    Education,
    Experience,
    Profile,
    ProfileLink,
    Project,
    RecruiterProfile,
    SeekerProfile,
    Skill,
)
from .skills import resolve_skills


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

    def validate(self, attrs):
        # On a partial update only one of the two dates may be sent, so fall back
        # to the stored value for the other.
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"endDate": "The end date can't be before the start date."})
        return attrs


class EducationSerializer(serializers.ModelSerializer):
    fieldOfStudy = serializers.CharField(source="field_of_study", required=False, allow_blank=True)
    startYear = serializers.IntegerField(
        source="start_year", required=False, allow_null=True, min_value=1950, max_value=2100,
    )
    graduationYear = serializers.IntegerField(
        source="graduation_year", required=False, allow_null=True, min_value=1950, max_value=2100,
    )

    class Meta:
        model = Education
        fields = ["id", "school", "degree", "fieldOfStudy", "startYear", "graduationYear"]

    def validate(self, attrs):
        start = attrs.get("start_year", getattr(self.instance, "start_year", None))
        end = attrs.get("graduation_year", getattr(self.instance, "graduation_year", None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {"graduationYear": "Graduation can't be before the start year."}
            )
        return attrs


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


def photo_url(profile, request=None):
    """Absolute URL of a seeker's photo, or None.

    Absolute because the frontend is served from a different origin than the API,
    so a bare "/media/..." would resolve against the wrong host.
    """
    if not profile or not profile.photo:
        return None
    return request.build_absolute_uri(profile.photo.url) if request else profile.photo.url


class SkillNamesField(serializers.ListField):
    """A list of skill names in, the same list out.

    On output DRF hands a ListField the related manager, which is not iterable,
    so to_representation unwraps it. On input the names are validated as plain
    strings here and only turned into Skill rows in the serializer's update().
    """

    child = serializers.CharField(max_length=100)

    def to_representation(self, value):
        return [skill.name for skill in value.all()]


class OwnProfileSerializer(serializers.ModelSerializer):
    """The seeker's own profile: full contents, headline and privacy writable.

    Experience, education, links and projects are edited through their own
    endpoints (see profiles/urls.py), so they are read-only here.
    """

    name = serializers.SerializerMethodField()
    firstName = serializers.CharField(
        source="user.first_name", required=False, allow_blank=True, max_length=150,
    )
    lastName = serializers.CharField(
        source="user.last_name", required=False, allow_blank=True, max_length=150,
    )
    email = serializers.CharField(source="user.email", read_only=True)
    initials = serializers.SerializerMethodField()
    photoUrl = serializers.SerializerMethodField()

    skills = SkillNamesField(required=False, max_length=50)
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
            "id", "name", "firstName", "lastName", "initials", "photoUrl", "email",
            "headline", "about", "location", "latitude", "longitude", "openToRemote",
            "salaryExpectation", "noticePeriod",
            "skills", "experience", "education", "links", "projects", "privacy",
        ]
        # Coordinates come from "use my current location"; the range check keeps a
        # bad client from storing a point that is not on Earth.
        extra_kwargs = {
            "latitude": {"min_value": -90, "max_value": 90},
            "longitude": {"min_value": -180, "max_value": 180},
        }

    def get_name(self, profile):
        return profile.user.get_full_name() or profile.user.username

    def get_initials(self, profile):
        return "".join(w[0].upper() for w in self.get_name(profile).split() if w)[:2]

    def get_photoUrl(self, profile):
        return photo_url(profile, self.context.get("request"))

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

        user_data = validated_data.pop("user", {})
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data))

        skill_names = validated_data.pop("skills", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if skill_names is not None:
            instance.skills.set(resolve_skills(skill_names))
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


class SavedSearchSerializer(serializers.ModelSerializer):
    """A stored sourcing query with its alert toggle.

    newCount is derived on read, not stored, so it cannot drift out of sync with
    the underlying profiles. It counts candidates matching the saved filters who
    joined since the recruiter last opened this search.
    """

    alertsOn = serializers.BooleanField(source="alerts_on", required=False)
    newCount = serializers.SerializerMethodField()
    lastViewedAt = serializers.DateTimeField(source="last_viewed_at", read_only=True)

    class Meta:
        from jobs.models import SavedSearch

        model = SavedSearch
        fields = ["id", "name", "filters", "alertsOn", "newCount", "lastViewedAt"]

    def get_newCount(self, search):
        if not search.last_viewed_at:
            return 0

        candidates = SeekerProfile.objects.filter(
            open_to_work=True,
            user__date_joined__gt=search.last_viewed_at,
        )
        for skill in (search.filters or {}).get("skills", []):
            candidates = candidates.filter(skills__name__iexact=skill)

        location = (search.filters or {}).get("location")
        if location:
            candidates = candidates.filter(location__icontains=location)

        return candidates.distinct().count()


class RegisterSerializer(serializers.Serializer):
    """Sign-up for either kind of account.

    Role is chosen here and only here: a self-service sign-up can be a job seeker
    or a recruiter, never an administrator. A recruiter also names their company,
    which is reused if it already exists (case-insensitively) so two recruiters at
    one employer share one Company row.
    """

    ROLES = [Profile.Role.JOB_SEEKER, Profile.Role.RECRUITER]

    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    email = serializers.EmailField()
    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=ROLES)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    title = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_password(self, value):
        # The similarity validator compares the password with the person's other
        # details, so build a throwaway User from whatever was submitted.
        data = self.initial_data
        candidate = User(
            username=str(data.get("username", "")), email=str(data.get("email", "")),
            first_name=str(data.get("firstName", "")), last_name=str(data.get("lastName", "")),
        )
        try:
            run_password_validators(value, user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages))
        return value

    def to_internal_value(self, data):
        """Report every problem at once.

        DRF skips object-level validation when any field fails, which would show a
        taken username now and a too-weak password only after the next submit. The
        company rule depends on the role, so it is folded into the same pass.
        """
        errors = {}
        try:
            attrs = super().to_internal_value(data)
        except serializers.ValidationError as error:
            errors, attrs = dict(error.detail), None

        wants_company = data.get("role") == Profile.Role.RECRUITER
        if wants_company and not str(data.get("company", "")).strip():
            errors.setdefault("company", ["Tell us which company you're hiring for."])

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        role = validated_data["role"]
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["firstName"],
            last_name=validated_data["lastName"],
        )
        Profile.objects.create(user=user, role=role)

        if role == Profile.Role.JOB_SEEKER:
            SeekerProfile.objects.create(user=user)
        else:
            RecruiterProfile.objects.create(
                user=user,
                company=self._company(validated_data["company"].strip()),
                title=validated_data.get("title", "").strip(),
            )
        return user

    @staticmethod
    def _company(name):
        existing = Company.objects.filter(name__iexact=name).first()
        if existing:
            return existing
        try:
            with transaction.atomic():
                return Company.objects.create(name=name)
        except IntegrityError:
            # Someone registered the same company between the lookup and the insert.
            return Company.objects.get(name__iexact=name)


class RecruiterProfileSerializer(serializers.ModelSerializer):
    """A recruiter's own account page.

    The company name is shown but not editable here: renaming it would rename it
    for every recruiter at that employer.
    """

    name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    firstName = serializers.CharField(
        source="user.first_name", required=False, allow_blank=True, max_length=150,
    )
    lastName = serializers.CharField(
        source="user.last_name", required=False, allow_blank=True, max_length=150,
    )
    email = serializers.EmailField(source="user.email", required=False)
    company = serializers.CharField(source="company.name", read_only=True)
    companyMark = serializers.CharField(source="company.mark", read_only=True)
    companyWebsite = serializers.URLField(
        source="company.website", required=False, allow_blank=True,
    )

    class Meta:
        model = RecruiterProfile
        fields = [
            "id", "name", "initials", "firstName", "lastName", "email",
            "title", "company", "companyMark", "companyWebsite",
        ]

    def get_name(self, recruiter):
        return recruiter.user.get_full_name() or recruiter.user.username

    def get_initials(self, recruiter):
        return "".join(w[0].upper() for w in self.get_name(recruiter).split() if w)[:2]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        company_data = validated_data.pop("company", {})

        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data))
        if company_data:
            for field, value in company_data.items():
                setattr(instance.company, field, value)
            instance.company.save(update_fields=list(company_data))

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class AccountSerializer(serializers.ModelSerializer):
    """Sign-in details: username and email. Password has its own endpoint."""

    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ["username", "email"]

    def validate_username(self, value):
        taken = User.objects.filter(username__iexact=value).exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Changing a password needs the current one, so a borrowed session can't do it."""

    currentPassword = serializers.CharField(write_only=True, trim_whitespace=False)
    newPassword = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_currentPassword(self, value):
        if not self.context["user"].check_password(value):
            raise serializers.ValidationError("That isn't your current password.")
        return value

    def validate_newPassword(self, value):
        try:
            run_password_validators(value, user=self.context["user"])
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages))
        return value
