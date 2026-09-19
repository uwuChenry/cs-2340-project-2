from django.urls import path

from . import views

urlpatterns = [
    path("applications/", views.ApplicationListView.as_view(), name="application-list"),
    path("applications/apply/", views.ApplyView.as_view(), name="application-apply"),
    path("applications/apply-all/", views.ApplyAllView.as_view(), name="application-apply-all"),
    path("shortlist/", views.ShortlistView.as_view(), name="shortlist"),
    path("shortlist/clear/", views.ShortlistClearView.as_view(), name="shortlist-clear"),
    path("shortlist/<int:job_id>/", views.ShortlistItemView.as_view(), name="shortlist-item"),
]
