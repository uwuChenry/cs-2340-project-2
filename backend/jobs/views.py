"""Job search and detail endpoints."""

from django.db.models import Q
from rest_framework import generics, permissions

from applications.models import Application, ShortlistItem
from profiles.models import SeekerProfile

from .matching import distance_miles
from .models import JobPosting
from .serializers import JobPostingDetailSerializer, JobPostingSerializer


class SeekerContextMixin:
    """Resolves the requesting seeker once and shares it with the serializer.

    Match percentage, distance, and the shortlisted/applied flags all depend on
    who is asking. Looking each of those up per row would mean a query per job,
    so they are fetched once here and passed down through serializer context.
    """

    def get_seeker(self):
        if not self.request.user.is_authenticated:
            return None
        return SeekerProfile.objects.filter(user=self.request.user).first()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        seeker = self.get_seeker()
        context["seeker"] = seeker

        if seeker is None:
            context["seeker_skills"] = []
            context["shortlisted_ids"] = set()
            context["applied_ids"] = set()
            return context

        context["seeker_skills"] = list(seeker.skills.values_list("name", flat=True))
        context["shortlisted_ids"] = set(
            ShortlistItem.objects.filter(seeker=seeker).values_list("job_id", flat=True)
        )
        context["applied_ids"] = set(
            Application.objects.filter(applicant=seeker).values_list("job_id", flat=True)
        )
        return context


class JobListView(SeekerContextMixin, generics.ListAPIView):
    """GET /api/jobs/ -- published postings matching the search filters.

    Supported query parameters, matching the filter panel one for one:
      q            title or company substring
      location     city or state substring
      skills       comma-separated; a job must have EVERY one (AND, not OR)
      setup        any | remote | onsite  (onsite includes hybrid)
      min_salary   whole dollars, compared against the job's lower bound
      visa         true | false
      radius       miles; filters on distance from the seeker
    """

    serializer_class = JobPostingSerializer
    # Browsing is public; the personalised fields simply come back empty.
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        jobs = (
            JobPosting.objects
            .filter(status=JobPosting.Status.PUBLISHED)
            .select_related("company", "recruiter")
            .prefetch_related("skills")
        )
        params = self.request.query_params

        q = params.get("q", "").strip()
        if q:
            jobs = jobs.filter(Q(title__icontains=q) | Q(company__name__icontains=q))

        location = params.get("location", "").strip()
        if location:
            jobs = jobs.filter(
                Q(city__icontains=location) | Q(state__icontains=location)
            )

        # AND semantics: chaining one filter per skill is what requires a job to
        # have all of them. A single __in filter would return jobs with any one.
        for skill in self._csv(params.get("skills", "")):
            jobs = jobs.filter(skills__name__iexact=skill)

        setup = params.get("setup", "any")
        if setup == "remote":
            jobs = jobs.filter(work_arrangement=JobPosting.WorkArrangement.REMOTE)
        elif setup == "onsite":
            # "Onsite" excludes only fully remote roles, so hybrid stays in.
            jobs = jobs.exclude(work_arrangement=JobPosting.WorkArrangement.REMOTE)

        min_salary = params.get("min_salary")
        if min_salary and min_salary.isdigit():
            jobs = jobs.filter(salary_min__gte=int(min_salary))

        visa = params.get("visa", "").lower()
        if visa in {"true", "false"}:
            jobs = jobs.filter(offers_visa_sponsorship=(visa == "true"))

        return jobs.distinct()

    def filter_queryset(self, queryset):
        """Apply the radius filter, which cannot be expressed in SQL here.

        Distance needs the haversine formula against the seeker's coordinates.
        SQLite has no geospatial support, so this happens in Python after the
        database has already narrowed the set down.
        """
        queryset = super().filter_queryset(queryset)
        radius = self.request.query_params.get("radius")
        if not radius or not radius.isdigit():
            return queryset

        seeker = self.get_seeker()
        if seeker is None or seeker.latitude is None:
            return queryset

        limit = int(radius)
        within = [
            job.id for job in queryset
            if (d := distance_miles(job, seeker)) is not None and d <= limit
        ]
        return queryset.filter(id__in=within)

    @staticmethod
    def _csv(value):
        return [part.strip() for part in value.split(",") if part.strip()]


class JobDetailView(SeekerContextMixin, generics.RetrieveAPIView):
    """GET /api/jobs/<id>/ -- one posting for the job sheet."""

    serializer_class = JobPostingDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = (
        JobPosting.objects
        .filter(status=JobPosting.Status.PUBLISHED)
        .select_related("company", "recruiter")
        .prefetch_related("skills")
    )
