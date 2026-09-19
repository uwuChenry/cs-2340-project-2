"""Profile and session endpoints."""

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile, SeekerProfile
from .serializers import OwnProfileSerializer


def session_payload(user):
    """The shape the frontend needs to decide which nav to render."""
    profile = Profile.objects.filter(user=user).first()
    return {
        "id": user.id,
        "username": user.username,
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "role": profile.role if profile else None,
    }


class CsrfView(APIView):
    """GET /api/auth/csrf/ -- sets the CSRF cookie before the first POST.

    Session auth needs the frontend to hold a CSRF token. Calling this once on
    app load puts the cookie in place so later unsafe requests can echo it back
    in the X-CSRFToken header.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class LoginView(APIView):
    """POST /api/auth/login/ -- username and password, sets the session cookie."""

    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username"),
            password=request.data.get("password"),
        )
        if user is None:
            return Response(
                {"detail": "Incorrect username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response(session_payload(user))


class LogoutView(APIView):
    """POST /api/auth/logout/."""

    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionView(APIView):
    """GET /api/auth/session/ -- who, if anyone, is signed in."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"user": None})
        return Response({"user": session_payload(request.user)})


class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET and PATCH /api/profile/ -- the seeker's own profile screen."""

    serializer_class = OwnProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        seeker = (
            SeekerProfile.objects
            .filter(user=self.request.user)
            .prefetch_related("skills", "experience", "education", "links", "projects")
            .first()
        )
        if seeker is None:
            self.permission_denied(
                self.request,
                message="This account does not have a job seeker profile.",
            )
        return seeker
