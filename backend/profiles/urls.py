from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf/", views.CsrfView.as_view(), name="auth-csrf"),
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/session/", views.SessionView.as_view(), name="auth-session"),
    path("auth/account/", views.AccountView.as_view(), name="auth-account"),
    path("auth/password/", views.PasswordChangeView.as_view(), name="auth-password"),
    path("profile/", views.MyProfileView.as_view(), name="my-profile"),
    path("profile/photo/", views.PhotoView.as_view(), name="profile-photo"),
    path("profile/experience/", views.ExperienceListView.as_view(), name="experience-list"),
    path("profile/experience/<int:pk>/", views.ExperienceDetailView.as_view(), name="experience-detail"),
    path("profile/education/", views.EducationListView.as_view(), name="education-list"),
    path("profile/education/<int:pk>/", views.EducationDetailView.as_view(), name="education-detail"),
    path("profile/links/", views.LinkListView.as_view(), name="link-list"),
    path("profile/links/<int:pk>/", views.LinkDetailView.as_view(), name="link-detail"),
    path("profile/projects/", views.ProjectListView.as_view(), name="project-list"),
    path("profile/projects/<int:pk>/", views.ProjectDetailView.as_view(), name="project-detail"),
]
