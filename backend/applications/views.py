"""Shortlist and application endpoints for the seeker flow."""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from jobs.models import JobPosting
from profiles.models import SeekerProfile

from .models import Application, ShortlistItem
from .serializers import (
    ApplicationSerializer,
    ApplyAllSerializer,
    ApplySerializer,
    ShortlistItemSerializer,
)


class SeekerOnlyMixin:
    """Resolves the requesting user's seeker profile, or 403s."""

    permission_classes = [IsAuthenticated]

    def get_seeker(self):
        seeker = SeekerProfile.objects.filter(user=self.request.user).first()
        if seeker is None:
            self.permission_denied(
                self.request,
                message="This account does not have a job seeker profile.",
            )
        return seeker

    def get_serializer_context(self):
        context = super().get_serializer_context()
        seeker = SeekerProfile.objects.filter(user=self.request.user).first()
        context["seeker"] = seeker
        context["seeker_skills"] = (
            list(seeker.skills.values_list("name", flat=True)) if seeker else []
        )
        context["shortlisted_ids"] = set()
        context["applied_ids"] = set(
            Application.objects.filter(applicant=seeker).values_list("job_id", flat=True)
        ) if seeker else set()
        return context


class ApplicationListView(SeekerOnlyMixin, generics.ListAPIView):
    """GET /api/applications/ -- the seeker's tracker."""

    serializer_class = ApplicationSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Application.objects
            .filter(applicant=self.get_seeker())
            .select_related("job", "job__company")
        )


class ApplyView(SeekerOnlyMixin, APIView):
    """POST /api/applications/apply/ -- apply to one job.

    Idempotent: re-applying returns the existing application with 200 rather
    than tripping the unique constraint. A note sent with a repeat call updates
    the existing row, which is what "apply, then add a note" does in the UI.
    """

    def post(self, request):
        seeker = self.get_seeker()
        payload = ApplySerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        job = get_object_or_404(
            JobPosting, pk=payload.validated_data["job"],
            status=JobPosting.Status.PUBLISHED,
        )
        note = payload.validated_data.get("note", "")

        application, created = Application.objects.get_or_create(
            applicant=seeker, job=job, defaults={"tailored_note": note},
        )
        if not created and note:
            application.tailored_note = note
            application.save(update_fields=["tailored_note", "updated_at"])

        # Applying removes the job from the shortlist; it has moved on to the tracker.
        ShortlistItem.objects.filter(seeker=seeker, job=job).delete()

        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ApplyAllView(SeekerOnlyMixin, APIView):
    """POST /api/applications/apply-all/ -- apply to every shortlisted job.

    The unique constraint on (applicant, job) means a plain bulk insert would
    raise IntegrityError as soon as one job had already been applied to, so each
    row goes through get_or_create and already-applied jobs are simply skipped.
    """

    def post(self, request):
        seeker = self.get_seeker()
        payload = ApplyAllSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        job_ids = payload.validated_data.get("jobs")
        if not job_ids:
            job_ids = list(
                ShortlistItem.objects.filter(seeker=seeker).values_list("job_id", flat=True)
            )

        jobs = JobPosting.objects.filter(
            id__in=job_ids, status=JobPosting.Status.PUBLISHED,
        )

        created_ids, skipped_ids = [], []
        for job in jobs:
            _, created = Application.objects.get_or_create(applicant=seeker, job=job)
            (created_ids if created else skipped_ids).append(job.id)

        ShortlistItem.objects.filter(seeker=seeker, job_id__in=job_ids).delete()

        return Response({
            "created": len(created_ids),
            "alreadyApplied": len(skipped_ids),
            "createdJobIds": created_ids,
            "skippedJobIds": skipped_ids,
        }, status=status.HTTP_201_CREATED if created_ids else status.HTTP_200_OK)


class ShortlistView(SeekerOnlyMixin, generics.ListAPIView):
    """GET /api/shortlist/ and POST to add, for the compare table."""

    serializer_class = ShortlistItemSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            ShortlistItem.objects
            .filter(seeker=self.get_seeker())
            .select_related("job", "job__company")
            .prefetch_related("job__skills")
        )

    def post(self, request):
        seeker = self.get_seeker()
        job = get_object_or_404(
            JobPosting, pk=request.data.get("job"),
            status=JobPosting.Status.PUBLISHED,
        )
        item, created = ShortlistItem.objects.get_or_create(seeker=seeker, job=job)
        return Response(
            self.get_serializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ShortlistItemView(SeekerOnlyMixin, APIView):
    """DELETE /api/shortlist/<job_id>/ -- remove one job from the shortlist."""

    def delete(self, request, job_id):
        deleted, _ = ShortlistItem.objects.filter(
            seeker=self.get_seeker(), job_id=job_id,
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShortlistClearView(SeekerOnlyMixin, APIView):
    """DELETE /api/shortlist/clear/ -- the "Clear shortlist" button."""

    def delete(self, request):
        count, _ = ShortlistItem.objects.filter(seeker=self.get_seeker()).delete()
        return Response({"removed": count}, status=status.HTTP_200_OK)
