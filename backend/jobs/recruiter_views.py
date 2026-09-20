"""Recruiter-side endpoints: managing openings and their pipelines."""

from collections import defaultdict

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from applications.recruiter_serializers import (
    CandidateDetailSerializer,
    CandidateSerializer,
    StageUpdateSerializer,
)
from profiles.permissions import RecruiterContextMixin

from .matching import coarse
from .models import JobPosting
from .serializers import RecruiterJobSerializer


class RecruiterJobListView(RecruiterContextMixin, generics.ListCreateAPIView):
    """GET and POST /api/recruiter/jobs/ -- the recruiter's own openings.

    POST is the post-a-role form. Sending status 'draft' is "Save draft";
    'published' is "Publish opening".
    """

    serializer_class = RecruiterJobSerializer
    pagination_class = None

    def get_queryset(self):
        # Scoped to the requesting recruiter, including drafts, which never
        # appear in seeker search.
        return self.own_jobs().select_related("company").prefetch_related("skills")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["recruiter"] = self.get_recruiter()
        return context


class RecruiterJobDetailView(RecruiterContextMixin, generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH and DELETE /api/recruiter/jobs/<id>/."""

    serializer_class = RecruiterJobSerializer

    def get_queryset(self):
        return self.own_jobs().select_related("company").prefetch_related("skills")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["recruiter"] = self.get_recruiter()
        return context


class PipelineView(RecruiterContextMixin, APIView):
    """GET /api/recruiter/jobs/<id>/pipeline/ -- applicants grouped by stage.

    Returns every stage, including empty ones, so the board always renders its
    five columns without the frontend having to fill gaps.
    """

    def get(self, request, pk):
        job = get_object_or_404(self.own_jobs(), pk=pk)
        applications = (
            Application.objects
            .filter(job=job)
            .select_related("applicant", "applicant__user", "job")
            .prefetch_related("applicant__skills", "job__skills")
        )

        by_status = defaultdict(list)
        for row in applications:
            by_status[row.status].append(row)

        columns = [
            {
                "status": value,
                "label": label,
                "count": len(by_status[value]),
                "candidates": CandidateSerializer(by_status[value], many=True).data,
            }
            for value, label in Application.Status.choices
        ]

        return Response({
            "job": {"id": job.id, "title": job.title, "status": job.status},
            "total": applications.count(),
            "columns": columns,
        })


class ApplicationStageView(RecruiterContextMixin, APIView):
    """PATCH /api/recruiter/applications/<id>/ -- move a card between columns.

    This is the drag-and-drop the prototype left unimplemented. Scoped through
    own_jobs() so a recruiter cannot move an application on someone else's role.
    """

    def patch(self, request, pk):
        application = get_object_or_404(
            Application.objects.select_related("applicant", "job"),
            pk=pk, job__in=self.own_jobs(),
        )
        payload = StageUpdateSerializer(application, data=request.data, partial=True)
        payload.is_valid(raise_exception=True)
        payload.save()
        return Response(CandidateSerializer(application).data)


class CandidateDetailView(RecruiterContextMixin, APIView):
    """GET /api/recruiter/applications/<id>/ -- the candidate review sheet."""

    def get(self, request, pk):
        application = get_object_or_404(
            Application.objects
            .select_related("applicant", "applicant__user", "job")
            .prefetch_related(
                "applicant__skills", "applicant__experience",
                "applicant__projects", "job__skills",
            ),
            pk=pk, job__in=self.own_jobs(),
        )
        return Response(CandidateDetailSerializer(application).data)


class ApplicantClusterView(RecruiterContextMixin, APIView):
    """GET /api/recruiter/jobs/<id>/clusters/ -- applicants grouped by location.

    The prototype hardcoded bubble positions. Real clustering belongs in the map
    library on the client, so this returns one point per distinct location with a
    count and lets the frontend cluster at the current zoom.
    """

    def get(self, request, pk):
        job = get_object_or_404(self.own_jobs(), pk=pk)
        applications = (
            Application.objects
            .filter(job=job, applicant__latitude__isnull=False)
            .select_related("applicant")
        )

        buckets = defaultdict(lambda: {"count": 0, "lat": None, "lng": None})
        for row in applications:
            seeker = row.applicant
            key = seeker.location or "Unknown"
            bucket = buckets[key]
            bucket["count"] += 1
            bucket["lat"] = coarse(seeker.latitude)
            bucket["lng"] = coarse(seeker.longitude)

        points = [
            {"location": name, "count": b["count"],
             "latitude": b["lat"], "longitude": b["lng"]}
            for name, b in buckets.items()
        ]
        remote = Application.objects.filter(
            job=job, applicant__latitude__isnull=True,
        ).count()

        return Response({
            "points": sorted(points, key=lambda p: -p["count"]),
            "withoutLocation": remote,
        })
