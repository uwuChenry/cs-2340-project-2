"use client";

import type { ApiRecruiterJob } from "@/lib/apiTypes";
import { Select } from "./ui/Field";

// Picks which of the recruiter's openings a recruiter page is about. Renders
// nothing when there is only one, since there is nothing to choose.
export default function RoleSelect({
  jobs,
  selectedId,
  onChange,
}: {
  jobs: ApiRecruiterJob[];
  selectedId: number | null;
  onChange: (id: string) => void;
}) {
  if (jobs.length < 2) return null;
  return (
    <Select
      aria-label="Opening"
      value={selectedId ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="!w-auto min-w-[220px] !text-[13.5px]"
    >
      {jobs.map((j) => (
        <option key={j.id} value={j.id}>
          {j.title}
          {j.status !== "published" ? ` (${j.status})` : ""}
        </option>
      ))}
    </Select>
  );
}
