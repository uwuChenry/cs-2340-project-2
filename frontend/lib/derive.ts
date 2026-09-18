import type { ApplicationBase, Filters, Job, PrivacySettings } from "./types";
import { baseApplications, mySkills, privacyFieldDefs } from "./mockData";

export const RECOMMENDATION_THRESHOLD = 75;

export function filterJobs(allJobs: Job[], f: Filters): Job[] {
  const q = f.q.trim().toLowerCase();
  const loc = f.loc.trim().toLowerCase();
  return allJobs.filter((j) => {
    if (q && !`${j.title} ${j.company}`.toLowerCase().includes(q)) return false;
    if (loc && !j.location.toLowerCase().includes(loc)) return false;
    if (j.salaryLow < f.minSalary) return false;
    if (f.setup === "remote" && j.setup !== "Remote") return false;
    if (f.setup === "onsite" && j.setup === "Remote") return false;
    if (f.visa && !j.visa) return false;
    if (f.skills.length && !f.skills.every((s) => j.skills.includes(s))) return false;
    return true;
  });
}

export function skillMatchPct(skills: string[], seekerSkills: string[] = mySkills): number {
  if (skills.length === 0) return 0;
  return Math.round((skills.filter((s) => seekerSkills.includes(s)).length / skills.length) * 100);
}

export function isRecommended(pct: number): boolean {
  return pct >= RECOMMENDATION_THRESHOLD;
}

export function setupLabel(job: Job): string {
  return job.setup === "Remote" ? "Remote" : `${job.setup} · onsite days`;
}

export function distanceLabel(job: Job): string {
  return job.distanceMi === 0 ? "Anywhere" : `${job.distanceMi} mi away`;
}

export function salaryLabel(job: Job): string {
  return `$${job.salaryLow}k–$${job.salaryHigh}k`;
}

export function isNearby(job: Job, radius: number): boolean {
  return job.distanceMi <= radius || job.distanceMi === 0;
}

export function sortByRecommended(jobList: Job[]): Job[] {
  return [...jobList].sort((a, b) => {
    const aRec = isRecommended(skillMatchPct(a.skills)) ? 1 : 0;
    const bRec = isRecommended(skillMatchPct(b.skills)) ? 1 : 0;
    return bRec - aRec;
  });
}

export function ringSizePx(radius: number): number {
  return 70 + radius * 3.4;
}

export type ApplicationView = ApplicationBase & {
  statusColor: "ink" | "success" | "muted";
};

export function buildApplications(
  applied: Record<string, boolean>,
  allJobs: Job[],
): ApplicationView[] {
  const extra = Object.keys(applied)
    .filter((id) => applied[id])
    .map((id) => {
      const job = allJobs.find((j) => j.id === id);
      if (!job) return null;
      if (baseApplications.some((a: ApplicationBase) => a.company === job.company)) return null;
      return {
        id: `n${id}`,
        title: job.title,
        company: job.company,
        location: job.location,
        stageIndex: 0,
        updated: "Just now",
        next: "Submitted",
      } satisfies ApplicationBase;
    })
    .filter((a): a is ApplicationBase => a !== null);

  return [...extra, ...baseApplications].map((a) => ({
    ...a,
    statusColor: a.stageIndex === 3 ? "success" : a.stageIndex === 4 ? "muted" : "ink",
  }));
}

export function privacySummary(privacy: PrivacySettings): string {
  const hidden = privacyFieldDefs.filter((f) => !privacy[f.key]).length;
  if (hidden === 0) return "Your full profile is visible to verified recruiters.";
  return `${hidden} ${hidden === 1 ? "field is" : "fields are"} hidden until you apply to a role.`;
}
