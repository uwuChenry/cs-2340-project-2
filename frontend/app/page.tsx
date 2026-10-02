import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import { SectionTag } from "@/components/ui/PageHeading";
import Wood from "@/components/ui/Wood";
import { PipAvatar } from "@/components/Pip";
import Reveal from "@/components/Reveal";
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
    title: "Pocket it before you commit",
    body: "Tuck anything promising into your pockets, compare it side by side and on the map, then send the whole batch when you are ready.",
  },
  {
    title: "Watch your mailbox",
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
    title: "Tend one hiring garden",
    body: "Move applicants through stages, read their notes, and message the people you like without leaving the board.",
  },
];

const features = [
  {
    title: "Skill-based matching",
    body: "Each role shows how much of its required skill set you already have, so a strong fit is obvious at a glance.",
  },
  {
    title: "Search on a map",
    body: "Switch between the board, the map, or both. Set a walking distance and see which openings are genuinely close to home.",
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
  "Pocket roles, then apply to them all at once",
  "Track each application through its real stage",
  "Recruiters source candidates and run a pipeline",
  "You choose what your profile reveals",
];

const pillLink =
  "inline-flex items-center justify-center rounded-full px-[22px] py-[11px] font-display text-[16px] font-semibold no-underline hover:no-underline active:translate-y-[3px] active:shadow-none";

const primaryLink = `${pillLink} bg-accent text-white hover:text-white shadow-[0_4px_0_var(--color-accent-deep)]`;

const secondaryLink = `${pillLink} bg-paper text-ink-2 hover:text-ink shadow-[0_4px_0_#D9C59A]`;

function Eyebrow({ children }: { children: ReactNode }) {
  return <SectionTag className="mb-3">{children}</SectionTag>;
}

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="m-0 p-0 list-none flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3.5">
          <span className="shrink-0 w-[32px] h-[32px] rounded-full bg-sun shadow-[0_3px_0_var(--color-sun-edge)] grid place-items-center font-display text-[15px] font-semibold text-sun-ink">
            {i + 1}
          </span>
          <div>
            <div className="font-display text-[17px] font-semibold text-ink mb-1">{step.title}</div>
            <p className="m-0 text-[14.5px] font-semibold leading-[1.6] text-muted">{step.body}</p>
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
        <Eyebrow>Welcome to Roster</Eyebrow>
        <h1 className="m-0 max-w-[760px] font-display text-[40px] sm:text-[52px] leading-[1.05] font-semibold text-area-ink">
          The job search should start with what you can do.
        </h1>
        <p className="mt-5 mb-0 max-w-[620px] text-[17.5px] font-bold leading-[1.6] text-area-ink-2">
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
          <dl className="m-0 mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col bg-paper rounded-[22px] px-5 py-4 shadow-[0_5px_0_var(--color-edge)]">
                <dt className="order-2 mt-1.5 text-[13.5px] font-bold text-muted">{stat.label}</dt>
                <dd className="order-1 m-0 font-display text-[32px] font-semibold leading-none text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* What this is */}
      <Reveal as="section">
        <Eyebrow>What this is</Eyebrow>
        <div className="flex flex-wrap gap-x-16 gap-y-8">
          <div className="flex-[1_1_420px] min-w-0 max-w-[620px]">
            <h2 className="m-0 font-display text-[28px] font-semibold text-area-ink">
              A marketplace for work, built for both sides of the table
            </h2>
            <p className="mt-4 mb-0 text-[16px] font-semibold leading-[1.7] text-area-ink-2">
              Most job boards are a search engine with a resume upload bolted on. You paste the same history into ten
              different forms, apply into a void, and find out months later that the posting was never real. Roster is a
              different shape: one profile that describes what you have done, one search that understands what a role
              needs, and a record of every application you have sent.
            </p>
            <p className="mt-4 mb-0 text-[16px] font-semibold leading-[1.7] text-area-ink-2">
              Recruiters get the same deal in reverse. Post a role with its real requirements and salary range, search
              for people by skill rather than keyword, and move applicants through a pipeline you can actually read.
              Both sides see the same facts, which is the whole point.
            </p>
          </div>

          <Card className="flex-[1_1_300px] min-w-0 max-w-[400px]">
            <div className="flex items-center gap-3 mb-4">
              <PipAvatar size={48} />
              <div className="font-display text-[19px] font-semibold text-ink">In short, from Pip</div>
            </div>
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {summary.map((item) => (
                <li key={item} className="flex gap-2.5 text-[14.5px] font-bold leading-[1.55] text-ink-3">
                  <span aria-hidden className="mt-[6px] shrink-0 w-2.5 h-2.5 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Reveal>

      {/* How it works */}
      <Reveal as="section">
        <Eyebrow>How it works</Eyebrow>
        <div className="flex flex-wrap gap-5">
          <Card className="flex-[1_1_360px] min-w-0 !p-6">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b-2 border-dashed border-line">
              <h2 className="m-0 font-display text-[21px] font-semibold text-ink">If you are looking for work</h2>
              <Link href="/search" className="text-[14px] whitespace-nowrap">
                To the board →
              </Link>
            </div>
            <StepList steps={seekerSteps} />
          </Card>

          <Card className="flex-[1_1_360px] min-w-0 !p-6">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3.5 border-b-2 border-dashed border-line">
              <h2 className="m-0 font-display text-[21px] font-semibold text-ink">If you are hiring</h2>
              <Link href="/recruiter/post" className="text-[14px] whitespace-nowrap">
                Post a role →
              </Link>
            </div>
            <StepList steps={recruiterSteps} />
          </Card>
        </div>
      </Reveal>

      {/* Features */}
      <Reveal as="section">
        <Eyebrow>Why people use it</Eyebrow>
        <h2 className="m-0 mb-6 font-display text-[28px] font-semibold text-area-ink">
          The parts that save you the most time
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <div className="font-display text-[18px] font-semibold text-ink mb-2">{feature.title}</div>
              <p className="m-0 text-[14.5px] font-semibold leading-[1.6] text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </Reveal>

      {/* Closing */}
      <Reveal>
        <Wood big className="px-7 py-10 text-center">
          <h2 className="m-0 font-display text-[28px] font-semibold text-paper">
            {openRoles ? `${openRoles} postings are pinned up right now` : "Postings are pinned up right now"}
          </h2>
          <p className="mt-3 mb-0 mx-auto max-w-[480px] text-[16px] font-bold leading-[1.6] text-paper/90">
            Set your filters once and see which of them match your skills, your range and your walk to work.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/search" className={primaryLink}>
              Go to the board
            </Link>
            <Link href="/profile" className={secondaryLink}>
              Set up your house
            </Link>
          </div>
        </Wood>
      </Reveal>
    </div>
  );
}
