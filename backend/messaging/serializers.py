"""Serializers for in-platform messaging."""

from rest_framework import serializers

from .models import EmailLog, Message, Thread

class MessageSerializer(serializers.ModelSerializer):
    """One bubble in a thread.

    `mine` tells the UI which side to render the bubble on. It depends on who is
    reading, so it comes from serializer context rather than the row.
    """

    senderName = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()
    sentAt = serializers.DateTimeField(source="sent_at", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "body", "senderName", "mine", "sentAt"]

    def get_senderName(self, message):
        return message.sender.get_full_name() or message.sender.username

    def get_mine(self, message):
        return message.sender_id == self.context.get("viewer_id")


class ThreadSerializer(serializers.ModelSerializer):
    """A conversation, with its messages inlined."""

    messages = serializers.SerializerMethodField()
    withName = serializers.SerializerMethodField()
    jobTitle = serializers.CharField(source="job.title", read_only=True, default=None)
    lastMessageAt = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = ["id", "withName", "jobTitle", "messages", "lastMessageAt"]

    def get_messages(self, thread):
        return MessageSerializer(
            thread.messages.all(), many=True, context=self.context,
        ).data

    def get_withName(self, thread):
        """The other participant, from the reader's point of view."""
        viewer_id = self.context.get("viewer_id")
        other = thread.seeker if thread.recruiter_id == viewer_id else thread.recruiter
        return other.get_full_name() or other.username

    def get_lastMessageAt(self, thread):
        last = thread.messages.last()
        return last.sent_at if last else None

class EmailLogSerializer(serializers.ModelSerializer):
    """Confirmation payload after a recruiter emails a candidate (story 15)."""

    sentAt = serializers.DateTimeField(source="sent_at", read_only=True)

    class Meta:
        model = EmailLog
        fields = ["id", "subject", "body", "sentAt"]
