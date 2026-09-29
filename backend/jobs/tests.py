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


from unittest.mock import patch

OFFICE = (30.2729, -97.7444)  # 1104 Rio Grande St, Austin


@patch("jobs.coordinates.geocode", return_value=OFFICE)
class RecruiterOfficePinTests(APITestCase):
    """Story 18 (pin from the typed address) and story 7 (pinned roles on the map)."""

    def setUp(self):
        self.client.post("/api/auth/register/", {
            "username": "pinrec", "password": PASSWORD, "email": "p@example.test",
            "firstName": "Pat", "lastName": "Recruiter", "role": "recruiter",
            "company": "Initech", "title": "Talent Partner",
        }, format="json")

    def post(self, **fields):
        body = {"title": "Intern", "description": "d", "address": "1104 Rio Grande St",
                "city": "Austin", "state": "TX", "setup": "hybrid", "status": "published", **fields}
        return self.client.post("/api/recruiter/jobs/", body, format="json")

    def test_publishing_pins_the_office(self, geocode):
        response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertAlmostEqual(response.data["latitude"], OFFICE[0])
        self.assertAlmostEqual(response.data["longitude"], OFFICE[1])
        geocode.assert_called_once_with("1104 Rio Grande St", "Austin", "TX")

    def test_draft_is_pinned_too(self, geocode):
        response = self.post(status="draft")
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["latitude"])

    def test_city_only_address_is_not_repeated(self, geocode):
        self.post(address="Austin")
        geocode.assert_called_once_with("", "Austin", "TX")

    def test_remote_role_gets_no_pin(self, geocode):
        response = self.post(setup="remote")
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["latitude"])
        geocode.assert_not_called()

    def test_failed_lookup_still_saves(self, geocode):
        geocode.return_value = None
        response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["latitude"])

    def test_moving_the_office_repins(self, geocode):
        job_id = self.post().data["id"]
        geocode.return_value = (33.7756, -84.3963)
        response = self.client.patch(f"/api/recruiter/jobs/{job_id}/", {
            "address": "North Ave NW", "city": "Atlanta", "state": "GA",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertAlmostEqual(response.data["latitude"], 33.7756)

    def test_unrelated_edit_keeps_pin_without_new_lookup(self, geocode):
        job_id = self.post().data["id"]
        geocode.reset_mock()
        response = self.client.patch(f"/api/recruiter/jobs/{job_id}/", {"title": "Renamed"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertAlmostEqual(response.data["latitude"], OFFICE[0])
        geocode.assert_not_called()

    def test_published_role_shows_on_search_map(self, geocode):
        job_id = self.post().data["id"]
        jobs = self.client.get("/api/jobs/").data
        jobs = jobs.get("results", jobs) if isinstance(jobs, dict) else jobs
        pinned = [j for j in jobs if j["id"] == job_id]
        self.assertEqual(len(pinned), 1)
        self.assertAlmostEqual(pinned[0]["latitude"], OFFICE[0])
