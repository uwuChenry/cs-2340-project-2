from django.urls import path

from . import views

urlpatterns = [
    path("reports/", views.ReportListCreateView.as_view(), name="report-list-create"),
    path("admin/users/", views.AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", views.AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("admin/jobs/", views.AdminJobListView.as_view(), name="admin-job-list"),
    path("admin/jobs/<int:pk>/moderate/", views.AdminJobModerationView.as_view(), name="admin-job-moderate"),
]