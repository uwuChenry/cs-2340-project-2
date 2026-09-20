from django.contrib.auth.models import User
from django.db import models

from jobs.models import JobPosting


class Thread(models.Model):
    """An in-platform conversation between a recruiter and a seeker.

    Scoped to a posting when the conversation started from an application, so the
    candidate review sheet can open the right thread for the right opening.
    """

    recruiter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recruiter_threads",
    )
    seeker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="seeker_threads",
    )
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="threads",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["recruiter", "seeker", "job"],
                name="one_thread_per_pair_per_job",
            )
        ]

    def __str__(self):
        return f"{self.recruiter.username} <-> {self.seeker.username}"


class Message(models.Model):
    """One message in a thread.

    Direction in the UI (left/right bubble) is derived by comparing sender to the
    viewer, so it is not stored.
    """

    thread = models.ForeignKey(
        Thread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["sent_at"]

    def __str__(self):
        return f"{self.sender.username}: {self.body[:40]}"
