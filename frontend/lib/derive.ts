import type { Job, PrivacySettings } from "./types";
import { privacyFieldDefs } from "./constants";

// Skill match, recommendation and distance are computed by the server, because
// only the server knows the signed-in seeker's skills and coordinates. What is
// left here is presentation.

// Mirrors RECOMMENDATION_THRESHOLD in backend/jobs/matching.py. Only used for copy;
// the server decides which roles are actually flagged as recommended.
export const RECOMMENDATION_THRESHOLD = 75;

export function setupLabel(job: Job): string {
  return job.setup === "Remote" ? "Remote" : `${job.setup} · onsite days`;
}

export function distanceLabel(job: Job): string {
  if (job.distanceMi === null) return "Distance unknown";
  return job.distanceMi === 0 ? "Anywhere" : `${job.distanceMi} mi away`;
}

export function salaryLabel(job: Job): string {
  if (job.salaryLow === null && job.salaryHigh === null) return "Salary not listed";
  if (job.salaryHigh === null || job.salaryHigh === job.salaryLow) return `$${job.salaryLow}k`;
  if (job.salaryLow === null) return `Up to $${job.salaryHigh}k`;
  return `$${job.salaryLow}k–$${job.salaryHigh}k`;
}

// A job with no known distance is not greyed out on the map: there is nothing to
// say it is too far.
export function isNearby(job: Job, radius: number): boolean {
  return job.distanceMi === null || job.distanceMi === 0 || job.distanceMi <= radius;
}

// Recommended roles first, otherwise keeping the server's newest-first order.
export function sortByRecommended(jobList: Job[]): Job[] {
  return [...jobList].sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

export function ringSizePx(radius: number): number {
  return 70 + radius * 3.4;
}

export function privacySummary(privacy: PrivacySettings): string {
  const hidden = privacyFieldDefs.filter((f) => !privacy[f.key]).length;
  if (hidden === 0) return "Your door is wide open. Verified recruiters see your whole profile.";
  return `${hidden} ${hidden === 1 ? "thing stays" : "things stay"} private until you apply somewhere.`;
}
