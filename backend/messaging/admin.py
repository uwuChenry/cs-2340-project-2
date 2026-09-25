from django.contrib import admin

from moderation.admin_utils import CSVExportMixin

from .models import EmailLog, Message, Thread


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ("recruiter", "seeker", "job", "created_at")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("thread", "sender", "sent_at", "read_at")


@admin.register(EmailLog)
class EmailLogAdmin(CSVExportMixin, admin.ModelAdmin):
    """Real emails sent to candidates through the platform (story 15)."""

    list_display = ("recruiter", "seeker", "job", "subject", "sent_at")
    list_filter = ("job",)
    search_fields = ("subject", "recruiter__username", "seeker__username")
