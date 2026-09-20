"""Serializers for applications and the shortlist."""

from rest_framework import serializers

from jobs.serializers import JobPostingSerializer

from .models import Application, ShortlistItem


class ApplicationSerializer(serializers.ModelSerializer):
    """One row of the seeker's tracker.

    stageIndex is the position in Application.STAGE_ORDER, which is exactly what
    the five-step progress rail draws.
    """

    title = serializers.CharField(source="job.title", read_only=True)
    company = serializers.CharField(source="job.company.name", read_only=True)
    companyMark = serializers.CharField(source="job.company.mark", read_only=True)
    logoBg = serializers.CharField(source="job.company.logo_bg", read_only=True)
    location = serializers.CharField(source="job.location", read_only=True)

    jobId = serializers.IntegerField(source="job.id", read_only=True)
    stage = serializers.CharField(source="get_status_display", read_only=True)
    stageIndex = serializers.IntegerField(source="stage_index", read_only=True)
    nextAction = serializers.CharField(source="next_action", read_only=True)

    appliedAt = serializers.DateTimeField(source="applied_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    note = serializers.CharField(source="tailored_note", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id", "jobId", "title", "company", "companyMark", "logoBg", "location",
            "status", "stage", "stageIndex", "nextAction", "note",
            "appliedAt", "updatedAt",
        ]


class ApplySerializer(serializers.Serializer):
    """Input for applying to one job."""

    job = serializers.IntegerField()
    note = serializers.CharField(
        required=False, allow_blank=True, max_length=400,
    )


class ApplyAllSerializer(serializers.Serializer):
    """Input for 'Apply to all' from the shortlist.

    Omitting jobs means "everything currently on my shortlist", which is what the
    button actually does.
    """

    jobs = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True,
    )


class ShortlistItemSerializer(serializers.ModelSerializer):
    """A saved job, with the full posting inlined for the compare table."""

    job = JobPostingSerializer(read_only=True)
    addedAt = serializers.DateTimeField(source="added_at", read_only=True)

    class Meta:
        model = ShortlistItem
        fields = ["id", "job", "addedAt"]
