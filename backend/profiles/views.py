"""Profile and session endpoints."""

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Education, Experience, Profile, ProfileLink, Project, SeekerProfile
from .photos import InvalidPhoto, process_avatar
from .serializers import (
    AccountSerializer,
    EducationSerializer,
    ExperienceSerializer,
    OwnProfileSerializer,
    PasswordChangeSerializer,
    ProfileLinkSerializer,
    ProjectSerializer,
    RegisterSerializer,
    photo_url,
)


def session_payload(user, request=None):
    """The shape the frontend needs to decide which nav to render."""
    profile = Profile.objects.filter(user=user).first()
    seeker = SeekerProfile.objects.filter(user=user).first()
    return {
        "id": user.id,
        "username": user.username,
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "role": profile.role if profile else None,
        # Shown in the navbar avatar, so it rides along with the session.
        "photoUrl": photo_url(seeker, request),
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


class RegisterView(APIView):
    """POST /api/auth/register/ -- create an account and sign it in.

    The caller picks `job_seeker` or `recruiter`; the matching profile row is
    created with the account so the very next request (the profile page, or the
    recruiter workspace) already has something to load.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(session_payload(user, request), status=status.HTTP_201_CREATED)


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
        return Response(session_payload(user, request))


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
        return Response({"user": session_payload(request.user, request)})


class AccountView(generics.RetrieveUpdateAPIView):
    """GET and PATCH /api/auth/account/ -- username and email, for any signed-in role."""

    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """POST /api/auth/password/ -- change the password, staying signed in."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["newPassword"])
        request.user.save(update_fields=["password"])
        # Changing the password invalidates every session for the user, including
        # this one, unless the session is re-keyed to the new password hash.
        update_session_auth_hash(request, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


def own_seeker_profile(view):
    """The requesting user's SeekerProfile, or a 403 for any other kind of account."""
    seeker = SeekerProfile.objects.filter(user=view.request.user).first()
    if seeker is None:
        view.permission_denied(
            view.request,
            message="This account does not have a job seeker profile.",
        )
    return seeker


class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET and PATCH /api/profile/ -- the seeker's own profile screen."""

    serializer_class = OwnProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        seeker = own_seeker_profile(self)
        return (
            SeekerProfile.objects
            .filter(pk=seeker.pk)
            .prefetch_related("skills", "experience", "education", "links", "projects")
            .get()
        )


class PhotoView(APIView):
    """POST and DELETE /api/profile/photo/ -- the seeker's profile picture.

    POST takes multipart form data with a `photo` file and replies with the whole
    updated profile. The stored image is a re-encoded square JPEG, never the
    uploaded bytes (see photos.py).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        seeker = own_seeker_profile(self)
        upload = request.FILES.get("photo")
        if upload is None:
            return Response({"photo": ["Choose an image to upload."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            processed = process_avatar(upload)
        except InvalidPhoto as error:
            return Response({"photo": [str(error)]}, status=status.HTTP_400_BAD_REQUEST)

        if seeker.photo:
            seeker.photo.delete(save=False)
        seeker.photo.save(processed.name, processed, save=True)
        return Response(OwnProfileSerializer(seeker, context={"request": request}).data)

    def delete(self, request):
        seeker = own_seeker_profile(self)
        if seeker.photo:
            seeker.photo.delete(save=False)
            seeker.photo = ""
            seeker.save(update_fields=["photo"])
        return Response(OwnProfileSerializer(seeker, context={"request": request}).data)


def profile_section_views(model, serializer):
    """List/create and detail views for one repeating section of a profile.

    Experience, education, links and projects all behave the same way: a seeker
    can list, add, edit and delete their own rows and nobody else's. Scoping the
    queryset to the seeker's profile is what makes another user's row a 404
    rather than something you can guess an id for.
    """

    class SectionMixin:
        serializer_class = serializer
        permission_classes = [IsAuthenticated]
        pagination_class = None

        def get_queryset(self):
            return model.objects.filter(profile=own_seeker_profile(self))

    class SectionListView(SectionMixin, generics.ListCreateAPIView):
        def perform_create(self, serializer):
            serializer.save(profile=own_seeker_profile(self))

    class SectionDetailView(SectionMixin, generics.RetrieveUpdateDestroyAPIView):
        pass

    name = model.__name__
    SectionListView.__name__ = f"{name}ListView"
    SectionListView.__doc__ = f"GET and POST /api/profile/ -- the seeker's {name.lower()} entries."
    SectionDetailView.__name__ = f"{name}DetailView"
    SectionDetailView.__doc__ = f"GET, PATCH and DELETE one of the seeker's {name.lower()} entries."
    return SectionListView, SectionDetailView


ExperienceListView, ExperienceDetailView = profile_section_views(Experience, ExperienceSerializer)
EducationListView, EducationDetailView = profile_section_views(Education, EducationSerializer)
LinkListView, LinkDetailView = profile_section_views(ProfileLink, ProfileLinkSerializer)
ProjectListView, ProjectDetailView = profile_section_views(Project, ProjectSerializer)
