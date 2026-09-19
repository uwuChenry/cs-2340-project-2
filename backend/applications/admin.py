from django.contrib import admin

from .models import Application

# Applications appear in /admin/ for support and status-management workflows.
admin.site.register(Application)
