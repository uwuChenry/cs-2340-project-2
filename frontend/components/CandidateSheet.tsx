"use client";

import { useState } from "react";
import { candidates, postRoleSkills } from "@/lib/mockData";
import { useAppState } from "@/state/AppState";
import { Avatar } from "./ui/Avatar";
import Button from "./ui/Button";
import Sheet, { SheetCloseButton } from "./ui/Sheet";

const requiredSkills = postRoleSkills.concat(["Node"]);

export default function CandidateSheet() {
  const { openCandId, closeCandidate, msgOpen } = useAppState();
  const [draft, setDraft] = useState("");

  const cand = openCandId ? candidates.find((c) => c.id === openCandId) : null;
  if (!cand) return null;

  const initials = cand.name
    .split(" ")
    .map((w) => w[0])
    .join("");
  const firstName = cand.name.split(" ")[0];

  const facts = [
    { label: "Stage", value: cand.stage },
    { label: "Applied", value: cand.appliedAgo },
    { label: "Salary expectation", value: cand.salaryExpectation },
    { label: "Notice period", value: cand.noticePeriod },
  ];

  return (
    <Sheet onClose={closeCandidate} width={660}>
      <div className="p-6 px-7 border-b border-line-soft flex justify-between gap-4 items-start">
        <div className="flex gap-3.5 min-w-0">
          <Avatar initials={initials} size={48} radius="square" />
          <div className="min-w-0">
            <h2 className="m-0 mb-1 text-[21px] font-semibold tracking-[-0.02em]">{cand.name}</h2>
            <div className="text-[13.5px] text-muted">
              {cand.role} · {cand.location}
            </div>
          </div>
        </div>
        <SheetCloseButton onClick={closeCandidate} />
      </div>

      <div className="px-7 pt-5 pb-[34px]">
        <div className="flex flex-wrap gap-2 mb-5">
          <Button variant="primary" size="md" className="!rounded-lg">
            Message in platform
          </Button>
          <Button variant="secondary" size="md" className="!rounded-lg">
            Email candidate
          </Button>
          <Button variant="secondary" size="md" className="!rounded-lg">
            Advance stage
          </Button>
        </div>

        <div className="bg-surface-sunken border border-line rounded-[11px] px-4 py-[15px] mb-5">
          <div className="text-[11.5px] tracking-[0.08em] uppercase font-mono text-muted-2 mb-[7px]">
            Their note
          </div>
          <p className="m-0 text-sm leading-[1.6] text-ink-2">{cand.note}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-[22px]">
          {facts.map((f) => (
            <div key={f.label} className="bg-surface border border-line-soft rounded-[9px] px-[13px] py-[11px]">
              <div className="text-[11.5px] text-muted-2 mb-[3px]">{f.label}</div>
              <div className="text-[13.5px] font-medium">{f.value}</div>
            </div>
          ))}
        </div>

        <h3 className="m-0 mb-[9px] text-sm font-semibold">Skill match</h3>
        <div className="flex flex-wrap gap-1.5 mb-[22px]">
          {requiredSkills.map((s) => {
            const hit = cand.skills.includes(s);
            return (
              <span
                key={s}
                className={`text-[12.5px] rounded-md px-[9px] py-1 border ${
                  hit ? "bg-accent-tint text-accent border-accent-border" : "bg-tag-fill text-ink-3 border-line-tag"
                }`}
              >
                {s}
              </span>
            );
          })}
        </div>

        <h3 className="m-0 mb-3 text-sm font-semibold">Experience</h3>
        <div className="flex flex-col gap-3.5 mb-6">
          {cand.experience.map((e) => (
            <div key={`${e.years}-${e.role}`} className="grid gap-3.5" style={{ gridTemplateColumns: "100px minmax(0,1fr)" }}>
              <div className="font-mono text-xs text-muted-2 pt-0.5">{e.years}</div>
              <div>
                <div className="text-sm font-semibold">{e.role}</div>
                <div className="text-[12.5px] text-muted mt-0.5">{e.org}</div>
              </div>
            </div>
          ))}
        </div>

        {msgOpen && (
          <div className="border-t border-line-soft pt-5">
            <h3 className="m-0 mb-2.5 text-sm font-semibold">Message thread</h3>
            <div className="flex flex-col gap-2 mb-3">
              <div className="self-start max-w-[78%] bg-tag-fill rounded-[10px_10px_10px_3px] px-[13px] py-2.5 text-[13.5px] leading-[1.5]">
                {firstName} opened your profile and saved the role.
              </div>
              <div className="self-end max-w-[78%] bg-accent-tint text-accent-deep rounded-[10px_10px_3px_10px] px-[13px] py-2.5 text-[13.5px] leading-[1.5]">
                Hi {firstName} — your work on the mapping project lines up well with what we are building. Open to
                a 20-minute call this week?
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                className="flex-1 px-3 py-2.5 border border-line-strong rounded-lg bg-surface-sunken text-[13.5px] focus:outline-none focus:border-accent"
              />
              <Button variant="accent" size="md" className="!rounded-lg" onClick={() => setDraft("")}>
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
