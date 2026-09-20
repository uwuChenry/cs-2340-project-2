"use client";

import { http } from "./api";
import type { ApiRecruiterJob } from "./apiTypes";
import { useAsync } from "./useAsync";
import { useAppState } from "@/state/AppState";

/**
 * The signed-in recruiter's own openings, plus which one the recruiter pages are
 * currently looking at. The choice lives in AppState so the pipeline, sourcing
 * and cluster views stay on the same role as you move between tabs.
 *
 * With nothing chosen (or a choice that no longer exists) it falls back to the
 * published opening with the most applicants, so the first screen is the one
 * with something to look at, then to any opening.
 */
export function useRecruiterJobs() {
  const { recruiterJobId, setRecruiterJobId, dataVersion } = useAppState();
  const jobs = useAsync(() => http.get<ApiRecruiterJob[]>("/api/recruiter/jobs/"), [dataVersion]);

  const list = jobs.data ?? [];
  const busiest = list
    .filter((j) => j.status === "published")
    .reduce<ApiRecruiterJob | null>((best, j) => (!best || j.applicantCount > best.applicantCount ? j : best), null);
  const selected = list.find((j) => String(j.id) === recruiterJobId) ?? busiest ?? list[0] ?? null;

  return {
    list,
    selected,
    select: (id: string) => setRecruiterJobId(id),
    loading: jobs.loading,
    error: jobs.error,
    reload: jobs.reload,
  };
}
