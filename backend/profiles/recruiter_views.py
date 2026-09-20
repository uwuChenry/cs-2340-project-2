"""Candidate sourcing for recruiters."""

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from applications.models import Application
from applications.recruiter_serializers import SourcedCandidateSerializer
from jobs.models import JobPosting, SavedSearch
from jobs.matching import haversine_miles, skill_match_pct

from .models import SeekerProfile
from .permissions import RecruiterContextMixin
from .serializers import RecruiterProfileSerializer, SavedSearchSerializer


class CandidateSearchView(RecruiterContextMixin, generics.ListAPIView):
    """GET /api/recruiter/candidates/ -- source candidates.

    Query parameters mirror the sourcing panel:
      skills     comma-separated; a candidate must have EVERY one
      location   substring on the seeker's location
      project    keyword across project names and descriptions
      job        a posting id to rank against, and to widen visibility to its
                 own applicants
      radius     miles from that posting

    Who is visible is a privacy decision, not just a filter. A seeker appears
    here if they signalled "open to work", or if they already applied to one of
    this recruiter's postings -- applying is itself consent to be reviewed.
    Everyone else stays out of sourcing entirely.
    """

    serializer_class = SourcedCandidateSerializer
    pagination_class = None

    def get_queryset(self):
        params = self.request.query_params

        own_applicant_ids = Application.objects.filter(
            job__in=self.own_jobs(),
        ).values_list("applicant_id", flat=True)

        seekers = (
            SeekerProfile.objects
            .filter(Q(open_to_work=True) | Q(id__in=own_applicant_ids))
            .select_related("user")
            .prefetch_related("skills", "projects")
        )

        for skill in self._csv(params.get("skills", "")):
            seekers = seekers.filter(skills__name__iexact=skill)

        location = params.get("location", "").strip()
        if location:
            seekers = seekers.filter(location__icontains=location)

        project = params.get("project", "").strip()
        if project:
            seekers = seekers.filter(
                Q(projects__name__icontains=project)
                | Q(projects__description__icontains=project)
            )

        seekers = seekers.distinct()

        radius = params.get("radius")
        job = self._target_job()
        if radius and radius.isdigit() and job and job.latitude is not None:
            limit = int(radius)
            near = [
                s.id for s in seekers
                if (d := haversine_miles(
                    job.latitude, job.longitude, s.latitude, s.longitude,
                )) is not None and d <= limit
            ]
            seekers = seekers.filter(id__in=near)

        return seekers

    def list(self, request, *args, **kwargs):
        """Rank by match against the target role, best first."""
        queryset = self.get_queryset()
        context = self.get_serializer_context()
        rows = self.get_serializer(queryset, many=True, context=context).data
        rows.sort(key=lambda row: row["matchPct"], reverse=True)
        return Response({
            "count": len(rows),
            "targetJob": context.get("target_job_title"),
            "results": rows,
        })

    def get_serializer_context(self):
        context = super().get_serializer_context()
        job = self._target_job()
        context["target_skills"] = (
            [skill.name for skill in job.skills.all()] if job else []
        )
        context["target_job_title"] = job.title if job else None
        context["applicant_ids"] = set(
            Application.objects.filter(job__in=self.own_jobs())
            .values_list("applicant_id", flat=True)
        )
        return context

    def _target_job(self):
        """The posting to rank against: the one asked for, else the newest open one."""
        if hasattr(self, "_job_cache"):
            return self._job_cache

        job_id = self.request.query_params.get("job")
        jobs = self.own_jobs().prefetch_related("skills")
        if job_id and job_id.isdigit():
            self._job_cache = jobs.filter(pk=job_id).first()
        else:
            self._job_cache = jobs.filter(
                status=JobPosting.Status.PUBLISHED,
            ).order_by("-posted_at").first()
        return self._job_cache

    @staticmethod
    def _csv(value):
        return [part.strip() for part in value.split(",") if part.strip()]


class SeekerDetailView(RecruiterContextMixin, APIView):
    """GET /api/recruiter/candidates/<id>/ -- a sourced seeker's public profile.

    Distinct from the candidate review sheet, which is keyed on an application.
    This is for someone the recruiter found but who has not applied.
    """

    def get(self, request, pk):
        own_applicant_ids = Application.objects.filter(
            job__in=self.own_jobs(),
        ).values_list("applicant_id", flat=True)

        seeker = (
            SeekerProfile.objects
            .filter(Q(open_to_work=True) | Q(id__in=own_applicant_ids))
            .filter(pk=pk)
            .select_related("user")
            .prefetch_related("skills", "experience", "projects")
            .first()
        )
        if seeker is None:
            return Response(
                {"detail": "No such candidate, or they are not open to being sourced."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from .serializers import PublicSeekerSerializer

        data = PublicSeekerSerializer(seeker).data
        job = self.own_jobs().filter(
            status=JobPosting.Status.PUBLISHED,
        ).order_by("-posted_at").first()
        if job:
            job_skills = [s.name for s in job.skills.all()]
            seeker_skills = [s.name for s in seeker.skills.all()]
            data["matchPct"] = skill_match_pct(job_skills, seeker_skills)
            data["matchedSkills"] = [s for s in job_skills if s in set(seeker_skills)]
        return Response(data)


class SavedSearchListView(RecruiterContextMixin, generics.ListCreateAPIView):
    """GET and POST /api/recruiter/saved-searches/."""

    serializer_class = SavedSearchSerializer
    pagination_class = None

    def get_queryset(self):
        return SavedSearch.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, kind=SavedSearch.Kind.CANDIDATES)


class SavedSearchDetailView(RecruiterContextMixin, generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH and DELETE /api/recruiter/saved-searches/<id>/.

    PATCH covers the alerts pill. Opening one also stamps last_viewed_at, which
    is what resets its new-match count.
    """

    serializer_class = SavedSearchSerializer

    def get_queryset(self):
        return SavedSearch.objects.filter(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        search = self.get_object()
        data = self.get_serializer(search).data
        search.last_viewed_at = timezone.now()
        search.save(update_fields=["last_viewed_at"])
        return Response(data)


class RecruiterProfileView(RecruiterContextMixin, generics.RetrieveUpdateAPIView):
    """GET and PATCH /api/recruiter/profile/ -- the recruiter's own account page."""

    serializer_class = RecruiterProfileSerializer

    def get_object(self):
        return self.get_recruiter()
