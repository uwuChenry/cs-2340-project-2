"""Recruiter-only routes, mounted under /api/recruiter/."""

from django.urls import path

from profiles import recruiter_views as profile_views

from . import recruiter_views as job_views

urlpatterns = [
    path("jobs/", job_views.RecruiterJobListView.as_view(), name="recruiter-job-list"),
    path("jobs/<int:pk>/", job_views.RecruiterJobDetailView.as_view(), name="recruiter-job-detail"),
    path("jobs/<int:pk>/pipeline/", job_views.PipelineView.as_view(), name="recruiter-pipeline"),
    path("jobs/<int:pk>/clusters/", job_views.ApplicantClusterView.as_view(), name="recruiter-clusters"),

    path("applications/<int:pk>/", job_views.CandidateDetailView.as_view(), name="recruiter-candidate"),
    path("applications/<int:pk>/stage/", job_views.ApplicationStageView.as_view(), name="recruiter-stage"),

    path("candidates/", profile_views.CandidateSearchView.as_view(), name="recruiter-candidate-search"),
    path("candidates/<int:pk>/", profile_views.SeekerDetailView.as_view(), name="recruiter-seeker-detail"),

    path("saved-searches/", profile_views.SavedSearchListView.as_view(), name="saved-search-list"),
    path("saved-searches/<int:pk>/", profile_views.SavedSearchDetailView.as_view(), name="saved-search-detail"),
]
