"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { http, messageOf } from "@/lib/api";
import type { ApiCandidateSearch, ApiClusters, ApiSavedSearch } from "@/lib/apiTypes";
import { toClusters, toSavedSearch, toSourcedCandidate } from "@/lib/adapters";
import { springBouncy, springSoft } from "@/lib/motion";
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
import PageHeading from "@/components/ui/PageHeading";
import { PipBubble } from "@/components/Pip";
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
  const { showToast, openCandidate, messageCandidate, dataVersion, showGuide } = useAppState();
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
      showToast("Saved! Switch its alerts on or off below.");
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
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <PageHeading tag="Scouting" title="Find candidates" />
        <RoleSelect jobs={list} selectedId={selected?.id ?? null} onChange={select} />
      </div>

      <div className="flex flex-wrap gap-5 items-start">
        <aside className="flex-[1_1_280px] min-w-0 max-w-[350px] flex flex-col gap-4">
          <Card>
            <h2 className="m-0 mb-3 font-display text-[18px] font-semibold text-ink">Who are you looking for?</h2>
            <Label htmlFor="scout-skills">Skills</Label>
            <TextInput
              id="scout-skills"
              value={query.skills}
              onChange={(e) => setQuery((q) => ({ ...q, skills: e.target.value }))}
              placeholder="Skills, e.g. React, GraphQL"
              className="mb-2.5"
            />
            <Label htmlFor="scout-location">Location</Label>
            <TextInput
              id="scout-location"
              value={query.location}
              onChange={(e) => setQuery((q) => ({ ...q, location: e.target.value }))}
              placeholder="City or region"
              className="mb-2.5"
            />
            <Label htmlFor="scout-project">Project keyword</Label>
            <TextInput
              id="scout-project"
              value={query.project}
              onChange={(e) => setQuery((q) => ({ ...q, project: e.target.value }))}
              placeholder="e.g. clustering"
              className="mb-3.5"
            />
            <Button variant="primary" size="md" className="w-full" onClick={saveSearch}>
              Save this search
            </Button>
          </Card>

          <Card>
            <h2 className="m-0 mb-2 font-display text-[18px] font-semibold text-ink">Saved searches</h2>
            {savedSearches.error && <Notice tone="error">{savedSearches.error}</Notice>}
            {saved.length === 0 && !savedSearches.error && (
              <p className="m-0 text-[14px] font-bold text-muted">
                {savedSearches.loading ? "Looking through your notes…" : "Nothing saved yet. Set up a search and save it."}
              </p>
            )}
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
              {saved.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={springBouncy}
                  className="flex items-center justify-between gap-2.5 py-2.5 border-b-2 border-dashed border-line-tag last:border-b-0 overflow-hidden"
                >
                  <button
                    onClick={() => runSaved(s)}
                    className="min-w-0 text-left border-0 bg-transparent p-0 cursor-pointer"
                    title="Run this search"
                  >
                    <div className="text-[14px] font-extrabold text-ink-2 whitespace-nowrap overflow-hidden text-ellipsis">{s.name}</div>
                    <div className="text-[12.5px] font-bold text-muted-2 mt-0.5">
                      {s.newCount} new {s.newCount === 1 ? "match" : "matches"}
                    </div>
                  </button>
                  <button
                    onClick={() => toggleAlerts(s)}
                    aria-pressed={s.alertsOn}
                    className={`shrink-0 border-0 font-display text-[12.5px] font-semibold px-[11px] py-1 rounded-full cursor-pointer whitespace-nowrap active:translate-y-[2px] active:shadow-none ${
                      s.alertsOn
                        ? "bg-accent text-white shadow-[0_3px_0_var(--color-accent-deep)]"
                        : "bg-tan text-ink-3 shadow-[0_3px_0_#D9C59A]"
                    }`}
                  >
                    {s.alertsOn ? "Alerts on" : "Alerts off"}
                  </button>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </Card>

          <Card padding="none" className="p-4">
            <h2 className="m-0 mb-[3px] ml-1 font-display text-[18px] font-semibold text-ink">Where applicants live</h2>
            <p className="m-0 mb-3 ml-1 text-[13px] font-bold text-muted">
              {selected ? `Grouped across ${selected.title}` : "Post a role to see where applicants come from"}
            </p>
            <ClusterMap clusters={clusters.data ? toClusters(clusters.data) : []} />
            {clusters.data && clusters.data.withoutLocation > 0 && (
              <p className="m-0 mt-2.5 mx-1 text-[12.5px] font-bold text-muted-2">
                {clusters.data.withoutLocation} applicant{clusters.data.withoutLocation === 1 ? "" : "s"} without a
                location aren&rsquo;t shown.
              </p>
            )}
          </Card>
        </aside>

        <div className="flex-[3_1_400px] min-w-0 flex flex-col gap-3.5">
          {results.error && <Notice tone="error">{results.error}</Notice>}

          {results.data?.targetJob &&
            (showGuide ? (
              <PipBubble tone="white" className="mb-1.5">
                {fullMatches === 0
                  ? `Nobody has every skill on your ${results.data.targetJob} posting yet. I put the closest fits first.`
                  : `${fullMatches === 1 ? "One person has" : `${fullMatches} folks have`} every skill on your ${results.data.targetJob} posting. I put the best fits first.`}
              </PipBubble>
            ) : (
              <Notice>
                Ranked by how many of the skills on {results.data.targetJob} each person has. {fullMatches} with every skill.
              </Notice>
            ))}

          {results.data && candidates.length === 0 && (
            <Notice>Nobody matches that yet. Try fewer skills or a wider area.</Notice>
          )}
          {!results.data && !results.error && <p className="text-[15px] font-bold text-area-ink-2">Scouting around…</p>}

          {/* Results shuffle into their new order as the query changes; people who
              no longer match step out of the way first. */}
          <AnimatePresence mode="popLayout">
          {candidates.map((c, i) => (
            <motion.article
              key={c.seekerId}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0, transition: { ...springSoft, delay: Math.min(i, 8) * 0.04 } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={springSoft}
              whileHover={{ y: -3 }}
              onClick={() => openCandidate({ kind: "seeker", id: c.seekerId })}
              className="bg-paper rounded-[22px] px-[18px] py-4 cursor-pointer flex flex-wrap gap-x-4 gap-y-3.5 items-center shadow-[0_5px_0_var(--color-edge)]"
            >
              <Avatar initials={c.initials} size={50} raised />
              <div className="flex-[1_1_220px] min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-[3px]">
                  <span className="font-display text-[19px] font-semibold text-ink">{c.name}</span>
                  {results.data?.targetJob && (
                    <span className="font-display text-[12px] font-semibold text-white bg-accent px-[9px] py-0.5 rounded-full whitespace-nowrap">
                      {c.matchPct}% match
                    </span>
                  )}
                  {c.hasApplied && (
                    <span className="font-display text-[12px] font-semibold text-white bg-link px-[9px] py-0.5 rounded-full whitespace-nowrap">
                      Applied
                    </span>
                  )}
                </div>
                <div className="text-[14px] font-bold text-muted mb-[9px]">{[c.role, c.location].filter(Boolean).join(" · ")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {c.skills.map((s) => (
                    <span key={s} className="text-[12.5px] font-bold text-ink-3 bg-tan rounded-full px-2.5 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-[0_1_auto] ml-auto flex flex-wrap justify-end gap-2">
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
            </motion.article>
          ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
