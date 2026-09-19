from django.urls import path

from . import views

urlpatterns = [
    path("threads/", views.ThreadListView.as_view(), name="thread-list"),
    path("threads/<int:pk>/", views.ThreadDetailView.as_view(), name="thread-detail"),
    path("threads/<int:pk>/messages/", views.MessageCreateView.as_view(), name="thread-messages"),
]
