"""Role-based access for the recruiter half of the platform."""

from rest_framework.permissions import BasePermission

from .models import Profile, RecruiterProfile


class IsRecruiter(BasePermission):
    """Allows only signed-in users whose account role is recruiter.

    Role is checked against Profile rather than inferred from the existence of a
    RecruiterProfile, so an account cannot gain recruiter access just by having a
    stray row.
    """

    message = "This account is not a recruiter account."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        profile = Profile.objects.filter(user=request.user).first()
        return bool(profile and profile.role == Profile.Role.RECRUITER)


class RecruiterContextMixin:
    """Resolves the requesting user's RecruiterProfile once per request.

    Every recruiter view scopes its queryset through this, which is what keeps
    one recruiter from reading or editing another company's postings and
    applicants.
    """

    permission_classes = [IsRecruiter]

    _recruiter_cache = None

    def get_recruiter(self):
        if self._recruiter_cache is None:
            self._recruiter_cache = (
                RecruiterProfile.objects
                .select_related("company", "user")
                .filter(user=self.request.user)
                .first()
            )
            if self._recruiter_cache is None:
                self.permission_denied(
                    self.request,
                    message="This recruiter account has no company profile yet.",
                )
        return self._recruiter_cache

    def own_jobs(self):
        """Postings belonging to the requesting recruiter."""
        from jobs.models import JobPosting

        return JobPosting.objects.filter(recruiter=self.get_recruiter())
