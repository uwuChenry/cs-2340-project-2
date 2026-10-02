"use client";

import { type CSSProperties, type ReactNode, type Ref, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { http, messageOf } from "@/lib/api";
import type { ApiJob, ApiPage } from "@/lib/apiTypes";
import { toJob } from "@/lib/adapters";
import type { Filters, Job, ViewMode } from "@/lib/types";
import { isNearby, salaryLabel, sortByRecommended } from "@/lib/derive";
import { PINNED_PAPERS, PINNED_TACKS, PINNED_TILTS, skillFilterOptions } from "@/lib/constants";
import { springBouncy, springSoft } from "@/lib/motion";
import { useAsync } from "@/lib/useAsync";
import { useDebounced } from "@/lib/useDebounced";
import { useAppState } from "@/state/AppState";
import { initialsOf, useAuth } from "@/state/AuthState";
import { CompanyMark } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { Label, RangeInput, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import PageHeading from "@/components/ui/PageHeading";
import PillTrack from "@/components/ui/PillTrack";
import Wood from "@/components/ui/Wood";
import { PipBubble } from "@/components/Pip";
import { JobsMapPanel } from "@/components/SchematicMap";

const viewModes: { id: ViewMode; label: string }[] = [
  { id: "list", label: "Board" },
  { id: "split", label: "Both" },
  { id: "map", label: "Map" },
];

const setupOptions: { id: "any" | "remote" | "onsite"; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "remote", label: "Remote" },
  { id: "onsite", label: "Onsite" },
];

// The filter panel keeps salary in thousands; the API filters in whole dollars.
function toQuery(f: Filters) {
  return {
    q: f.q.trim(),
    location: f.loc.trim(),
    skills: f.skills.join(","),
    setup: f.setup,
    min_salary: f.minSalary * 1000,
    visa: f.visa ? "true" : undefined,
    radius: f.radius,
  };
}

export default function SearchPage() {
  const {
    view,
    setView,
    filters,
    setFilter,
    toggleSkillFilter,
    resetFilters,
    cart,
    toggleCart,
    applied,
    applyJob,
    openJob,
    mySkills,
    seekerReady,
    showGuide,
  } = useAppState();
  const { user, ready } = useAuth();

  // Slider and text changes are debounced so dragging does not fire a request per step.
  const query = useDebounced(filters, 300);
  const queryKey = JSON.stringify(query);

  const first = useAsync(
    () => http.get<ApiPage<ApiJob>>("/api/jobs/", toQuery(query)),
    [queryKey, user?.id ?? null],
  );

  // Pages after the first are appended, and only count while they belong to the
  // current query: changing a filter makes `more` stale, so it is ignored.
  const [more, setMore] = useState<{ key: string; jobs: Job[]; page: number; hasMore: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const extra = more?.key === queryKey ? more : null;

  const jobs: Job[] = [...(first.data?.results.map(toJob) ?? []), ...(extra?.jobs ?? [])];
  const totalCount = first.data?.count ?? 0;
  const hasMore = extra ? extra.hasMore : !!first.data?.next;

  async function loadMore() {
    const page = extra ? extra.page + 1 : 2;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const data = await http.get<ApiPage<ApiJob>>("/api/jobs/", { ...toQuery(query), page });
      setMore({
        key: queryKey,
        jobs: [...(extra?.jobs ?? []), ...data.results.map(toJob)],
        page,
        hasMore: !!data.next,
      });
    } catch (e) {
      setMoreError(messageOf(e));
    } finally {
      setLoadingMore(false);
    }
  }

  const sorted = sortByRecommended(jobs);
  const recommended = sorted.filter((j) => j.recommended);
  const nearbyCount = jobs.filter((j) => isNearby(j, filters.radius)).length;

  const showList = view !== "map";
  const showMap = view !== "list";
  const isSeeker = user?.role === "job_seeker";

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-[18px] flex-wrap">
        <PageHeading
          tag="The Board"
          title={
            first.data
              ? `${totalCount} ${totalCount === 1 ? "posting matches" : "postings match"} your filters`
              : "Checking the board…"
          }
        />
        <PillTrack
          selected={view}
          className="flex gap-1.5 p-1 bg-paper rounded-full shadow-[0_4px_0_var(--color-edge)]"
          role="group"
          aria-label="View"
        >
          {viewModes.map((m) => (
            <button
              key={m.id}
              onClick={() => setView(m.id)}
              aria-pressed={view === m.id}
              className={`px-[15px] py-[7px] rounded-full font-display text-[14px] font-semibold cursor-pointer border-0 bg-transparent ${
                view === m.id ? "text-sun-ink" : "text-ink-3"
              }`}
            >
              <span className="relative z-[2]">{m.label}</span>
            </button>
          ))}
        </PillTrack>
      </div>

      {/* Wait for the session check so a signed-in seeker never sees the signed-out line flash by. */}
      {ready && showGuide && (!user || (isSeeker && seekerReady && first.data)) && (
        <PipBubble className="mb-[22px] max-w-[760px]">
          {!user ? (
            <>
              Hi there! <Link href="/login?next=/search">Sign in</Link> and I&rsquo;ll point out the postings that fit your
              skills, and how far away they are.
            </>
          ) : (
            <PipRecommendation name={user.name} hasSkills={mySkills.length > 0} recommended={recommended} radius={filters.radius} />
          )}
        </PipBubble>
      )}

      {ready && !user && !showGuide && (
        <div className="mb-[18px] max-w-[760px]">
          <Notice>
            <Link href="/login?next=/search">Sign in</Link> to see how each posting matches your skills and how far it is
            from you.
          </Notice>
        </div>
      )}

      <div className="flex flex-wrap gap-5 items-start">
        <aside className="flex-[1_1_250px] max-w-[310px] min-w-0 bg-paper rounded-[24px] p-5 shadow-[0_5px_0_var(--color-edge)]">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-[18px] font-semibold text-ink">What you&rsquo;re after</span>
            <Button variant="link" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          <Label htmlFor="filter-q">Title or keyword</Label>
          <TextInput
            id="filter-q"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="e.g. frontend engineer"
            className="mb-4"
          />

          <Label>Skills</Label>
          <div className="flex flex-wrap gap-x-1.5 gap-y-[7px] mb-[18px]">
            {skillFilterOptions.map((skill) => (
              <Chip
                key={skill}
                selected={filters.skills.includes(skill)}
                aria-pressed={filters.skills.includes(skill)}
                onClick={() => toggleSkillFilter(skill)}
              >
                {skill}
              </Chip>
            ))}
          </div>

          <Label htmlFor="filter-loc">Location</Label>
          <TextInput
            id="filter-loc"
            value={filters.loc}
            onChange={(e) => setFilter("loc", e.target.value)}
            placeholder="City or town"
            className="mb-4"
          />

          <label htmlFor="filter-salary" className="flex justify-between text-[13px] font-extrabold text-muted mb-1.5">
            <span>Minimum pay</span>
            <span className="font-display font-semibold text-accent">${filters.minSalary}k</span>
          </label>
          <RangeInput
            id="filter-salary"
            min={60}
            max={220}
            step={10}
            value={filters.minSalary}
            onChange={(e) => setFilter("minSalary", Number(e.target.value))}
            className="mb-4"
          />

          <Label>Work setup</Label>
          <PillTrack
            selected={filters.setup}
            className="flex gap-1.5 mb-[18px]"
            pillClassName="bg-sun rounded-xl shadow-[0_3px_0_var(--color-sun-edge)]"
          >
            {setupOptions.map((o) => {
              const on = filters.setup === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setFilter("setup", o.id)}
                  aria-pressed={on}
                  className={`flex-1 rounded-xl py-[7px] px-1 font-display text-[13px] font-semibold cursor-pointer border-0 bg-tan shadow-[0_3px_0_#D9C59A] ${
                    on ? "text-sun-ink" : "text-ink-3"
                  }`}
                >
                  <span className="relative z-[2]">{o.label}</span>
                </button>
              );
            })}
          </PillTrack>

          <label htmlFor="filter-radius" className="flex justify-between text-[13px] font-extrabold text-muted mb-1.5">
            <span>Walking distance</span>
            <span className="font-display font-semibold text-accent">{filters.radius} mi</span>
          </label>
          <RangeInput
            id="filter-radius"
            min={5}
            max={60}
            step={5}
            value={filters.radius}
            onChange={(e) => setFilter("radius", Number(e.target.value))}
            className="mb-4"
          />

          <button
            onClick={() => setFilter("visa", !filters.visa)}
            aria-pressed={filters.visa}
            className={`w-full flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 cursor-pointer text-left border-0 active:translate-y-[2px] active:shadow-none ${
              filters.visa ? "bg-sun shadow-[0_3px_0_var(--color-sun-edge)]" : "bg-tan shadow-[0_3px_0_#D9C59A]"
            }`}
          >
            <span
              className="w-5 h-5 rounded-[7px] shrink-0 border-2 grid place-items-center transition-colors duration-150"
              style={{
                background: filters.visa ? "#3F8F24" : "#FFFFFF",
                borderColor: filters.visa ? "#2E6B18" : "#D9C59A",
              }}
            >
              <AnimatePresence>
                {filters.visa && (
                  <motion.svg
                    viewBox="0 0 12 12"
                    width="11"
                    height="11"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={springBouncy}
                  >
                    <motion.path
                      d="M2 6.5 L5 9 L10 3"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.25, delay: 0.05 }}
                    />
                  </motion.svg>
                )}
              </AnimatePresence>
            </span>
            <span className={`text-[13.5px] font-bold ${filters.visa ? "text-sun-ink" : "text-ink-3"}`}>Offers visa sponsorship</span>
          </button>
        </aside>

        {showList && (
          <Wood big className="flex-[3_1_400px] min-w-0">
            <div className="flex flex-wrap justify-between items-center gap-2 px-2 pt-1 pb-4">
              <span className="font-display text-[19px] font-semibold text-paper">Town job board</span>
              <motion.span
                key={`${nearbyCount}-${filters.radius}`}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={springBouncy}
                className="text-[13px] font-extrabold text-paper bg-wood-edge px-[11px] py-1 rounded-full whitespace-nowrap"
              >
                {nearbyCount} within {filters.radius} mi
              </motion.span>
            </div>

            {first.error && <Notice tone="error">{first.error}</Notice>}

            {first.data && jobs.length === 0 && (
              <div className="bg-paper rounded-2xl p-[30px] text-center font-bold text-muted">
                Nothing pinned up that matches. Try loosening a filter.
              </div>
            )}
            {!first.data && !first.error && (
              <div className="bg-paper rounded-2xl p-[30px] text-center font-bold text-muted">Pinning up postings…</div>
            )}

            <div
              className="grid gap-x-3.5 gap-y-[18px] px-1 pt-1.5 pb-1"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}
            >
              {/* popLayout: a card filtered out lifts off the board straight away, and
                  the rest slide into the gap instead of waiting for it. */}
              <AnimatePresence mode="popLayout">
                {sorted.map((job, i) => (
                  <PinnedJobCard
                    key={job.id}
                    job={job}
                    index={i}
                    inCart={cart.includes(job.id)}
                    isApplied={!!applied[job.id]}
                    onToggleCart={() => toggleCart(job)}
                    onApply={() => applyJob(job.id)}
                    onOpen={() => openJob(job.id)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <div className="flex flex-col items-center gap-2 pt-5 pb-1">
                <Button variant="paper" size="md" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Fetching more…" : "Show more postings"}
                </Button>
                {moreError && <span className="text-[12.5px] font-bold text-paper">{moreError}</span>}
              </div>
            )}
          </Wood>
        )}

        {showMap && (
          <div className="flex-[2_1_340px] min-w-0">
            <JobsMapPanel
              jobs={jobs}
              radius={filters.radius}
              initials={user ? initialsOf(user.name) : "You"}
              onPinClick={(id) => openJob(id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Kept outside the component: reading the clock during render is impure, and it
// only picks a greeting.
function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
}

function PipRecommendation({
  name,
  hasSkills,
  recommended,
  radius,
}: {
  name: string;
  hasSkills: boolean;
  recommended: Job[];
  radius: number;
}) {
  const firstName = name.split(" ")[0];
  if (!hasSkills) {
    return (
      <>
        Hi, {firstName}! Add a few skills in <Link href="/profile">My house</Link> and I&rsquo;ll point out the postings that
        fit you.
      </>
    );
  }
  if (recommended.length === 0) {
    return <>Hmm, nothing on the board matches your skills with these filters. Try loosening one?</>;
  }
  // "Close enough to walk to" means a known, non-remote distance inside the radius.
  const near = recommended.filter((j) => j.distanceMi !== null && j.distanceMi > 0 && j.distanceMi <= radius).length;
  const count = recommended.length;
  return (
    <>
      {greeting()}, {firstName}! {count} {count === 1 ? "posting fits" : "postings fit"} your skills
      {near > 0 ? `, and ${near} of them ${near === 1 ? "is" : "are"} close enough to walk to.` : "."} I put those at the
      top of the board.
    </>
  );
}

// A button label that pops when it changes, e.g. "Apply" → "Sent!".
function PopLabel({ children, id }: { children: ReactNode; id: string }) {
  return (
    <motion.span
      key={id}
      className="inline-block"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springBouncy}
    >
      {children}
    </motion.span>
  );
}

function shortDistance(job: Job): string {
  if (job.distanceMi === null) return "distance unknown";
  return job.distanceMi === 0 ? "anywhere" : `${job.distanceMi} mi`;
}

// A paper posting pinned to the wooden board, tilted a little, with a thumbtack.
// Cards drop onto the board one after another, and slide to their new spot
// when the filters reorder them. `ref` is a plain prop (React 19): popLayout
// measures the card through it as it leaves.
function PinnedJobCard({
  job,
  index,
  inCart,
  isApplied,
  onToggleCart,
  onApply,
  onOpen,
  ref,
}: {
  ref?: Ref<HTMLElement>;
  job: Job;
  index: number;
  inCart: boolean;
  isApplied: boolean;
  onToggleCart: () => void;
  onApply: () => void;
  onOpen: () => void;
}) {
  const style = {
    background: PINNED_PAPERS[index % 4],
    outline: isApplied ? "3px solid #3F8F24" : undefined,
    "--tilt": PINNED_TILTS[index % 4],
  } as CSSProperties;

  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...springBouncy, delay: Math.min(index, 10) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={springSoft}
      onClick={onOpen}
      className="pinned relative rounded-2xl px-4 pt-[18px] pb-[15px] cursor-pointer flex flex-col gap-2 shadow-[0_4px_0_rgba(40,20,5,0.25)]"
      style={style}
    >
      <span
        aria-hidden
        className="absolute -top-[7px] left-1/2 -ml-2 w-4 h-4 rounded-full shadow-[0_2px_0_rgba(40,20,5,0.3)]"
        style={{ background: PINNED_TACKS[index % 4] }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CompanyMark mark={job.mark} bg={job.logoBg} size={30} />
          <span className="text-[13.5px] font-extrabold text-muted whitespace-nowrap overflow-hidden text-ellipsis">{job.company}</span>
        </div>
        {job.recommended && (
          <span className="shrink-0 font-display text-[12px] font-semibold bg-accent text-white px-[9px] py-0.5 rounded-full whitespace-nowrap">
            {job.matchPct}% match
          </span>
        )}
      </div>
      <h3 className="m-0 font-display text-[19px] font-semibold leading-[1.2] text-ink">{job.title}</h3>
      <div className="text-[13.5px] font-bold text-muted leading-[1.45]">
        {job.location} · {job.setup} · {shortDistance(job)}
        <br />
        <span className="text-ink">{salaryLabel(job)}</span>
      </div>
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-[5px]">
          {job.skills.map((s) => (
            <span key={s} className="text-[12px] font-bold text-ink-3 bg-white/70 rounded-full px-[9px] py-0.5">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-[7px] mt-1">
        <Button
          variant={isApplied ? "sent" : "primary"}
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
        >
          <PopLabel id={isApplied ? "sent" : "apply"}>{isApplied ? "Sent!" : "Apply"}</PopLabel>
        </Button>
        <Button
          variant={inCart ? "selected" : "secondary"}
          aria-pressed={inCart}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCart();
          }}
        >
          <PopLabel id={inCart ? "in" : "out"}>{inCart ? "In pocket" : "Pocket it"}</PopLabel>
        </Button>
      </div>
    </motion.article>
  );
}
