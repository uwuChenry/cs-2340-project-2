from django.contrib import admin

from .admin_utils import CSVExportMixin
from .models import Report


@admin.register(Report)
class ReportAdmin(CSVExportMixin, admin.ModelAdmin):
    """Reports appear in /admin/ so administrators can review submitted concerns."""

    list_display = ("id", "reporter", "reported_user", "reported_job", "reason", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("reason", "details", "reporter__username")
