from django.contrib import admin

from .models import Report

# Reports appear in /admin/ so administrators can review submitted concerns.
admin.site.register(Report)
