from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reportedJob = serializers.PrimaryKeyRelatedField(
        source="reported_job",
        queryset=Report._meta.get_field("reported_job").remote_field.model.objects.all(),
        required=False,
        allow_null=True,
    )
    reportedUser = serializers.PrimaryKeyRelatedField(
        source="reported_user",
        queryset=Report._meta.get_field("reported_user").remote_field.model.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Report
        fields = ["id", "reportedJob", "reportedUser", "reason", "details", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]

    def validate(self, attrs):
        job = attrs.get("reported_job")
        user = attrs.get("reported_user")
        if (job is None) == (user is None):
            raise serializers.ValidationError("Choose exactly one job or user to report.")
        if user is not None and user == self.context["request"].user:
            raise serializers.ValidationError("You cannot report your own account.")
        return attrs

    def create(self, validated_data):
        return Report.objects.create(
            reporter=self.context["request"].user,
            **validated_data,
        )