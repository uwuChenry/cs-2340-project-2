"use client";

import type { Job, ViewMode } from "@/lib/types";
import {
  distanceLabel,
  filterJobs,
  isRecommended,
  salaryLabel,
  setupLabel,
  skillMatchPct,
  sortByRecommended,
} from "@/lib/derive";
import { jobs, mySkills, skillFilterOptions } from "@/lib/mockData";
import { useAppState } from "@/state/AppState";
import { CompanyMark } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { Label, RangeInput, TextInput } from "@/components/ui/Field";
import { JobsMapPanel } from "@/components/SchematicMap";

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

export default function SearchPage() {
  const { view, setView, filters, setFilter, toggleSkillFilter, resetFilters, cart, toggleCart, applied, applyJob, openJob } =
    useAppState();

  const filtered = filterJobs(jobs, filters);
  const sorted = sortByRecommended(filtered);
  const recommendedCount = sorted.filter((j) => isRecommended(skillMatchPct(j.skills))).length;
  const hasRecs = recommendedCount > 0;

  const showList = view !== "map";
  const showMap = view !== "list";

  return (
    <div>
      <div className="flex items-end justify-between gap-5 mb-[18px] flex-wrap">
        <div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Find work</div>
          <h1 className="m-0 text-[30px] font-semibold tracking-[-0.025em]">{filtered.length} roles match your filters</h1>
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
            {hasRecs && (
              <div className="bg-accent-tint-2 border border-accent-border-2 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[13px] font-semibold text-accent-deep">Recommended from your skills</span>
                </div>
                <p className="m-0 text-[13px] text-accent-text leading-[1.5]">
                  Based on {mySkills.slice(0, 3).join(", ")} and your saved roles, {recommendedCount} of these clear
                  every skill you listed.
                </p>
              </div>
            )}

            {sorted.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                inCart={cart.includes(job.id)}
                isApplied={!!applied[job.id]}
                onToggleCart={() => toggleCart(job.id)}
                onApply={() => applyJob(job.id)}
                onOpen={() => openJob(job.id)}
              />
            ))}
          </div>
        )}

        {showMap && (
          <div className="flex-[2_1_340px] min-w-0">
            <JobsMapPanel jobs={filtered} radius={filters.radius} onPinClick={(id) => openJob(id)} />
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
  const pct = skillMatchPct(job.skills);
  const isRec = isRecommended(pct);

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
