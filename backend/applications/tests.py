from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from applications.models import Application, ShortlistItem
from jobs.models import JobPosting
from profiles.models import Company, Profile, RecruiterProfile, SeekerProfile, Skill

PASSWORD = "correct-horse-battery-42"


class SeekerFlowTests(APITestCase):
    """Shortlist, apply and the tracker, as a signed-in job seeker."""

    def setUp(self):
        recruiter_user = User.objects.create_user("rec", password=PASSWORD)
        Profile.objects.create(user=recruiter_user, role=Profile.Role.RECRUITER)
        company = Company.objects.create(name="Globex")
        self.recruiter = RecruiterProfile.objects.create(user=recruiter_user, company=company)

        def job(title, status=JobPosting.Status.PUBLISHED):
            return JobPosting.objects.create(
                recruiter=self.recruiter, company=company, title=title, description="d",
                city="Austin", status=status,
            )

        self.a, self.b, self.c = job("A"), job("B"), job("C")
        self.draft = job("Draft", JobPosting.Status.DRAFT)

        seeker_user = User.objects.create_user("seeker", password=PASSWORD)
        Profile.objects.create(user=seeker_user, role=Profile.Role.JOB_SEEKER)
        self.seeker = SeekerProfile.objects.create(user=seeker_user)
        self.client.login(username="seeker", password=PASSWORD)

    def shortlisted_titles(self):
        return sorted(item["job"]["title"] for item in self.client.get("/api/shortlist/").data)

    # ---- shortlist

    def test_add_list_and_remove(self):
        self.assertEqual(self.client.post("/api/shortlist/", {"job": self.a.pk}, format="json").status_code, 201)
        self.client.post("/api/shortlist/", {"job": self.b.pk}, format="json")
        self.assertEqual(self.shortlisted_titles(), ["A", "B"])

        self.assertEqual(self.client.delete(f"/api/shortlist/{self.a.pk}/").status_code, 204)
        self.assertEqual(self.shortlisted_titles(), ["B"])
        self.assertEqual(self.client.delete(f"/api/shortlist/{self.a.pk}/").status_code, 404)

    def test_adding_twice_is_idempotent(self):
        self.client.post("/api/shortlist/", {"job": self.a.pk}, format="json")
        self.assertEqual(self.client.post("/api/shortlist/", {"job": self.a.pk}, format="json").status_code, 200)
        self.assertEqual(ShortlistItem.objects.filter(seeker=self.seeker).count(), 1)

    def test_clear_uses_the_clear_route(self):
        """Regression: the frontend once called DELETE /api/shortlist/, which is not a route."""
        for job in (self.a, self.b):
            self.client.post("/api/shortlist/", {"job": job.pk}, format="json")

        self.assertEqual(self.client.delete("/api/shortlist/").status_code, 405)
        self.assertEqual(self.shortlisted_titles(), ["A", "B"])

        response = self.client.delete("/api/shortlist/clear/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["removed"], 2)
        self.assertEqual(self.shortlisted_titles(), [])

    def test_cannot_shortlist_a_draft_or_missing_job(self):
        self.assertEqual(self.client.post("/api/shortlist/", {"job": self.draft.pk}, format="json").status_code, 404)
        self.assertEqual(self.client.post("/api/shortlist/", {"job": 99999}, format="json").status_code, 404)

    def test_shortlist_is_private_to_each_seeker(self):
        self.client.post("/api/shortlist/", {"job": self.a.pk}, format="json")
        other = User.objects.create_user("other", password=PASSWORD)
        Profile.objects.create(user=other, role=Profile.Role.JOB_SEEKER)
        SeekerProfile.objects.create(user=other)
        self.client.login(username="other", password=PASSWORD)
        self.assertEqual(self.shortlisted_titles(), [])

    # ---- apply

    def test_apply_creates_then_updates_the_same_application(self):
        first = self.client.post("/api/applications/apply/", {"job": self.a.pk}, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["stage"], "Applied")

        # "Apply, then add a note" is the UI flow: the second call updates, not duplicates.
        second = self.client.post("/api/applications/apply/", {"job": self.a.pk, "note": "Hello"}, format="json")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["note"], "Hello")
        self.assertEqual(Application.objects.filter(applicant=self.seeker).count(), 1)

    def test_note_is_capped_at_400_characters(self):
        response = self.client.post("/api/applications/apply/", {"job": self.a.pk, "note": "x" * 401}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_applying_removes_the_job_from_the_shortlist(self):
        self.client.post("/api/shortlist/", {"job": self.a.pk}, format="json")
        self.client.post("/api/applications/apply/", {"job": self.a.pk}, format="json")
        self.assertEqual(self.shortlisted_titles(), [])

    def test_cannot_apply_to_a_draft(self):
        self.assertEqual(self.client.post("/api/applications/apply/", {"job": self.draft.pk}, format="json").status_code, 404)

    def test_apply_all_skips_jobs_already_applied_to(self):
        self.client.post("/api/applications/apply/", {"job": self.a.pk}, format="json")
        for job in (self.a, self.b):
            self.client.post("/api/shortlist/", {"job": job.pk}, format="json")

        response = self.client.post("/api/applications/apply-all/", {"jobs": [self.a.pk, self.b.pk]}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual((response.data["created"], response.data["alreadyApplied"]), (1, 1))
        self.assertEqual(Application.objects.filter(applicant=self.seeker).count(), 2)
        self.assertEqual(self.shortlisted_titles(), [])

    def test_apply_all_with_no_jobs_means_the_whole_shortlist(self):
        for job in (self.a, self.b, self.c):
            self.client.post("/api/shortlist/", {"job": job.pk}, format="json")
        response = self.client.post("/api/applications/apply-all/", {}, format="json")
        self.assertEqual(response.data["created"], 3)

    # ---- tracker

    def test_tracker_lists_only_my_applications_with_stage_index(self):
        self.client.post("/api/applications/apply/", {"job": self.a.pk}, format="json")
        Application.objects.filter(applicant=self.seeker).update(status=Application.Status.INTERVIEW)

        rows = self.client.get("/api/applications/").data
        self.assertEqual([(r["title"], r["stage"], r["stageIndex"]) for r in rows], [("A", "Interview", 2)])

        other = User.objects.create_user("other", password=PASSWORD)
        Profile.objects.create(user=other, role=Profile.Role.JOB_SEEKER)
        SeekerProfile.objects.create(user=other)
        self.client.login(username="other", password=PASSWORD)
        self.assertEqual(self.client.get("/api/applications/").data, [])

    # ---- who may do this

    def test_recruiters_and_signed_out_visitors_are_refused(self):
        self.client.login(username="rec", password=PASSWORD)
        self.assertEqual(self.client.post("/api/applications/apply/", {"job": self.a.pk}, format="json").status_code, 403)
        self.assertEqual(self.client.get("/api/shortlist/").status_code, 403)

        self.client.logout()
        self.assertIn(self.client.get("/api/shortlist/").status_code, (401, 403))

    def test_matching_uses_seeker_skills(self):
        react = Skill.objects.create(name="React")
        self.a.skills.set([react])
        self.seeker.skills.set([react])
        listing = {r["title"]: r for r in self.client.get("/api/jobs/").data["results"]}
        self.assertEqual(listing["A"]["matchPct"], 100)
        self.assertTrue(listing["A"]["recommended"])
        self.assertEqual(listing["B"]["matchPct"], 0)
