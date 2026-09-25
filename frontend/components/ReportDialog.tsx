"use client";

import { useState } from "react";
import { http, messageOf } from "@/lib/api";
import { TextArea } from "./ui/Field";
import Button from "./ui/Button";
import Notice from "./ui/Notice";

type Props = {
  target: { kind: "job" | "user"; id: string; label: string };
  onClose: () => void;
  onSubmitted: () => void;
};

const reasons = ["Spam or scam", "Misleading information", "Harassment or abuse", "Inappropriate content", "Other"];

export default function ReportDialog({ target, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!reason || sending) return;
    setSending(true);
    setError("");
    try {
      await http.post("/api/reports/", {
        reportedJob: target.kind === "job" ? Number(target.id) : undefined,
        reportedUser: target.kind === "user" ? Number(target.id) : undefined,
        reason,
        details: details.trim(),
      });
      onSubmitted();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="w-full max-w-[480px] bg-surface border border-line rounded-xl shadow-xl p-6">
        <h2 id="report-title" className="m-0 mb-2 text-lg font-semibold">Report {target.label}</h2>
        <p className="m-0 mb-5 text-[13.5px] leading-[1.5] text-muted">
          Tell the administrator what needs attention. Your report will be reviewed privately.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="report-reason">Reason</label>
        <select
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-[11px] py-[9px] mb-4 border border-line-strong rounded-lg bg-surface-sunken text-[14px] focus:outline-none focus:border-accent"
        >
          {reasons.map((item) => <option key={item}>{item}</option>)}
        </select>
        <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="report-details">Details (optional)</label>
        <TextArea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder="Add context that can help with the review"
          className="mb-5"
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="accent" onClick={submit} disabled={sending}>{sending ? "Submitting…" : "Submit report"}</Button>
        </div>
      </div>
    </div>
  );
}