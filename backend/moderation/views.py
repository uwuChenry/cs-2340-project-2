from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Report
from .serializers import ReportSerializer


class ReportListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/reports/ for the signed-in user's submitted reports."""

    permission_classes = [IsAuthenticated]
    serializer_class = ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).select_related(
            "reported_user", "reported_job"
        )

    from django.shortcuts import render

# Create your views here.
