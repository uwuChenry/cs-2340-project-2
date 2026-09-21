from django.contrib import admin

from moderation.admin_utils import CSVExportMixin

from .models import (
    Company,
    Education,
    Experience,
    Profile,
    ProfileLink,
    Project,
    RecruiterProfile,
    SeekerProfile,
    Skill,
)


class ExperienceInline(admin.TabularInline):
    model = Experience
    extra = 0


class EducationInline(admin.TabularInline):
    model = Education
    extra = 0


class ProfileLinkInline(admin.TabularInline):
    model = ProfileLink
    extra = 0


class ProjectInline(admin.TabularInline):
    model = Project
    extra = 0


@admin.register(SeekerProfile)
class SeekerProfileAdmin(CSVExportMixin, admin.ModelAdmin):
    list_display = ("user", "headline", "location", "open_to_work")
    list_filter = ("open_to_work", "open_to_remote")
    search_fields = ("user__username", "user__first_name", "user__last_name", "headline")
    filter_horizontal = ("skills",)
    inlines = [ExperienceInline, EducationInline, ProfileLinkInline, ProjectInline]


@admin.register(Profile)
class ProfileAdmin(CSVExportMixin, admin.ModelAdmin):
    list_display = ("user", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username",)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "website", "logo_bg")
    search_fields = ("name",)


@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "title")
    list_filter = ("company",)
    search_fields = ("user__username", "company__name")


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    search_fields = ("name",)
