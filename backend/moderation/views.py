from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from jobs.models import JobPosting
from profiles.models import Profile
from profiles.permissions import IsAdmin

from .models import Report
from .serializers import ReportSerializer


class ReportListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/reports/ for the signed-in user's submitted reports."""

    permission_classes = [IsAuthenticated]
    serializer_class = ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).select_related(
            "reported_user", "reported_job"
        )


class AdminUserSerializer(serializers.ModelSerializer):
    """Minimal user summary for the admin roster screen."""

    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role"]

    def get_role(self, user):
        profile = Profile.objects.filter(user=user).first()
        return profile.role if profile else None


class AdminJobSerializer(serializers.ModelSerializer):
    """Minimal job summary for the admin moderation list."""

    company = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = JobPosting
        fields = ["id", "title", "company", "status", "city", "state", "posted_at"]


class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.select_related("profile").all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        user = get_object_or_404(User.objects.select_related("profile"), pk=pk)
        return Response(AdminUserSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(User.objects.select_related("profile"), pk=pk)
        if user == request.user:
            return Response({"role": ["Administrators cannot change their own role."]}, status=400)

        role = request.data.get("role")
        if role not in Profile.Role.values:
            return Response({"role": ["Choose a valid user role."]}, status=400)

        profile = Profile.objects.filter(user=user).first()
        if profile is None:
            profile = Profile.objects.create(user=user, role=role)
        else:
            profile.role = role
            profile.save(update_fields=["role"])
        return Response(AdminUserSerializer(user).data)


class AdminJobListView(generics.ListAPIView):
    queryset = JobPosting.objects.select_related("company", "recruiter__user").all()
    serializer_class = AdminJobSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class AdminJobModerationView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        job = get_object_or_404(JobPosting.objects.select_related("company", "recruiter__user"), pk=pk)
        status_value = request.data.get("status")
        if status_value is not None and status_value not in JobPosting.Status.values:
            return Response({"status": ["Choose a valid job status."]}, status=400)

        if status_value is not None:
            job.status = status_value

        reason = (request.data.get("reason") or "").strip()
        if reason:
            Report.objects.create(
                reporter=request.user,
                reported_job=job,
                reason=reason,
                status=Report.Status.RESOLVED,
                reviewed_by=request.user,
            )

        job.save(update_fields=["status", "updated_at"])
        return Response({
            "id": job.id,
            "title": job.title,
            "status": job.status,
            "reason": reason,
        })

    def delete(self, request, pk):
        job = get_object_or_404(JobPosting.objects.select_related("company", "recruiter__user"), pk=pk)
        reason = (request.data.get("reason") or "Removed by administrator").strip()
        Report.objects.create(
            reporter=request.user,
            reported_job=job,
            reason=reason,
            status=Report.Status.RESOLVED,
            reviewed_by=request.user,
        )
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
