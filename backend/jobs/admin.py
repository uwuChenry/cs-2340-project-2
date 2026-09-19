from django.contrib import admin

from .models import JobPosting, SavedSearch


@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "city", "work_arrangement", "status", "posted_at")
    list_filter = ("status", "work_arrangement", "offers_visa_sponsorship", "company")
    search_fields = ("title", "company__name", "city")
    filter_horizontal = ("skills",)


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "kind", "alerts_on", "created_at")
    list_filter = ("kind", "alerts_on")
