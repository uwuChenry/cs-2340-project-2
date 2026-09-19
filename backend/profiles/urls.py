from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf/", views.CsrfView.as_view(), name="auth-csrf"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/session/", views.SessionView.as_view(), name="auth-session"),
    path("profile/", views.MyProfileView.as_view(), name="my-profile"),
]
