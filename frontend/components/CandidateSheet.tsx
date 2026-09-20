"use client";

import { useState } from "react";
import { http, messageOf } from "@/lib/api";
import type { ApiCandidateDetail, ApiMessage, ApiSeekerDetail, ApiThread } from "@/lib/apiTypes";
import { applicationToDetail, seekerToDetail, timeAgo } from "@/lib/adapters";
import { STAGES, STAGE_STATUSES, type CandidateDetail } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { Avatar } from "./ui/Avatar";
import Button from "./ui/Button";
import Notice from "./ui/Notice";
import Sheet, { SheetCloseButton } from "./ui/Sheet";

export default function CandidateSheet() {
  const { openCand, closeCandidate, msgOpen, setMsgOpen, showToast, bumpData } = useAppState();

  const detail = useAsync(
    () =>
      openCand?.kind === "application"
        ? http.get<ApiCandidateDetail>(`/api/recruiter/applications/${openCand.id}/`).then(applicationToDetail)
        : http.get<ApiSeekerDetail>(`/api/recruiter/candidates/${openCand?.id}/`).then(seekerToDetail),
    [openCand?.kind ?? null, openCand?.id ?? null],
    openCand !== null,
  );

  if (!openCand) return null;

  const cand = detail.data && detail.data.kind === openCand.kind && detail.data.id === openCand.id ? detail.data : null;

  if (!cand) {
    return (
      <Sheet onClose={closeCandidate} width={660}>
        <div className="p-7 flex justify-between gap-4 items-start">
          <div className="min-w-0">
            {detail.error ? (
              <Notice tone="error">{detail.error}</Notice>
            ) : (
              <p className="m-0 text-[14px] text-muted">Loading candidate…</p>
            )}
          </div>
          <SheetCloseButton onClick={closeCandidate} />
        </div>
      </Sheet>
    );
  }

  const isApplication = cand.kind === "application";
  const stageIndex = cand.stageIndex ?? 0;
  const canAdvance = isApplication && stageIndex < STAGES.length - 1;
  const firstName = cand.name.split(" ")[0];

  async function advanceStage() {
    if (!cand || !canAdvance) return;
    const nextIndex = stageIndex + 1;
    try {
      await http.patch(`/api/recruiter/applications/${cand.id}/stage/`, { status: STAGE_STATUSES[nextIndex] });
      showToast(`Moved ${cand.name} to ${STAGES[nextIndex]}`);
      detail.reload();
      bumpData();
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  function emailCandidate() {
    if (cand?.email) window.location.href = `mailto:${cand.email}`;
    else showToast(`${firstName} keeps their email private`);
  }

  const facts = [
    ...(isApplication
      ? [
          { label: "Stage", value: STAGES[stageIndex] },
          { label: "Applied", value: cand.appliedAgo ?? "" },
        ]
      : [{ label: "Current employer", value: cand.currentEmployer ?? "Not shared" }]),
    { label: "Salary expectation", value: cand.salaryExpectation || "Not shared" },
    { label: "Notice period", value: cand.noticePeriod || "Not shared" },
  ];

  // For an application, every required skill is listed and the ones the
  // candidate has are highlighted. A sourced seeker has no single role behind
  // them, so their own skills are listed and any the target role wants are highlighted.
  const skillChips = isApplication ? [...cand.matchedSkills, ...cand.missingSkills] : cand.skills;

  return (
    <Sheet onClose={closeCandidate} width={660}>
      <div className="p-6 px-7 border-b border-line-soft flex justify-between gap-4 items-start">
        <div className="flex gap-3.5 min-w-0">
          <Avatar initials={cand.initials} size={48} radius="square" />
          <div className="min-w-0">
            <h2 className="m-0 mb-1 text-[21px] font-semibold tracking-[-0.02em]">{cand.name}</h2>
            <div className="text-[13.5px] text-muted">{[cand.role, cand.location].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <SheetCloseButton onClick={closeCandidate} />
      </div>

      <div className="px-7 pt-5 pb-[34px]">
        <div className="flex flex-wrap gap-2 mb-5">
          <Button variant="primary" size="md" className="!rounded-lg" onClick={() => setMsgOpen(!msgOpen)}>
            {msgOpen ? "Hide messages" : "Message in platform"}
          </Button>
          <Button variant="secondary" size="md" className="!rounded-lg" onClick={emailCandidate}>
            Email candidate
          </Button>
          {isApplication && (
            <Button variant="secondary" size="md" className="!rounded-lg" onClick={advanceStage} disabled={!canAdvance}>
              {canAdvance ? `Advance to ${STAGES[stageIndex + 1]}` : "Final stage"}
            </Button>
          )}
        </div>

        {cand.note && (
          <div className="bg-surface-sunken border border-line rounded-[11px] px-4 py-[15px] mb-5">
            <div className="text-[11.5px] tracking-[0.08em] uppercase font-mono text-muted-2 mb-[7px]">Their note</div>
            <p className="m-0 text-sm leading-[1.6] text-ink-2">{cand.note}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mb-[22px]">
          {facts.map((f) => (
            <div key={f.label} className="bg-surface border border-line-soft rounded-[9px] px-[13px] py-[11px]">
              <div className="text-[11.5px] text-muted-2 mb-[3px]">{f.label}</div>
              <div className="text-[13.5px] font-medium">{f.value}</div>
            </div>
          ))}
        </div>

        {skillChips.length > 0 && (
          <>
            <h3 className="m-0 mb-[9px] text-sm font-semibold">Skill match</h3>
            <div className="flex flex-wrap gap-1.5 mb-[22px]">
              {skillChips.map((s) => {
                const hit = cand.matchedSkills.includes(s);
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
          </>
        )}

        <h3 className="m-0 mb-3 text-sm font-semibold">Experience</h3>
        {cand.experience.length === 0 ? (
          <p className="m-0 mb-6 text-[13.5px] text-muted">No experience listed.</p>
        ) : (
          <div className="flex flex-col gap-3.5 mb-6">
            {cand.experience.map((e) => (
              <div key={`${e.years}-${e.role}-${e.org}`} className="grid gap-3.5" style={{ gridTemplateColumns: "100px minmax(0,1fr)" }}>
                <div className="font-mono text-xs text-muted-2 pt-0.5">{e.years}</div>
                <div>
                  <div className="text-sm font-semibold">{e.role}</div>
                  <div className="text-[12.5px] text-muted mt-0.5">{e.org}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {msgOpen && <MessageThread key={`${cand.kind}-${cand.id}`} cand={cand} firstName={firstName} />}
      </div>
    </Sheet>
  );
}

// Opening the thread is a POST to /api/threads/, which the server treats as
// "get or create" for this recruiter, seeker and role, so reopening the sheet
// shows the existing conversation instead of starting a new one.
function MessageThread({ cand, firstName }: { cand: CandidateDetail; firstName: string }) {
  const { showToast } = useAppState();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const thread = useAsync(
    () => http.post<ApiThread>("/api/threads/", { seeker: Number(cand.seekerId), job: cand.jobId ? Number(cand.jobId) : undefined }),
    [cand.seekerId, cand.jobId],
  );

  async function send() {
    const body = draft.trim();
    if (!body || !thread.data || sending) return;
    setSending(true);
    try {
      const message = await http.post<ApiMessage>(`/api/threads/${thread.data.id}/messages/`, { body });
      thread.setData((t) => ({ ...t, messages: [...t.messages, message] }));
      setDraft("");
    } catch (e) {
      showToast(messageOf(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-line-soft pt-5">
      <h3 className="m-0 mb-2.5 text-sm font-semibold">Message thread</h3>

      {thread.error && <Notice tone="error">{thread.error}</Notice>}
      {!thread.data && !thread.error && <p className="m-0 mb-3 text-[13px] text-muted">Opening conversation…</p>}

      {thread.data && (
        <div className="flex flex-col gap-2 mb-3">
          {thread.data.messages.length === 0 && (
            <p className="m-0 text-[13px] text-muted">No messages yet. Say hello to {firstName}.</p>
          )}
          {thread.data.messages.map((m) => (
            <div
              key={m.id}
              title={timeAgo(m.sentAt)}
              className={
                m.mine
                  ? "self-end max-w-[78%] bg-accent-tint text-accent-deep rounded-[10px_10px_3px_10px] px-[13px] py-2.5 text-[13.5px] leading-[1.5]"
                  : "self-start max-w-[78%] bg-tag-fill rounded-[10px_10px_10px_3px] px-[13px] py-2.5 text-[13.5px] leading-[1.5]"
              }
            >
              {m.body}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          disabled={!thread.data}
          className="flex-1 px-3 py-2.5 border border-line-strong rounded-lg bg-surface-sunken text-[13.5px] focus:outline-none focus:border-accent"
        />
        <Button variant="accent" size="md" className="!rounded-lg" onClick={send} disabled={!thread.data || sending || !draft.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
