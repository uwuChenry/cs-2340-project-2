from django.contrib import admin

from .models import Application, ShortlistItem


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("applicant", "job", "status", "applied_at", "updated_at")
    list_filter = ("status", "job__company")
    search_fields = ("applicant__user__username", "job__title")


@admin.register(ShortlistItem)
class ShortlistItemAdmin(admin.ModelAdmin):
    list_display = ("seeker", "job", "added_at")
