"""In-platform messaging endpoints.

Both roles use these: a recruiter opens a thread from the candidate review sheet,
and the seeker replies from their side. Access is checked by participation --
you can read a thread only if you are one of its two people.
"""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from jobs.models import JobPosting
from profiles.models import Profile, SeekerProfile

from .models import Message, Thread
from .serializers import MessageSerializer, ThreadSerializer


class ParticipantMixin:
    permission_classes = [IsAuthenticated]

    def my_threads(self):
        user = self.request.user
        return (
            Thread.objects
            .filter(Q(recruiter=user) | Q(seeker=user))
            .select_related("recruiter", "seeker", "job")
            .prefetch_related("messages__sender")
        )

    def get_serializer_context(self):
        return {"viewer_id": self.request.user.id}


class ThreadListView(ParticipantMixin, APIView):
    """GET /api/threads/ and POST to start one.

    POST is idempotent on (recruiter, seeker, job): messaging the same candidate
    about the same role twice reopens the existing thread rather than creating a
    duplicate.
    """

    def get(self, request):
        threads = self.my_threads()
        return Response(
            ThreadSerializer(threads, many=True, context=self.get_serializer_context()).data
        )

    def post(self, request):
        profile = Profile.objects.filter(user=request.user).first()
        if not profile or profile.role != Profile.Role.RECRUITER:
            return Response(
                {"detail": "Only recruiters can start a conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        seeker_profile = get_object_or_404(
            SeekerProfile.objects.select_related("user"), pk=request.data.get("seeker"),
        )

        job = None
        job_id = request.data.get("job")
        if job_id:
            # Only the recruiter's own posting may scope a thread.
            job = get_object_or_404(
                JobPosting, pk=job_id, recruiter__user=request.user,
            )

        thread, _ = Thread.objects.get_or_create(
            recruiter=request.user, seeker=seeker_profile.user, job=job,
        )

        body = (request.data.get("body") or "").strip()
        if body:
            Message.objects.create(thread=thread, sender=request.user, body=body)

        return Response(
            ThreadSerializer(thread, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class ThreadDetailView(ParticipantMixin, APIView):
    """GET /api/threads/<id>/ -- one conversation."""

    def get(self, request, pk):
        thread = get_object_or_404(self.my_threads(), pk=pk)
        return Response(
            ThreadSerializer(thread, context=self.get_serializer_context()).data
        )


class MessageCreateView(ParticipantMixin, APIView):
    """POST /api/threads/<id>/messages/ -- send into an existing thread."""

    def post(self, request, pk):
        thread = get_object_or_404(self.my_threads(), pk=pk)
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response(
                {"detail": "A message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        message = Message.objects.create(
            thread=thread, sender=request.user, body=body,
        )
        return Response(
            MessageSerializer(message, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )
