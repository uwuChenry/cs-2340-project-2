from django.contrib import admin

from .models import (
    Education,
    JobSeekerProfile,
    ProfileLink,
    Project,
    RecruiterProfile,
    Skill,
    UserRole,
    WorkExperience,
)

# Register each profile-related record so administrators can manage it in /admin/.
admin.site.register(Skill)
admin.site.register(UserRole)
admin.site.register(JobSeekerProfile)
admin.site.register(Education)
admin.site.register(WorkExperience)
admin.site.register(ProfileLink)
admin.site.register(Project)
admin.site.register(RecruiterProfile)
