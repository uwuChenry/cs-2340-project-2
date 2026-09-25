"use client";

import { useState } from "react";
import { http } from "@/lib/api";
import type { ApiJob } from "@/lib/apiTypes";
import { toJob } from "@/lib/adapters";
import { notePrompts } from "@/lib/constants";
import { distanceLabel, salaryLabel, setupLabel } from "@/lib/derive";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import { CompanyMark } from "./ui/Avatar";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import Notice from "./ui/Notice";
import Sheet, { SheetCloseButton } from "./ui/Sheet";
import { SingleLocationMap } from "./SchematicMap";
import ReportDialog from "./ReportDialog";

export default function JobSheet() {
  const {
    openJobId,
    closeJob,
    applied,
    applyJob,
    cart,
    toggleCart,
    noteOpen,
    note,
    setNote,
    appendNote,
    cancelNote,
    submitNote,
  } = useAppState();
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  // The list view already has most of this, but the sheet needs the fields only
  // the detail endpoint returns (which required skills the seeker has).
  const detail = useAsync(
    () => http.get<ApiJob>(`/api/jobs/${openJobId}/`),
    [openJobId, user?.id ?? null],
    openJobId !== null,
  );

  if (!openJobId) return null;

  const loaded = detail.data && String(detail.data.id) === openJobId ? toJob(detail.data) : null;

  if (!loaded) {
    return (
      <Sheet onClose={closeJob} width={620}>
        <div className="p-7 flex justify-between gap-4 items-start">
          <div className="min-w-0">
            {detail.error ? <Notice tone="error">{detail.error}</Notice> : <p className="m-0 text-[14px] text-muted">Loading role…</p>}
          </div>
          <SheetCloseButton onClick={closeJob} />
        </div>
      </Sheet>
    );
  }

  const job = loaded;
  const isApplied = !!applied[job.id];
  const inCart = cart.includes(job.id);
  const matched = job.matchedSkills ?? [];

  const facts = [
    { label: "Level", value: job.level || "Not specified" },
    { label: "Team size", value: job.teamSize || "Not specified" },
    { label: "Visa sponsorship", value: job.visa ? "Available" : "Not offered" },
    { label: "Posted", value: job.posted },
  ];

  return (
    <Sheet onClose={closeJob} width={620}>
      <div className="p-6 pb-6 px-7 border-b border-line-soft flex justify-between gap-4 items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-[9px] mb-2">
            <CompanyMark mark={job.mark} bg={job.logoBg} size={28} />
            <span className="text-[13.5px] text-muted">{job.company}</span>
          </div>
          <h2 className="m-0 mb-2 text-[22px] font-semibold tracking-[-0.02em]">{job.title}</h2>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13.5px] text-muted">
            <span>{job.location}</span>
            <span>{setupLabel(job)}</span>
            <span className="font-mono text-ink">{salaryLabel(job)}</span>
            <span>{distanceLabel(job)}</span>
          </div>
        </div>
        <SheetCloseButton onClick={closeJob} />
      </div>

      <div className="px-7 pt-[22px]">
        <div className="flex flex-wrap gap-2.5 mb-5">
          <Button
            variant="primary"
            size="md"
            className="!rounded-[9px]"
            onClick={() => applyJob(job.id)}
          >
            {isApplied ? "Applied" : "One-click apply"}
          </Button>
          <Button
            variant={inCart ? "accent" : "secondary"}
            size="md"
            className={`!rounded-[9px] ${inCart ? "!bg-accent-tint !text-accent !border !border-accent-border" : ""}`}
            onClick={() => toggleCart(job)}
          >
            {inCart ? "In shortlist" : "Add to shortlist"}
          </Button>
        </div>

        {noteOpen && (
          <div className="bg-surface-sunken border border-line rounded-[11px] p-4 mb-5">
            <div className="text-[13.5px] font-semibold mb-[3px]">Add a tailored note</div>
            <p className="m-0 mb-2.5 text-[12.5px] text-muted">
              Optional, 400 characters. Recruiters see this above your profile.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Why this role, in your words…"
              className="w-full px-3 py-[11px] border border-line-strong rounded-lg bg-surface text-[13.5px] leading-[1.55] resize-y mb-2.5 focus:outline-none focus:border-accent"
            />
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {notePrompts.map((p) => (
                <Chip key={p.label} dashed onClick={() => appendNote(p.text)}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={cancelNote}>
                Send without note
              </Button>
              <Button variant="accent" onClick={submitNote}>
                Submit application
              </Button>
            </div>
          </div>
        )}

        {isApplied && !noteOpen && (
          <div className="bg-success-bg border border-success-border rounded-[11px] px-[15px] py-[13px] mb-5 text-[13.5px] text-success">
            Application sent. Tracked under Applications as <strong>Applied</strong>.
          </div>
        )}

        {user && reportOpen && (
          <ReportDialog
            target={{ kind: "job", id: job.id, label: "this job" }}
            onClose={() => setReportOpen(false)}
            onSubmitted={() => { setReportOpen(false); closeJob(); }}
          />
        )}
      </div>

      <div className="px-7 pb-[34px]">
        <div className="grid grid-cols-2 gap-2.5 mb-[22px]">
          {facts.map((f) => (
            <div key={f.label} className="bg-surface-sunken border border-line-soft rounded-[9px] px-[13px] py-[11px]">
              <div className="text-[11.5px] text-muted-2 mb-[3px]">{f.label}</div>
              <div className="text-[13.5px] font-medium">{f.value}</div>
            </div>
          ))}
        </div>

        <h3 className="m-0 mb-2 text-sm font-semibold">About the role</h3>
        <p className="m-0 mb-5 text-sm leading-[1.6] text-ink-3">{job.about}</p>

        <h3 className="m-0 mb-[9px] text-sm font-semibold">Skills they listed</h3>
        <div className="flex flex-wrap gap-1.5 mb-[22px]">
          {job.skills.map((s) => {
            const hit = matched.includes(s);
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

        <h3 className="m-0 mb-[9px] text-sm font-semibold">Where it is</h3>
        <SingleLocationMap address={job.address} height={170} />
        {user && (
          <Button variant="link" className="mt-4" onClick={() => setReportOpen(true)}>
            Report this job
          </Button>
        )}
      </div>
    </Sheet>
  );
}
