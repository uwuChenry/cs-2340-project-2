"use client";

import { useState } from "react";
import { http, messageOf } from "@/lib/api";
import type { ApiCandidateSearch, ApiClusters, ApiSavedSearch } from "@/lib/apiTypes";
import { toClusters, toSavedSearch, toSourcedCandidate } from "@/lib/adapters";
import type { SavedSearch } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { useDebounced } from "@/lib/useDebounced";
import { useRecruiterJobs } from "@/lib/useRecruiterJobs";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import RoleSelect from "@/components/RoleSelect";
import { Avatar } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Label, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import { ClusterMap } from "@/components/SchematicMap";

type Query = { skills: string; location: string; project: string };

const csv = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

function describe(q: Query): string {
  const parts = [...csv(q.skills), q.location.trim(), q.project.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All candidates";
}

export default function CandidatesPage() {
  return (
    <Guard role="recruiter">
      <Candidates />
    </Guard>
  );
}

function Candidates() {
  const { showToast, openCandidate, messageCandidate, dataVersion } = useAppState();
  const { list, selected, select, loading: jobsLoading } = useRecruiterJobs();

  const [query, setQuery] = useState<Query>({ skills: "", location: "", project: "" });
  const debounced = useDebounced(query, 350);

  // Wait for the opening list so the first search already ranks against a role.
  const results = useAsync(
    () =>
      http.get<ApiCandidateSearch>("/api/recruiter/candidates/", {
        skills: csv(debounced.skills).join(","),
        location: debounced.location.trim(),
        project: debounced.project.trim(),
        job: selected?.id,
      }),
    [debounced, selected?.id ?? null, dataVersion],
    !jobsLoading,
  );

  const savedSearches = useAsync(() => http.get<ApiSavedSearch[]>("/api/recruiter/saved-searches/"), []);
  const clusters = useAsync(
    () => http.get<ApiClusters>(`/api/recruiter/jobs/${selected?.id}/clusters/`),
    [selected?.id ?? null, dataVersion],
    selected !== null,
  );

  const candidates = (results.data?.results ?? []).map(toSourcedCandidate);
  const fullMatches = candidates.filter((c) => c.matchPct === 100).length;
  const saved = (savedSearches.data ?? []).map(toSavedSearch);

  async function saveSearch() {
    const filters = { skills: csv(query.skills), location: query.location.trim(), project: query.project.trim() };
    try {
      const created = await http.post<ApiSavedSearch>("/api/recruiter/saved-searches/", {
        name: describe(query),
        filters,
      });
      savedSearches.setData((current) => [created, ...current]);
      showToast("Saved — you can turn alerts on or off below");
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  async function toggleAlerts(search: SavedSearch) {
    try {
      const updated = await http.patch<ApiSavedSearch>(`/api/recruiter/saved-searches/${search.id}/`, {
        alertsOn: !search.alertsOn,
      });
      savedSearches.setData((current) => current.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  // Re-running a saved search fills the query box with its filters. Opening it
  // also tells the server it was viewed, which resets its "new matches" count.
  async function runSaved(search: SavedSearch) {
    setQuery({
      skills: (search.filters.skills ?? []).join(", "),
      location: search.filters.location ?? "",
      project: search.filters.project ?? "",
    });
    try {
      await http.get(`/api/recruiter/saved-searches/${search.id}/`);
      savedSearches.reload();
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-5 mb-5 flex-wrap">
        <div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Sourcing</div>
          <h1 className="m-0 text-[30px] font-semibold tracking-[-0.025em]">Find candidates</h1>
        </div>
        <RoleSelect jobs={list} selectedId={selected?.id ?? null} onChange={select} />
      </div>

      <div className="flex flex-wrap gap-[18px] items-start">
        <aside className="flex-[1_1_270px] min-w-0 max-w-[340px] flex flex-col gap-3.5">
          <Card>
            <h2 className="m-0 mb-3 text-sm font-semibold">Query</h2>
            <Label>Skills</Label>
            <TextInput
              value={query.skills}
              onChange={(e) => setQuery((q) => ({ ...q, skills: e.target.value }))}
              placeholder="Skills, e.g. React, GraphQL"
              className="mb-2.5"
            />
            <Label>Location</Label>
            <TextInput
              value={query.location}
              onChange={(e) => setQuery((q) => ({ ...q, location: e.target.value }))}
              placeholder="City or region"
              className="mb-2.5"
            />
            <Label>Project keyword</Label>
            <TextInput
              value={query.project}
              onChange={(e) => setQuery((q) => ({ ...q, project: e.target.value }))}
              placeholder="Project keyword"
              className="mb-3"
            />
            <Button variant="primary" size="md" className="w-full !rounded-lg" onClick={saveSearch}>
              Save this search
            </Button>
          </Card>

          <Card>
            <h2 className="m-0 mb-2.5 text-sm font-semibold">Saved searches</h2>
            {savedSearches.error && <Notice tone="error">{savedSearches.error}</Notice>}
            {saved.length === 0 && !savedSearches.error && (
              <p className="m-0 text-[13px] text-muted">
                {savedSearches.loading ? "Loading…" : "Nothing saved yet. Set up a query and save it."}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {saved.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2.5 py-2.5 border-b border-line-soft last:border-b-0"
                >
                  <button
                    onClick={() => runSaved(s)}
                    className="min-w-0 text-left border-0 bg-transparent p-0 cursor-pointer"
                    title="Run this search"
                  >
                    <div className="text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{s.name}</div>
                    <div className="text-[11.5px] text-muted-2 mt-0.5">{s.newCount} new matches</div>
                  </button>
                  <button
                    onClick={() => toggleAlerts(s)}
                    className={`text-[11.5px] px-[9px] py-1 rounded-full cursor-pointer whitespace-nowrap border ${
                      s.alertsOn ? "bg-accent-tint text-accent border-accent-border" : "bg-surface text-muted border-line-strong"
                    }`}
                  >
                    {s.alertsOn ? "Alerts on" : "Alerts off"}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="none">
            <div className="px-[18px] pt-4 pb-2.5">
              <h2 className="m-0 mb-[3px] text-sm font-semibold">Applicants by location</h2>
              <p className="m-0 text-[12.5px] text-muted">
                {selected ? `Clustered across ${selected.title}` : "Post a role to see where applicants come from"}
              </p>
            </div>
            <ClusterMap clusters={clusters.data ? toClusters(clusters.data) : []} />
            {clusters.data && clusters.data.withoutLocation > 0 && (
              <p className="m-0 px-[18px] py-2.5 text-[12px] text-muted-2 border-t border-line-soft">
                {clusters.data.withoutLocation} applicant{clusters.data.withoutLocation === 1 ? "" : "s"} without a
                location aren&rsquo;t shown.
              </p>
            )}
          </Card>
        </aside>

        <div className="flex-[3_1_380px] min-w-0 flex flex-col gap-2.5">
          {results.error && <Notice tone="error">{results.error}</Notice>}

          {results.data?.targetJob && (
            <div className="bg-accent-tint-2 border border-accent-border-2 rounded-xl px-4 py-3.5">
              <div className="text-[13px] font-semibold text-accent-deep mb-[3px]">
                Recommended for {results.data.targetJob}
              </div>
              <p className="m-0 text-[13px] text-accent-text leading-[1.5]">
                {fullMatches === 0
                  ? "No profile clears every required skill yet."
                  : `${fullMatches} ${fullMatches === 1 ? "profile clears" : "profiles clear"} every required skill.`}{" "}
                Ranked by overlap with the skills this role asks for.
              </p>
            </div>
          )}

          {results.data && candidates.length === 0 && (
            <Notice>No candidates match this query. Try fewer skills or a broader location.</Notice>
          )}
          {!results.data && !results.error && <p className="text-[14px] text-muted">Searching…</p>}

          {candidates.map((c) => (
            <article
              key={c.seekerId}
              onClick={() => openCandidate({ kind: "seeker", id: c.seekerId })}
              className="bg-surface border border-line rounded-xl px-[18px] py-4 cursor-pointer flex flex-wrap gap-x-4 gap-y-3.5 items-center hover:border-line-hover"
            >
              <div className="flex-[1_1_220px] min-w-0">
                <div className="flex items-center gap-[9px] mb-1.5">
                  <Avatar initials={c.initials} size={28} />
                  <span className="text-base font-semibold tracking-[-0.015em]">{c.name}</span>
                  {results.data?.targetJob && (
                    <span className="font-mono text-[11px] text-accent bg-accent-tint rounded-md px-[7px] py-[3px]">
                      {c.matchPct}% match
                    </span>
                  )}
                  {c.hasApplied && (
                    <span className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-success bg-success-bg rounded-md px-[7px] py-[3px]">
                      Applied
                    </span>
                  )}
                </div>
                <div className="text-[13.5px] text-muted mb-2.5">
                  {[c.role, c.location].filter(Boolean).join(" · ")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.skills.map((s) => (
                    <span key={s} className="text-xs text-ink-3 bg-tag-fill rounded-md px-2 py-[3px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-[0_1_auto] ml-auto flex flex-wrap justify-end gap-1.5">
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    messageCandidate({ kind: "seeker", id: c.seekerId });
                  }}
                >
                  Message
                </Button>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCandidate({ kind: "seeker", id: c.seekerId });
                  }}
                >
                  Review
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
