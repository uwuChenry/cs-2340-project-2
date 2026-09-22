from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from jobs.models import JobPosting
from profiles.models import Company, Profile, RecruiterProfile

from .models import Report


class ReportApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.reporter = User.objects.create_user("reporter", password="test-password-123")
		Profile.objects.create(user=self.reporter, role=Profile.Role.JOB_SEEKER)
		recruiter_user = User.objects.create_user("recruiter", password="test-password-123")
		Profile.objects.create(user=recruiter_user, role=Profile.Role.RECRUITER)
		recruiter = RecruiterProfile.objects.create(user=recruiter_user, company=Company.objects.create(name="Acme"))
		self.job = JobPosting.objects.create(
			recruiter=recruiter,
			company=recruiter.company,
			title="Engineer",
			description="Build things.",
			city="Austin",
		)

	def test_authenticated_user_can_report_job(self):
		self.client.force_authenticate(self.reporter)

		response = self.client.post(
			"/api/reports/",
			{"reportedJob": self.job.id, "reason": "Misleading posting", "details": "The role is not real."},
			format="json",
		)

		self.assertEqual(response.status_code, 201)
		report = Report.objects.get()
		self.assertEqual(report.reporter, self.reporter)
		self.assertEqual(report.reported_job, self.job)
		self.assertEqual(report.status, Report.Status.OPEN)

	def test_report_requires_exactly_one_target(self):
		self.client.force_authenticate(self.reporter)

		response = self.client.post(
			"/api/reports/",
			{"reason": "Abuse"},
			format="json",
		)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(Report.objects.count(), 0)

	def test_reports_require_authentication(self):
		response = self.client.post(
			"/api/reports/",
			{"reportedJob": self.job.id, "reason": "Spam"},
			format="json",
		)

		self.assertEqual(response.status_code, 403)

# Create your tests here.
