"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { http, messageOf } from "@/lib/api";
import type { ApiJob, ApiPage } from "@/lib/apiTypes";
import { toJob } from "@/lib/adapters";
import type { Filters, Job, ViewMode } from "@/lib/types";
import {
  RECOMMENDATION_THRESHOLD,
  distanceLabel,
  salaryLabel,
  setupLabel,
  sortByRecommended,
} from "@/lib/derive";
import { skillFilterOptions } from "@/lib/constants";
import { useAsync } from "@/lib/useAsync";
import { useDebounced } from "@/lib/useDebounced";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import { CompanyMark } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { Label, RangeInput, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";

// Leaflet touches `window` on import, so the map is only loaded in the browser.
const JobsLeafletMap = dynamic(() => import("@/components/JobsLeafletMap"), {
  ssr: false,
  loading: () => <div className="h-[520px] bg-map-ground border border-line rounded-xl" />,
});

const viewModes: { id: ViewMode; label: string }[] = [
  { id: "list", label: "List" },
  { id: "split", label: "Split" },
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
  const { view, setView, filters, setFilter, toggleSkillFilter, resetFilters, cart, toggleCart, applied, applyJob, openJob, mySkills } =
    useAppState();
  const { user } = useAuth();

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
  const recommendedCount = sorted.filter((j) => j.recommended).length;
  const hasRecs = recommendedCount > 0;

  const showList = view !== "map";
  const showMap = view !== "list";

  return (
    <div>
      <div className="flex items-end justify-between gap-5 mb-[18px] flex-wrap">
        <div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Find work</div>
          <h1 className="m-0 text-[30px] font-semibold tracking-[-0.025em]">
            {first.data ? `${totalCount} ${totalCount === 1 ? "role matches" : "roles match"} your filters` : "Finding roles…"}
          </h1>
        </div>
        <div className="flex gap-[3px] p-[3px] bg-hover-fill rounded-[9px]">
          {viewModes.map((m) => (
            <button
              key={m.id}
              onClick={() => setView(m.id)}
              className={`px-3 py-1.5 rounded-[7px] text-[13px] font-medium cursor-pointer border-0 ${
                view === m.id ? "bg-surface text-ink" : "bg-transparent text-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-[18px] items-start">
        <aside className="flex-[1_1_240px] max-w-[320px] min-w-0">
          <Card>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-sm font-semibold">Filters</span>
              <button onClick={resetFilters} className="border-0 bg-transparent p-0 text-[13px] text-muted underline cursor-pointer">
                Reset
              </button>
            </div>

            <Label>Title or keyword</Label>
            <TextInput
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="e.g. frontend engineer"
              className="mb-4"
            />

            <Label>Skills</Label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {skillFilterOptions.map((skill) => (
                <Chip key={skill} selected={filters.skills.includes(skill)} onClick={() => toggleSkillFilter(skill)}>
                  {skill}
                </Chip>
              ))}
            </div>

            <Label>Location</Label>
            <TextInput
              value={filters.loc}
              onChange={(e) => setFilter("loc", e.target.value)}
              placeholder="City or metro"
              className="mb-4"
            />

            <label className="flex justify-between text-xs font-medium text-muted mb-1.5">
              <span>Minimum base salary</span>
              <span className="text-ink font-mono">${filters.minSalary}k</span>
            </label>
            <RangeInput
              min={60}
              max={220}
              step={10}
              value={filters.minSalary}
              onChange={(e) => setFilter("minSalary", Number(e.target.value))}
              className="mb-4"
            />

            <Label>Work setup</Label>
            <div className="flex gap-1.5 mb-4">
              {setupOptions.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setFilter("setup", o.id)}
                  className={`flex-1 rounded-lg py-[7px] px-1 text-[12.5px] cursor-pointer border ${
                    filters.setup === o.id
                      ? "bg-accent-tint text-accent border-accent-border"
                      : "bg-surface text-ink-3 border-line-strong"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <label className="flex justify-between text-xs font-medium text-muted mb-1.5">
              <span>Commute radius</span>
              <span className="text-ink font-mono">{filters.radius} mi</span>
            </label>
            <RangeInput
              min={5}
              max={60}
              step={5}
              value={filters.radius}
              onChange={(e) => setFilter("radius", Number(e.target.value))}
              className="mb-4"
            />

            <button
              onClick={() => setFilter("visa", !filters.visa)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-[11px] py-2.5 cursor-pointer text-left border ${
                filters.visa ? "bg-accent-tint border-accent-border" : "bg-surface border-line-strong"
              }`}
            >
              <span
                className="w-4 h-4 rounded shrink-0 border"
                style={{
                  background: filters.visa ? "#1B4DFF" : "#FFFFFF",
                  borderColor: filters.visa ? "#C6CCEC" : "#DDD9D1",
                }}
              />
              <span className="text-[13px]">Offers visa sponsorship</span>
            </button>
          </Card>
        </aside>

        {showList && (
          <div className="flex-[3_1_380px] min-w-0 flex flex-col gap-2.5">
            {!user && (
              <Notice>
                <Link href="/login?next=/search">Sign in</Link> to see how each role matches your skills and how far it is
                from you.
              </Notice>
            )}

            {first.error && <Notice tone="error">{first.error}</Notice>}

            {hasRecs && (
              <div className="bg-accent-tint-2 border border-accent-border-2 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[13px] font-semibold text-accent-deep">Recommended from your skills</span>
                </div>
                <p className="m-0 text-[13px] text-accent-text leading-[1.5]">
                  Based on {mySkills.slice(0, 3).join(", ")}
                  {mySkills.length > 3 ? " and more" : ""}, {recommendedCount} of these match at least{" "}
                  {RECOMMENDATION_THRESHOLD}% of the skills they ask for.
                </p>
              </div>
            )}

            {first.data && jobs.length === 0 && <Notice>No roles match these filters. Try widening the radius or clearing a skill.</Notice>}

            {sorted.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                inCart={cart.includes(job.id)}
                isApplied={!!applied[job.id]}
                onToggleCart={() => toggleCart(job)}
                onApply={() => applyJob(job.id)}
                onOpen={() => openJob(job.id)}
              />
            ))}

            {hasMore && (
              <div className="flex flex-col items-center gap-2 pt-1">
                <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Show more roles"}
                </Button>
                {moreError && <span className="text-[12.5px] text-danger">{moreError}</span>}
              </div>
            )}
          </div>
        )}

        {showMap && (
          <div className="flex-[2_1_340px] min-w-0">
            <JobsLeafletMap jobs={jobs} onOpenJob={openJob} />
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({
  job,
  inCart,
  isApplied,
  onToggleCart,
  onApply,
  onOpen,
}: {
  job: Job;
  inCart: boolean;
  isApplied: boolean;
  onToggleCart: () => void;
  onApply: () => void;
  onOpen: () => void;
}) {
  const pct = job.matchPct;
  const isRec = job.recommended;

  return (
    <article
      onClick={onOpen}
      className={`bg-surface border rounded-xl px-[18px] py-4 cursor-pointer flex flex-wrap gap-x-4 gap-y-3.5 hover:border-line-hover ${
        isApplied ? "border-success-border" : "border-line"
      }`}
    >
      <div className="flex-[1_1_220px] min-w-0">
        <div className="flex items-center gap-[9px] mb-1.5">
          <CompanyMark mark={job.mark} bg={job.logoBg} size={26} />
          <span className="text-[13px] text-muted">{job.company}</span>
          {isRec && (
            <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-accent bg-accent-tint rounded-md px-[7px] py-[3px]">
              {pct}% match
            </span>
          )}
        </div>
        <h3 className="m-0 mb-2 text-[17px] font-semibold tracking-[-0.015em]">{job.title}</h3>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-muted mb-2.5">
          <span>{job.location}</span>
          <span>{setupLabel(job)}</span>
          <span className="font-mono text-ink">{salaryLabel(job)}</span>
          <span>{distanceLabel(job)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map((s) => (
            <span key={s} className="text-xs text-ink-3 bg-tag-fill rounded-md px-2 py-[3px]">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-[0_1_auto] flex flex-col items-end justify-between gap-2.5 ml-auto">
        <span className="text-xs text-muted-3 whitespace-nowrap">{job.posted}</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            variant={inCart ? "accent" : "secondary"}
            className={inCart ? "!bg-accent-tint !text-accent !border !border-accent-border" : ""}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCart();
            }}
          >
            {inCart ? "In shortlist" : "Add to shortlist"}
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
          >
            {isApplied ? "Applied" : "One-click apply"}
          </Button>
        </div>
      </div>
    </article>
  );
}
