"""Shared "export selected to CSV" admin action (story 23).

The repo's own INFO.md points at this as the quickest route for CSV export:
a stdlib csv.writer streamed as an HttpResponse, hung off list_display so the
columns an export ships are exactly the ones the admin already chose to show.
No new dependency -- csv is stdlib.
"""

import csv

from django.http import HttpResponse


class CSVExportMixin:
    """Mix into a ModelAdmin to add an "Export selected to CSV" action.

    Columns come from list_display, evaluated the same way Django's own admin
    list view resolves it: a model field, a callable/method, or an attribute
    name. That keeps the CSV in sync with whatever columns the admin shows
    without listing fields twice.
    """

    actions = ["export_as_csv"]

    def export_as_csv(self, request, queryset):
        field_names = list(self.list_display)

        response = HttpResponse(content_type="text/csv")
        model_name = self.model._meta.verbose_name_plural.replace(" ", "_")
        response["Content-Disposition"] = f"attachment; filename={model_name}.csv"

        writer = csv.writer(response)
        writer.writerow(field_names)
        for obj in queryset:
            writer.writerow([self._csv_value(obj, name) for name in field_names])
        return response

    export_as_csv.short_description = "Export selected to CSV"

    def _csv_value(self, obj, field_name):
        if hasattr(self, field_name):
            value = getattr(self, field_name)(obj)
        else:
            value = getattr(obj, field_name, "")
            if callable(value):
                value = value()
        return "" if value is None else str(value)