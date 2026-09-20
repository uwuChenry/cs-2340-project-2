import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import { skillFilterOptions } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Roster | Where skills meet openings",
  description:
    "Roster is a job marketplace built around what you can actually do. Search roles by skill, salary and distance, shortlist before you apply, and track every application in one place.",
};

// Rendered on the server, so it talks to the API directly rather than through
// the browser client. If the backend is down the numbers are simply left out
// instead of failing the whole landing page.
const API_ORIGIN = process.env.API_URL ?? "http://127.0.0.1:8000";

async function countJobs(query: string): Promise<number> {
  const response = await fetch(`${API_ORIGIN}/api/jobs/?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`jobs count failed: ${response.status}`);
  return (await response.json()).count as number;
}

async function loadStats() {
  try {
    const [open, remote, visa] = await Promise.all([countJobs(""), countJobs("setup=remote"), countJobs("visa=true")]);
    return [
      { value: `${open}`, label: "Open roles listed" },
      { value: `${remote}`, label: "Fully remote" },
      { value: `${visa}`, label: "Offer visa sponsorship" },
      { value: `${skillFilterOptions.length}`, label: "Skill filters" },
    ];
  } catch {
    return null;
  }
}

const seekerSteps = [
  {
    title: "Filter by what you actually have",
    body: "Pick your skills, a salary floor, a commute radius and a work setup. Roster ranks the roles that overlap with your profile instead of the ones that paid to rank.",
  },
  {
    title: "Shortlist before you commit",
    body: "Save anything promising to a shortlist, compare it against the map, then apply to the whole batch when you are ready.",
  },
  {
    title: "Watch the application move",
    body: "Every application shows its real stage — applied, review, interview, offer — so you always know which conversations are still alive.",
  },
];

const recruiterSteps = [
  {
    title: "Post the role once",
    body: "Describe the work, tag the required skills, set the range and the location. The posting immediately becomes searchable and mappable.",
  },
  {
    title: "Search candidates by skill",
    body: "Find people by the skills, projects and experience on their profile — not by keyword-stuffed resumes.",
  },
  {
    title: "Run one clean pipeline",
    body: "Move applicants through stages, leave notes, and message a shortlist without leaving the board.",
  },
];

const features = [
  {
    title: "Skill-based matching",
    body: "Each role shows how much of its required skill set you already have, so a strong fit is obvious at a glance.",
  },
  {
    title: "Search on a map",
    body: "Switch between list, split and map views. Set a radius and see which openings are genuinely within your commute.",
  },
  {
    title: "Salary ranges up front",
    body: "Every listing publishes a range. Filter by your floor and stop reading postings that were never going to work.",
  },
  {
    title: "Visa sponsorship filter",
    body: "Sponsorship is a first-class filter, not a line buried at the bottom of a job description.",
  },
  {
    title: "Privacy you control",
    body: "Decide what recruiters can see — your name, contact details, current employer — and flip your open-to-work status any time.",
  },
  {
    title: "Reporting and moderation",
    body: "Report a misleading posting or a bad actor and an administrator reviews it. Fewer ghost jobs, fewer scams.",
  },
];

const summary = [
  "Search roles by skill, salary, setup and radius",
  "See a skill-match score on every listing",
  "Shortlist roles, then apply in one pass",
  "Track each application through its real stage",
  "Recruiters source candidates and run a pipeline",
  "You choose what your profile reveals",
];

const primaryLink =
  "inline-flex items-center justify-center rounded-lg px-[18px] py-[11px] text-[14.5px] font-medium no-underline hover:no-underline border border-transparent transition-colors duration-150 bg-ink text-ground hover:bg-ink-2";

const accentLink =
  "inline-flex items-center justify-center rounded-lg px-[18px] py-[11px] text-[14.5px] font-medium no-underline hover:no-underline border border-transparent transition-colors duration-150 bg-accent text-white hover:bg-accent-deep";

const secondaryLink =
  "inline-flex items-center justify-center rounded-lg px-[18px] py-[11px] text-[14.5px] font-medium no-underline hover:no-underline border border-line-strong transition-colors duration-150 bg-surface text-ink hover:bg-hover-fill";

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2.5">{children}</div>;
}

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="m-0 p-0 list-none flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3.5">
          <span className="shrink-0 w-[26px] h-[26px] rounded-lg bg-surface-tint border border-line grid place-items-center font-mono text-[12px] text-ink-3">
            {i + 1}
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em] mb-1">{step.title}</div>
            <p className="m-0 text-[14px] leading-[1.6] text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function Home() {
  const stats = await loadStats();
  const openRoles = stats?.[0].value;
  return (
    <div className="flex flex-col gap-[72px] pb-4">
      {/* Hero */}
      <section className="pt-6">
        <Eyebrow>Roster · job marketplace</Eyebrow>
        <h1 className="m-0 max-w-[760px] text-[38px] sm:text-[46px] leading-[1.08] font-semibold tracking-[-0.03em]">
          The job search should start with what you can do.
        </h1>
        <p className="mt-5 mb-0 max-w-[620px] text-[17px] leading-[1.65] text-muted">
          Roster matches people to openings by skill, salary and distance — then keeps the whole thing in one place, from
          the first search to the offer. No endless tabs, no reposted listings, no guessing where your application went.
        </p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link href="/search" className={primaryLink}>
            Browse open roles
          </Link>
          <Link href="/recruiter/post" className={secondaryLink}>
            I&rsquo;m hiring
          </Link>
        </div>

        {stats && (
          <dl className="m-0 mt-10 pt-7 border-t border-line grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dt className="order-2 mt-2 text-[13px] text-muted-2">{stat.label}</dt>
                <dd className="order-1 m-0 text-[28px] font-semibold tracking-[-0.03em] leading-none">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* What this is */}
      <section>
        <Eyebrow>What this is</Eyebrow>
        <div className="flex flex-wrap gap-x-16 gap-y-8">
          <div className="flex-[1_1_420px] min-w-0 max-w-[620px]">
            <h2 className="m-0 text-[26px] font-semibold tracking-[-0.025em]">
              A marketplace for work, built for both sides of the table
            </h2>
            <p className="mt-4 mb-0 text-[15.5px] leading-[1.7] text-ink-3">
              Most job boards are a search engine with a resume upload bolted on. You paste the same history into ten
              different forms, apply into a void, and find out months later that the posting was never real. Roster is a
              different shape: one profile that describes what you have done, one search that understands what a role
              needs, and a record of every application you have sent.
            </p>
            <p className="mt-4 mb-0 text-[15.5px] leading-[1.7] text-ink-3">
              Recruiters get the same deal in reverse. Post a role with its real requirements and salary range, search
              for people by skill rather than keyword, and move applicants through a pipeline you can actually read.
              Both sides see the same facts, which is the whole point.
            </p>
          </div>

          <Card className="flex-[1_1_300px] min-w-0 max-w-[400px]">
            <div className="text-sm font-semibold mb-3.5">In short</div>
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {summary.map((item) => (
                <li key={item} className="flex gap-2.5 text-[14px] leading-[1.55] text-ink-3">
                  <span aria-hidden className="mt-[7px] shrink-0 w-1.5 h-1.5 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section>
        <Eyebrow>How it works</Eyebrow>
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          <div className="flex-[1_1_360px] min-w-0">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b border-line">
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.02em]">If you are looking for work</h2>
              <Link href="/search" className="text-[13px] font-medium no-underline hover:no-underline whitespace-nowrap">
                Start searching →
              </Link>
            </div>
            <StepList steps={seekerSteps} />
          </div>

          <div className="flex-[1_1_360px] min-w-0">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b border-line">
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.02em]">If you are hiring</h2>
              <Link
                href="/recruiter/post"
                className="text-[13px] font-medium no-underline hover:no-underline whitespace-nowrap"
              >
                Post a role →
              </Link>
            </div>
            <StepList steps={recruiterSteps} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <Eyebrow>Why people use it</Eyebrow>
        <h2 className="m-0 mb-6 text-[26px] font-semibold tracking-[-0.025em]">
          The parts that save you the most time
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {features.map((feature) => (
            <Card key={feature.title}>
              <div className="text-[15px] font-semibold tracking-[-0.01em] mb-2">{feature.title}</div>
              <p className="m-0 text-[14px] leading-[1.6] text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="rounded-xl border border-line bg-surface-sunken px-7 py-10 text-center">
        <h2 className="m-0 text-[24px] font-semibold tracking-[-0.025em]">{openRoles ? `${openRoles} roles are open right now` : "Roles are open right now"}</h2>
        <p className="mt-3 mb-0 mx-auto max-w-[480px] text-[15px] leading-[1.65] text-muted">
          Set your filters once and see which of them match your skills, your range and your commute.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/search" className={accentLink}>
            Browse open roles
          </Link>
          <Link href="/profile" className={secondaryLink}>
            Set up your profile
          </Link>
        </div>
      </section>
    </div>
  );
}
