"""Seed the database with the demo data the frontend prototype was built against.

The figures come from frontend/lib/mockData.ts so the two sides line up while the
UI is being wired to real endpoints. Coordinates are real Austin-area points, not
the prototype's hardcoded map percentages, so distance filtering actually works.
"""

from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from applications.models import Application, ShortlistItem
from jobs.models import JobPosting, SavedSearch
from messaging.models import Message, Thread
from profiles.models import (
    Company,
    Education,
    Experience,
    Profile,
    ProfileLink,
    Project,
    RecruiterProfile,
    SeekerProfile,
    Skill,
)

DEMO_PASSWORD = "demo12345"

SKILLS = [
    "React", "TypeScript", "Node", "Mapbox", "Accessibility", "GraphQL",
    "Design Systems", "Figma", "Testing", "WebGL", "Postgres", "Experimentation",
]

COMPANIES = [
    ("Northline Labs", "#1B4DFF"),
    ("Havenly", "#1F5A41"),
    ("Cartwheel", "#8A3E1E"),
    ("Mesa Point", "#4A4A8C"),
    ("Terrafold", "#1A1917"),
    ("Kestrel Health", "#0F6C7A"),
    ("Orrick Data", "#6B3FA0"),
]

# title, company, city, state, lat, lng, salary_min, salary_max, arrangement,
# visa, skills, address, description
JOBS = [
    ("Senior Frontend Engineer", "Northline Labs", "Austin", "TX", 30.2787, -97.7464,
     150000, 185000, "hybrid", True, ["React", "TypeScript", "Mapbox", "Accessibility"],
     "1104 Rio Grande St",
     "Own the candidate-facing surfaces: search, map, and the application flow. "
     "Small team, weekly releases, real design partnership."),
    ("Product Engineer, Growth", "Havenly", "Austin", "TX", None, None,
     135000, 160000, "remote", False, ["React", "Node", "Experimentation"],
     "Fully distributed",
     "Run the experiment pipeline end to end, from hypothesis to shipped surface. "
     "You will work directly with the head of product."),
    ("UI Engineer, Design Systems", "Cartwheel", "Austin", "TX", 30.2669, -97.7458,
     140000, 170000, "on_site", True, ["TypeScript", "Design Systems", "Figma"],
     "300 W 6th St",
     "Maintain the component library used by nine product teams. Heavy emphasis on "
     "documentation and migration tooling."),
    ("Full Stack Engineer", "Mesa Point", "Round Rock", "TX", 30.5083, -97.6789,
     125000, 150000, "hybrid", False, ["Node", "Postgres", "React"],
     "2500 Hesters Crossing",
     "Backend-leaning full stack work on the scheduling service. Comfortable owning "
     "migrations and on-call rotation."),
    ("Frontend Engineer, Maps", "Terrafold", "Austin", "TX", 30.2594, -97.7550,
     145000, 175000, "hybrid", True, ["React", "Mapbox", "WebGL", "TypeScript"],
     "801 Barton Springs Rd",
     "Build interactive geospatial views for logistics planners. You will pair with "
     "data engineers on tile pipelines."),
    ("Senior Web Engineer", "Kestrel Health", "San Marcos", "TX", 29.8833, -97.9414,
     130000, 155000, "on_site", False, ["React", "Accessibility", "Testing"],
     "700 N LBJ Dr",
     "Patient-facing scheduling and records UI with a hard accessibility bar. "
     "WCAG 2.2 AA is a requirement, not a goal."),
    ("Staff Engineer, Platform UI", "Orrick Data", "Austin", "TX", None, None,
     180000, 215000, "remote", True, ["TypeScript", "GraphQL", "Design Systems"],
     "Fully distributed",
     "Set frontend direction across four product lines. Half architecture, half mentorship."),
]

# username, first, last, headline, location, lat, lng, skills, salary, notice
CANDIDATES = [
    ("draman", "Dev", "Raman", "Senior Frontend Engineer", "Austin, TX", 30.2711, -97.7437,
     ["React", "TypeScript", "Mapbox", "WebGL"], "$155k base", "4 weeks"),
    ("pshah", "Priya", "Shah", "UI Engineer", "Remote, CST", None, None,
     ["React", "Design Systems", "Figma", "Testing"], "$148k base", "2 weeks"),
    ("mbell", "Marcus", "Bell", "Product Engineer", "Round Rock, TX", 30.5083, -97.6789,
     ["React", "Node", "Postgres"], "$132k base", "Immediate"),
    ("lortiz", "Lena", "Ortiz", "Frontend Engineer", "Austin, TX", 30.2849, -97.7341,
     ["TypeScript", "Accessibility", "React"], "$138k base", "3 weeks"),
    ("tvieira", "Tomas", "Vieira", "Staff Engineer", "Remote, EST", None, None,
     ["GraphQL", "TypeScript", "Node"], "$190k base", "6 weeks"),
]

# Every demo candidate applies to the recruiter's flagship opening, which is what
# fills the pipeline board and the candidate list.
PIPELINE_JOB = "Senior Frontend Engineer"

CANDIDATE_APPLICATIONS = {
    "draman": ("review",
               "I spent the last two years on a logistics mapping product, mostly vector "
               "tiles and clustering at scale. Your posting is the first I have seen that "
               "treats the map as the primary surface rather than a tab."),
    "pshah": ("interview",
              "Design systems are my thing. I migrated 140 components off a legacy library "
              "last year without a freeze window."),
    "mbell": ("applied",
              "Generalist who likes owning a feature end to end. Happy to talk through the "
              "scheduling rewrite I led."),
    "lortiz": ("applied",
               "Accessibility is where I do my best work. I run the audit process at my "
               "current company."),
    "tvieira": ("offer",
                "Looking for a role with real architecture ownership after five years of "
                "platform work."),
}

# Maya's own tracker, mirroring baseApplications in mockData.ts.
SEEKER_TRACKER = [
    ("Frontend Engineer, Maps", "interview", "Onsite loop Thu"),
    ("UI Engineer, Design Systems", "review", "In review"),
    ("Staff Engineer, Platform UI", "offer", "Offer received"),
    ("Full Stack Engineer", "closed", "Role closed"),
]

# The prototype seeded its shortlist with these two.
SEEDED_SHORTLIST = ["Product Engineer, Growth", "Frontend Engineer, Maps"]

SAVED_SEARCHES = [
    ("React + Mapbox, Austin 25mi",
     {"skills": ["React", "Mapbox"], "location": "Austin", "radius": 25}, True),
    ("Design systems, remote US",
     {"skills": ["Design Systems"], "location": "Remote"}, False),
    ("New grads, accessibility focus",
     {"skills": ["Accessibility"]}, True),
]


class Command(BaseCommand):
    help = "Load demo companies, jobs, seekers, recruiters and applications."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing CareerConnect demo rows before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        skills = {name: Skill.objects.get_or_create(name=name)[0] for name in SKILLS}
        companies = {
            name: Company.objects.get_or_create(name=name, defaults={"logo_bg": bg})[0]
            for name, bg in COMPANIES
        }

        recruiter = self._make_recruiter(companies["Northline Labs"])
        self._make_jobs(companies, skills, recruiter)
        seeker = self._make_seeker(skills)
        self._make_candidates(skills)
        self._make_applications(seeker)
        self._make_saved_searches(recruiter.user)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Company.objects.count()} companies, {JobPosting.objects.count()} jobs, "
            f"{SeekerProfile.objects.count()} seekers, {Application.objects.count()} applications."
        ))
        self.stdout.write(
            f"Demo logins (password {DEMO_PASSWORD!r}): maya (seeker), rhodes (recruiter)"
        )

    def _flush(self):
        Message.objects.all().delete()
        Thread.objects.all().delete()
        Application.objects.all().delete()
        ShortlistItem.objects.all().delete()
        SavedSearch.objects.all().delete()
        JobPosting.objects.all().delete()
        SeekerProfile.objects.all().delete()
        RecruiterProfile.objects.all().delete()
        Company.objects.all().delete()
        Skill.objects.all().delete()
        User.objects.filter(
            username__in=["maya", "rhodes", *[c[0] for c in CANDIDATES]]
        ).delete()
        self.stdout.write("Flushed existing demo rows.")

    def _user(self, username, first, last, role):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first,
                "last_name": last,
                "email": f"{username}@example.test",
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        Profile.objects.get_or_create(user=user, defaults={"role": role})
        return user

    def _make_recruiter(self, company):
        user = self._user("rhodes", "Alex", "Rhodes", Profile.Role.RECRUITER)
        recruiter, _ = RecruiterProfile.objects.get_or_create(
            user=user,
            defaults={"company": company, "title": "Head of Talent"},
        )
        return recruiter

    def _make_jobs(self, companies, skills, recruiter):
        for (title, company_name, city, state, lat, lng, smin, smax, arrangement,
             visa, skill_names, address, description) in JOBS:
            job, created = JobPosting.objects.get_or_create(
                title=title,
                company=companies[company_name],
                defaults={
                    "recruiter": recruiter,
                    "description": description,
                    "city": city,
                    "state": state,
                    "latitude": lat,
                    "longitude": lng,
                    "salary_min": smin,
                    "salary_max": smax,
                    "work_arrangement": arrangement,
                    "offers_visa_sponsorship": visa,
                    "address": address,
                    "status": JobPosting.Status.PUBLISHED,
                    "level": "Senior" if ("Senior" in title or "Staff" in title) else "Mid",
                    "team_size": "8 engineers",
                },
            )
            if created:
                job.skills.set([skills[s] for s in skill_names])

    def _make_seeker(self, skills):
        user = self._user("maya", "Maya", "Ellison", Profile.Role.JOB_SEEKER)
        seeker, created = SeekerProfile.objects.get_or_create(
            user=user,
            defaults={
                "headline": "Frontend engineer focused on search, maps and accessible UI",
                "location": "Austin, TX",
                "latitude": 30.2672,
                "longitude": -97.7431,
                "open_to_remote": True,
                "salary_expectation": "$160k base",
                "notice_period": "4 weeks",
                # Matches the prototype's default privacy switches.
                "show_full_name": True,
                "show_contact": False,
                "show_current_employer": True,
                "open_to_work": True,
            },
        )
        if not created:
            return seeker

        seeker.skills.set([skills[s] for s in [
            "React", "TypeScript", "Mapbox", "Accessibility", "Node", "Testing",
            "GraphQL", "Figma",
        ]])
        Experience.objects.create(
            profile=seeker, company_name="Fielder Logistics", title="Frontend Engineer",
            start_date=date(2022, 1, 1), end_date=None,
            description="Owned the planner map surface: clustering, radius filters, and "
                        "offline tiles. Cut first-paint on the map view from 2.4s to 900ms.",
        )
        Experience.objects.create(
            profile=seeker, company_name="Basalt Software", title="Software Engineer",
            start_date=date(2020, 1, 1), end_date=date(2022, 1, 1),
            description="Built the design system used by three product teams and ran the "
                        "accessibility audit process.",
        )
        Education.objects.create(
            profile=seeker, school="University of Texas at Austin",
            degree="B.S. Computer Science", field_of_study="Computer Science",
            start_year=2017, graduation_year=2021,
        )
        ProfileLink.objects.create(profile=seeker, label="Portfolio",
                                   url="https://portfolio.mayae.dev")
        ProfileLink.objects.create(profile=seeker, label="GitHub",
                                   url="https://github.com/mayae")
        Project.objects.create(
            profile=seeker, name="Clustered map view",
            description="Rendered 40k records with Supercluster and offline vector tiles.",
            url="https://portfolio.mayae.dev/maps",
        )
        return seeker

    def _make_candidates(self, skills):
        for (username, first, last, headline, location, lat, lng,
             skill_names, salary, notice) in CANDIDATES:
            user = self._user(username, first, last, Profile.Role.JOB_SEEKER)
            profile, created = SeekerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "headline": headline,
                    "location": location,
                    "latitude": lat,
                    "longitude": lng,
                    "salary_expectation": salary,
                    "notice_period": notice,
                },
            )
            if created:
                profile.skills.set([skills[s] for s in skill_names])

    def _make_applications(self, seeker):
        pipeline_job = JobPosting.objects.filter(title=PIPELINE_JOB).first()
        if pipeline_job:
            for username, (status, note) in CANDIDATE_APPLICATIONS.items():
                profile = SeekerProfile.objects.filter(user__username=username).first()
                if profile:
                    Application.objects.get_or_create(
                        applicant=profile, job=pipeline_job,
                        defaults={"status": status, "tailored_note": note},
                    )

        for title, status, next_action in SEEKER_TRACKER:
            job = JobPosting.objects.filter(title=title).first()
            if job:
                Application.objects.get_or_create(
                    applicant=seeker, job=job,
                    defaults={"status": status, "next_action": next_action},
                )

        for title in SEEDED_SHORTLIST:
            job = JobPosting.objects.filter(title=title).first()
            if job:
                ShortlistItem.objects.get_or_create(seeker=seeker, job=job)

    def _make_saved_searches(self, recruiter_user):
        for name, filters, alerts in SAVED_SEARCHES:
            SavedSearch.objects.get_or_create(
                owner=recruiter_user,
                name=name,
                defaults={
                    "kind": SavedSearch.Kind.CANDIDATES,
                    "filters": filters,
                    "alerts_on": alerts,
                    "last_viewed_at": timezone.now() - timedelta(days=3),
                },
            )
