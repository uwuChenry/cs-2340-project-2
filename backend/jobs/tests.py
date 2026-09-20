from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from jobs.models import JobPosting
from profiles.models import Company, Profile, RecruiterProfile, SeekerProfile

PASSWORD = "correct-horse-battery-42"

# The seeker is in downtown Austin.
AUSTIN = ("30.267153", "-97.743057")


class RadiusFilterTests(APITestCase):
    def setUp(self):
        recruiter_user = User.objects.create_user("rec", password=PASSWORD)
        Profile.objects.create(user=recruiter_user, role=Profile.Role.RECRUITER)
        company = Company.objects.create(name="Globex")
        recruiter = RecruiterProfile.objects.create(user=recruiter_user, company=company)

        def job(title, lat=None, lng=None, arrangement=JobPosting.WorkArrangement.ON_SITE):
            return JobPosting.objects.create(
                recruiter=recruiter, company=company, title=title, description="d", city="Austin",
                latitude=lat, longitude=lng, work_arrangement=arrangement,
                status=JobPosting.Status.PUBLISHED,
            )

        job("Nearby", "30.2594", "-97.7550")            # about a mile away
        job("Far away", "29.8833", "-97.9414")          # San Marcos, ~30 miles
        job("Unlocated")                                # posted, but not pinned on a map yet
        job("Remote", arrangement=JobPosting.WorkArrangement.REMOTE)

        seeker_user = User.objects.create_user("seeker", password=PASSWORD)
        Profile.objects.create(user=seeker_user, role=Profile.Role.JOB_SEEKER)
        SeekerProfile.objects.create(user=seeker_user, latitude=AUSTIN[0], longitude=AUSTIN[1])

    def titles(self, **params):
        results = self.client.get("/api/jobs/", params).data["results"]
        return {r["title"] for r in results}

    def test_radius_drops_only_jobs_known_to_be_too_far(self):
        self.client.login(username="seeker", password=PASSWORD)
        self.assertEqual(self.titles(radius=10), {"Nearby", "Unlocated", "Remote"})

    def test_a_wider_radius_brings_the_far_job_back(self):
        self.client.login(username="seeker", password=PASSWORD)
        self.assertEqual(self.titles(radius=60), {"Nearby", "Far away", "Unlocated", "Remote"})

    def test_new_unlocated_role_is_visible_to_a_seeker_with_a_pinned_location(self):
        """Regression: unknown distance used to count as 'too far'."""
        self.client.login(username="seeker", password=PASSWORD)
        self.assertIn("Unlocated", self.titles(radius=5))

    def test_signed_out_visitors_get_no_radius_filtering(self):
        self.assertEqual(self.titles(radius=10), {"Nearby", "Far away", "Unlocated", "Remote"})

    def test_seeker_without_a_pinned_location_gets_no_radius_filtering(self):
        SeekerProfile.objects.filter(user__username="seeker").update(latitude=None, longitude=None)
        self.client.login(username="seeker", password=PASSWORD)
        self.assertEqual(self.titles(radius=10), {"Nearby", "Far away", "Unlocated", "Remote"})
