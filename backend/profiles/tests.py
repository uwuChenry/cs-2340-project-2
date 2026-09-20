from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from jobs.models import JobPosting
from profiles.models import Company, Profile, RecruiterProfile, SeekerProfile, Skill

STRONG = "correct-horse-battery-42"


def seeker_payload(**overrides):
    return {
        "username": "newseeker", "password": STRONG, "email": "s@example.test",
        "firstName": "Sam", "lastName": "Seeker", "role": "job_seeker", **overrides,
    }


def recruiter_payload(**overrides):
    return {
        "username": "newrecruiter", "password": STRONG, "email": "r@example.test",
        "firstName": "Riley", "lastName": "Recruiter", "role": "recruiter",
        "company": "Acme Robotics", "title": "Talent Partner", **overrides,
    }


class RegisterTests(APITestCase):
    url = "/api/auth/register/"

    def test_seeker_signup_creates_profiles_and_signs_in(self):
        response = self.client.post(self.url, seeker_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "job_seeker")
        self.assertEqual(response.data["name"], "Sam Seeker")
        user = User.objects.get(username="newseeker")
        self.assertEqual(Profile.objects.get(user=user).role, Profile.Role.JOB_SEEKER)
        self.assertTrue(SeekerProfile.objects.filter(user=user).exists())
        self.assertFalse(RecruiterProfile.objects.filter(user=user).exists())

        # The session cookie from registering is enough to load the profile.
        self.assertEqual(self.client.get("/api/auth/session/").data["user"]["username"], "newseeker")
        self.assertEqual(self.client.get("/api/profile/").status_code, 200)

    def test_seeker_defaults_are_private_by_default(self):
        self.client.post(self.url, seeker_payload(), format="json")
        privacy = self.client.get("/api/profile/").data["privacy"]
        self.assertFalse(privacy["contact"])

    def test_recruiter_signup_creates_company_and_profile(self):
        response = self.client.post(self.url, recruiter_payload(), format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "recruiter")
        recruiter = RecruiterProfile.objects.get(user__username="newrecruiter")
        self.assertEqual(recruiter.company.name, "Acme Robotics")
        self.assertEqual(recruiter.title, "Talent Partner")
        self.assertEqual(self.client.get("/api/recruiter/jobs/").status_code, 200)

    def test_second_recruiter_reuses_existing_company_ignoring_case(self):
        Company.objects.create(name="Acme Robotics")
        self.client.post(self.url, recruiter_payload(company="acme robotics"), format="json")
        self.assertEqual(Company.objects.filter(name__iexact="acme robotics").count(), 1)

    def test_recruiter_must_name_a_company(self):
        response = self.client.post(self.url, recruiter_payload(company="  "), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("company", response.data)
        self.assertFalse(User.objects.filter(username="newrecruiter").exists())

    def test_cannot_sign_up_as_administrator(self):
        response = self.client.post(self.url, seeker_payload(role="admin"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("role", response.data)
        self.assertFalse(User.objects.filter(username="newseeker").exists())

    def test_username_taken_ignoring_case(self):
        User.objects.create_user("Taken", password=STRONG)
        response = self.client.post(self.url, seeker_payload(username="taken"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)

    def test_weak_password_rejected_with_reasons(self):
        response = self.client.post(self.url, seeker_payload(password="12345678"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(response.data["password"])

    def test_password_too_similar_to_username_rejected(self):
        response = self.client.post(
            self.url, seeker_payload(username="samseeker", password="samseeker1"), format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_email_required_and_validated(self):
        self.assertIn("email", self.client.post(self.url, seeker_payload(email=""), format="json").data)
        self.assertIn("email", self.client.post(self.url, seeker_payload(email="nope"), format="json").data)

    def test_all_problems_are_reported_in_one_response(self):
        User.objects.create_user("taken", password=STRONG)
        response = self.client.post(self.url, recruiter_payload(
            username="taken", password="12345678", email="bad", company="",
        ), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual({"username", "password", "email", "company"}, set(response.data))

    def test_failed_signup_leaves_no_half_created_account(self):
        self.client.post(self.url, recruiter_payload(company=""), format="json")
        self.assertEqual(User.objects.count(), 0)


class SeekerProfileEditingTests(APITestCase):
    def setUp(self):
        self.client.post("/api/auth/register/", seeker_payload(), format="json")
        self.seeker = SeekerProfile.objects.get(user__username="newseeker")

    def test_experience_create_edit_delete(self):
        created = self.client.post("/api/profile/experience/", {
            "company": "Initech", "title": "Engineer", "startDate": "2021-03-01",
            "description": "Built things.",
        }, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertTrue(created.data["isCurrent"])
        self.assertEqual(self.seeker.experience.count(), 1)

        pk = created.data["id"]
        patched = self.client.patch(f"/api/profile/experience/{pk}/", {"endDate": "2023-06-30"}, format="json")
        self.assertEqual(patched.status_code, 200)
        self.assertFalse(patched.data["isCurrent"])

        self.assertEqual(self.client.get("/api/profile/").data["experience"][0]["company"], "Initech")
        self.assertEqual(self.client.delete(f"/api/profile/experience/{pk}/").status_code, 204)
        self.assertEqual(self.seeker.experience.count(), 0)

    def test_experience_end_before_start_rejected_on_create_and_patch(self):
        bad = self.client.post("/api/profile/experience/", {
            "company": "X", "title": "Y", "startDate": "2022-01-01", "endDate": "2021-01-01",
        }, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("endDate", bad.data)

        ok = self.client.post("/api/profile/experience/", {
            "company": "X", "title": "Y", "startDate": "2022-01-01",
        }, format="json")
        patched = self.client.patch(
            f"/api/profile/experience/{ok.data['id']}/", {"endDate": "2020-01-01"}, format="json",
        )
        self.assertEqual(patched.status_code, 400)

    def test_experience_requires_company_title_and_start(self):
        response = self.client.post("/api/profile/experience/", {"company": "X"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual({"title", "startDate"}, set(response.data))

    def test_education_links_and_projects(self):
        edu = self.client.post("/api/profile/education/", {
            "school": "UT Austin", "degree": "B.S.", "fieldOfStudy": "CS",
            "startYear": 2017, "graduationYear": 2021,
        }, format="json")
        self.assertEqual(edu.status_code, 201)
        bad_years = self.client.post("/api/profile/education/", {
            "school": "S", "degree": "D", "startYear": 2021, "graduationYear": 2017,
        }, format="json")
        self.assertEqual(bad_years.status_code, 400)
        out_of_range = self.client.post("/api/profile/education/", {
            "school": "S", "degree": "D", "graduationYear": 1200,
        }, format="json")
        self.assertEqual(out_of_range.status_code, 400)

        link = self.client.post("/api/profile/links/", {"label": "GitHub", "url": "https://github.com/x"}, format="json")
        self.assertEqual(link.status_code, 201)
        self.assertEqual(self.client.post("/api/profile/links/", {"label": "Bad", "url": "not a url"}, format="json").status_code, 400)
        self.assertEqual(
            self.client.post("/api/profile/links/", {"label": "XSS", "url": "javascript:alert(1)"}, format="json").status_code, 400,
        )

        project = self.client.post("/api/profile/projects/", {"name": "Map", "description": "d"}, format="json")
        self.assertEqual(project.status_code, 201)

        profile = self.client.get("/api/profile/").data
        self.assertEqual(len(profile["education"]), 1)
        self.assertEqual(len(profile["links"]), 1)
        self.assertEqual(len(profile["projects"]), 1)

    def test_cannot_touch_another_seekers_entries(self):
        other = User.objects.create_user("other", password=STRONG)
        Profile.objects.create(user=other, role=Profile.Role.JOB_SEEKER)
        theirs = SeekerProfile.objects.create(user=other)
        entry = theirs.experience.create(company_name="Secret", title="T", start_date="2020-01-01")

        for method in (self.client.get, self.client.delete):
            self.assertEqual(method(f"/api/profile/experience/{entry.pk}/").status_code, 404)
        self.assertEqual(
            self.client.patch(f"/api/profile/experience/{entry.pk}/", {"title": "Hacked"}, format="json").status_code, 404,
        )
        entry.refresh_from_db()
        self.assertEqual(entry.title, "T")
        self.assertEqual(self.client.get("/api/profile/experience/").data, [])

    def test_skills_are_case_insensitive_deduplicated_and_reuse_rows(self):
        Skill.objects.create(name="React")
        response = self.client.patch(
            "/api/profile/", {"skills": ["react", "  React ", "Rust", "rust"]}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(sorted(response.data["skills"]), ["React", "Rust"])
        self.assertEqual(Skill.objects.filter(name__iexact="react").count(), 1)

    def test_skills_must_be_a_list_of_short_strings(self):
        self.assertEqual(self.client.patch("/api/profile/", {"skills": "React"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch("/api/profile/", {"skills": ["React", ""]}, format="json").status_code, 400)
        self.assertEqual(self.client.patch("/api/profile/", {"skills": ["x" * 101]}, format="json").status_code, 400)
        self.assertEqual(self.client.patch("/api/profile/", {"skills": [f"s{i}" for i in range(51)]}, format="json").status_code, 400)

    def test_details_name_location_and_coordinates(self):
        response = self.client.patch("/api/profile/", {
            "firstName": "Samantha", "headline": "Engineer", "about": "Hi", "location": "Austin, TX",
            "latitude": "30.267153", "longitude": "-97.743057",
            "salaryExpectation": "$150k", "noticePeriod": "2 weeks", "openToRemote": False,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "Samantha Seeker")
        self.assertEqual(self.client.get("/api/auth/session/").data["user"]["name"], "Samantha Seeker")
        self.assertEqual(response.data["latitude"], "30.267153")
        self.assertFalse(response.data["openToRemote"])

    def test_coordinates_out_of_range_rejected(self):
        self.assertEqual(self.client.patch("/api/profile/", {"latitude": "91"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch("/api/profile/", {"longitude": "-181"}, format="json").status_code, 400)

    def test_privacy_toggle_still_works(self):
        response = self.client.patch("/api/profile/", {"privacy": {"contact": True}}, format="json")
        self.assertTrue(response.data["privacy"]["contact"])

    def test_recruiter_account_cannot_use_seeker_profile_endpoints(self):
        self.client.post("/api/auth/logout/")
        self.client.post("/api/auth/register/", recruiter_payload(), format="json")
        self.assertEqual(self.client.get("/api/profile/experience/").status_code, 403)
        self.assertEqual(self.client.post("/api/profile/links/", {"label": "a", "url": "https://a.test"}, format="json").status_code, 403)

    def test_signed_out_is_refused(self):
        self.client.post("/api/auth/logout/")
        self.assertIn(self.client.get("/api/profile/experience/").status_code, (401, 403))

    def test_new_seeker_can_apply_after_filling_in_profile(self):
        """The whole point of the profile: a fresh account can find and match a role."""
        recruiter_user = User.objects.create_user("rec", password=STRONG)
        Profile.objects.create(user=recruiter_user, role=Profile.Role.RECRUITER)
        company = Company.objects.create(name="Globex")
        recruiter = RecruiterProfile.objects.create(user=recruiter_user, company=company)
        job = JobPosting.objects.create(
            recruiter=recruiter, company=company, title="Rustacean", description="d", city="Austin",
            status=JobPosting.Status.PUBLISHED,
        )
        job.skills.set([Skill.objects.get_or_create(name="Rust")[0]])

        self.client.patch("/api/profile/", {"skills": ["rust"]}, format="json")
        listing = self.client.get("/api/jobs/").data["results"][0]
        self.assertEqual(listing["matchPct"], 100)
        self.assertEqual(self.client.post("/api/applications/apply/", {"job": job.pk}, format="json").status_code, 201)


class RecruiterProfileTests(APITestCase):
    def setUp(self):
        self.client.post("/api/auth/register/", recruiter_payload(), format="json")

    def test_get_and_patch(self):
        profile = self.client.get("/api/recruiter/profile/").data
        self.assertEqual(profile["company"], "Acme Robotics")
        self.assertEqual(profile["title"], "Talent Partner")

        response = self.client.patch("/api/recruiter/profile/", {
            "firstName": "Rileigh", "title": "Head of Talent", "companyWebsite": "https://acme.test",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "Rileigh Recruiter")
        self.assertEqual(response.data["companyWebsite"], "https://acme.test")
        self.assertEqual(Company.objects.get(name="Acme Robotics").website, "https://acme.test")

    def test_company_name_is_not_editable_here(self):
        self.client.patch("/api/recruiter/profile/", {"company": "Hijacked"}, format="json")
        self.assertTrue(Company.objects.filter(name="Acme Robotics").exists())
        self.assertFalse(Company.objects.filter(name="Hijacked").exists())

    def test_seeker_is_refused(self):
        self.client.post("/api/auth/logout/")
        self.client.post("/api/auth/register/", seeker_payload(), format="json")
        self.assertEqual(self.client.get("/api/recruiter/profile/").status_code, 403)

    def test_recruiter_job_skills_reuse_existing_rows_case_insensitively(self):
        Skill.objects.create(name="React")
        response = self.client.post("/api/recruiter/jobs/", {
            "title": "T", "description": "d", "city": "Austin", "skills": ["react", "Go"],
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(sorted(response.data["skills"]), ["Go", "React"])
        self.assertEqual(Skill.objects.filter(name__iexact="react").count(), 1)


class RecruiterSeesOnlyApproximateLocationTests(APITestCase):
    """A seeker's pinned position is exact; what recruiters receive is not."""

    def setUp(self):
        self.client.post("/api/auth/register/", recruiter_payload(), format="json")
        self.recruiter = RecruiterProfile.objects.get(user__username="newrecruiter")
        self.job = JobPosting.objects.create(
            recruiter=self.recruiter, company=self.recruiter.company, title="T", description="d",
            city="Austin", status=JobPosting.Status.PUBLISHED,
        )
        seeker_user = User.objects.create_user("pinned", password=STRONG)
        Profile.objects.create(user=seeker_user, role=Profile.Role.JOB_SEEKER)
        self.seeker = SeekerProfile.objects.create(
            user=seeker_user, latitude="30.267153", longitude="-97.743057", location="Austin, TX",
        )
        self.application = self.seeker.applications.create(job=self.job)

    def test_pipeline_and_detail_round_coordinates(self):
        pipeline = self.client.get(f"/api/recruiter/jobs/{self.job.pk}/pipeline/").data
        card = next(c for col in pipeline["columns"] for c in col["candidates"])
        self.assertEqual((card["latitude"], card["longitude"]), (30.27, -97.74))

        detail = self.client.get(f"/api/recruiter/applications/{self.application.pk}/").data
        self.assertEqual((detail["latitude"], detail["longitude"]), (30.27, -97.74))

    def test_candidate_search_rounds_coordinates(self):
        result = self.client.get("/api/recruiter/candidates/").data["results"][0]
        self.assertEqual((result["latitude"], result["longitude"]), (30.27, -97.74))

    def test_cluster_map_rounds_coordinates(self):
        point = self.client.get(f"/api/recruiter/jobs/{self.job.pk}/clusters/").data["points"][0]
        self.assertEqual((point["latitude"], point["longitude"]), (30.27, -97.74))

    def test_seeker_still_sees_their_own_exact_pin(self):
        self.client.post("/api/auth/logout/")
        self.client.login(username="pinned", password=STRONG)
        own = self.client.get("/api/profile/").data
        self.assertEqual((own["latitude"], own["longitude"]), ("30.267153", "-97.743057"))
