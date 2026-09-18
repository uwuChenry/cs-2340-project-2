"use client";

import { applicantClusters, candidates, initialSavedSearches, openRoleTitle } from "@/lib/mockData";
import { useAppState } from "@/state/AppState";
import { Avatar } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Label, TextInput } from "@/components/ui/Field";
import { ClusterMap } from "@/components/SchematicMap";

export default function CandidatesPage() {
  const { savedOn, toggleSavedSearch, searchSaved, saveSearch, openCandidate, messageCandidate } = useAppState();

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Sourcing</div>
      <h1 className="m-0 mb-5 text-[30px] font-semibold tracking-[-0.025em]">Find candidates</h1>

      <div className="flex flex-wrap gap-[18px] items-start">
        <aside className="flex-[1_1_270px] min-w-0 max-w-[340px] flex flex-col gap-3.5">
          <Card>
            <h2 className="m-0 mb-3 text-sm font-semibold">Query</h2>
            <Label>Skills</Label>
            <TextInput placeholder="Skills, e.g. React, GraphQL" className="mb-2.5" />
            <Label>Location</Label>
            <TextInput placeholder="Location or radius" className="mb-2.5" />
            <Label>Project keyword</Label>
            <TextInput placeholder="Project keyword" className="mb-3" />
            <Button variant="primary" size="md" className="w-full !rounded-lg" onClick={saveSearch}>
              {searchSaved ? "Search saved" : "Save this search"}
            </Button>
          </Card>

          <Card>
            <h2 className="m-0 mb-2.5 text-sm font-semibold">Saved searches</h2>
            <div className="flex flex-col gap-0.5">
              {initialSavedSearches.map((s) => {
                const on = savedOn[s.id];
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2.5 py-2.5 border-b border-line-soft last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{s.name}</div>
                      <div className="text-[11.5px] text-muted-2 mt-0.5">{s.newCount} new matches</div>
                    </div>
                    <button
                      onClick={() => toggleSavedSearch(s.id)}
                      className={`text-[11.5px] px-[9px] py-1 rounded-full cursor-pointer whitespace-nowrap border ${
                        on ? "bg-accent-tint text-accent border-accent-border" : "bg-surface text-muted border-line-strong"
                      }`}
                    >
                      {on ? "Alerts on" : "Alerts off"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="none">
            <div className="px-[18px] pt-4 pb-2.5">
              <h2 className="m-0 mb-[3px] text-sm font-semibold">Applicants by location</h2>
              <p className="m-0 text-[12.5px] text-muted">Clustered across this opening</p>
            </div>
            <ClusterMap clusters={applicantClusters} />
          </Card>
        </aside>

        <div className="flex-[3_1_380px] min-w-0 flex flex-col gap-2.5">
          <div className="bg-accent-tint-2 border border-accent-border-2 rounded-xl px-4 py-3.5">
            <div className="text-[13px] font-semibold text-accent-deep mb-[3px]">
              Recommended for {openRoleTitle}
            </div>
            <p className="m-0 text-[13px] text-accent-text leading-[1.5]">
              Four profiles clear every required skill and are inside your commute band. Ranked by skill overlap and
              recent project activity.
            </p>
          </div>

          {candidates.map((c) => {
            const initials = c.name
              .split(" ")
              .map((w) => w[0])
              .join("");
            return (
              <article
                key={c.id}
                onClick={() => openCandidate(c.id)}
                className="bg-surface border border-line rounded-xl px-[18px] py-4 cursor-pointer flex flex-wrap gap-x-4 gap-y-3.5 items-center hover:border-line-hover"
              >
                <div className="flex-[1_1_220px] min-w-0">
                  <div className="flex items-center gap-[9px] mb-1.5">
                    <Avatar initials={initials} size={28} />
                    <span className="text-base font-semibold tracking-[-0.015em]">{c.name}</span>
                    <span className="font-mono text-[11px] text-accent bg-accent-tint rounded-md px-[7px] py-[3px]">
                      {c.matchPct}% match
                    </span>
                  </div>
                  <div className="text-[13.5px] text-muted mb-2.5">
                    {c.role} · {c.location}
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
                      messageCandidate(c.id);
                    }}
                  >
                    Message
                  </Button>
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCandidate(c.id);
                    }}
                  >
                    Review
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
