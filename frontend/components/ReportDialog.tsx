"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { http, messageOf } from "@/lib/api";
import { springBouncy } from "@/lib/motion";
import { Label, Select, TextArea } from "./ui/Field";
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springBouncy}
        className="w-full max-w-[480px] bg-paper rounded-[26px] shadow-[0_6px_0_#D9C59A] p-6"
      >
        <h2 id="report-title" className="m-0 mb-2 font-display text-[22px] font-semibold text-ink">Report {target.label}</h2>
        <p className="m-0 mb-5 text-[14px] font-semibold leading-[1.5] text-muted">
          Tell the administrator what needs attention. Your report will be reviewed privately.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <Label htmlFor="report-reason">Reason</Label>
        <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-4">
          {reasons.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Label htmlFor="report-details">Details (optional)</Label>
        <TextArea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
          rows={5}
          placeholder="Add context that can help with the review"
          className="mb-5"
        />
        <div className="flex justify-end gap-2">
          <Button size="md" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="primary" size="md" onClick={submit} disabled={sending}>{sending ? "Sending…" : "Send report"}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}