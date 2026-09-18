"use client";

import { FormEvent, useEffect, useState } from "react";

type Job = {
  id: number;
  title: string;
  companyName: string;
  description: string;
  city: string;
  state: string;
  salaryMin: number | null;
  salaryMax: number | null;
  workArrangement: "remote" | "hybrid" | "on_site";
  offersVisaSponsorship: boolean;
  skills: string[];
};

type Filters = {
  title: string; location: string; skills: string; salaryMin: string;
  salaryMax: string; workArrangement: string; visaSponsorship: string;
};

const initialFilters: Filters = {
  title: "", location: "", skills: "", salaryMin: "", salaryMax: "", workArrangement: "", visaSponsorship: "",
};

function displaySalary(job: Job) {
  if (job.salaryMin === null || job.salaryMax === null) return "Salary not listed";
  return `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`;
}

function displayWorkArrangement(arrangement: Job["workArrangement"]) {
  return arrangement === "on_site" ? "On-site" : arrangement[0].toUpperCase() + arrangement.slice(1);
}

export default function Home() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadJobs(activeFilters: Filters) {
    setIsLoading(true);
    setError("");
    const params = new URLSearchParams();

    // Only send populated fields so every search filter remains optional.
    if (activeFilters.title) params.set("title", activeFilters.title);
    if (activeFilters.location) params.set("location", activeFilters.location);
    if (activeFilters.skills) params.set("skills", activeFilters.skills);
    if (activeFilters.salaryMin) params.set("salary_min", activeFilters.salaryMin);
    if (activeFilters.salaryMax) params.set("salary_max", activeFilters.salaryMax);
    if (activeFilters.workArrangement) params.set("work_arrangement", activeFilters.workArrangement);
    if (activeFilters.visaSponsorship) params.set("visa_sponsorship", activeFilters.visaSponsorship);

    try {
      const response = await fetch(`/api/jobs/?${params.toString()}`);
      if (!response.ok) throw new Error("Unable to load jobs.");
      const data = (await response.json()) as { results: Job[] };
      setJobs(data.results);
    } catch {
      setError("The job service is unavailable. Start Django on port 8000 and try again.");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadJobs(initialFilters); }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadJobs(filters);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a className="text-2xl font-bold tracking-tight text-blue-700" href="#top">CareerConnect</a>
          <span className="text-sm font-medium text-slate-600">Build your early-career future</span>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-7xl px-6 py-10">
        <p className="font-semibold text-blue-700">OPPORTUNITIES FOR EARLY-CAREER TALENT</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Find work that fits your future.</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">Search roles by skills, location, compensation, work style, and visa support.</p>

        <form className="mt-8 rounded-xl bg-white p-5 shadow-sm" onSubmit={submitSearch}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="field-label">Job title or company
              <input value={filters.title} onChange={(event) => setFilters({ ...filters, title: event.target.value })} placeholder="e.g., software engineer" />
            </label>
            <label className="field-label">Location
              <input value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="City or state" />
            </label>
            <label className="field-label">Skills
              <input value={filters.skills} onChange={(event) => setFilters({ ...filters, skills: event.target.value })} placeholder="Python, React" />
            </label>
            <label className="field-label">Work arrangement
              <select value={filters.workArrangement} onChange={(event) => setFilters({ ...filters, workArrangement: event.target.value })}>
                <option value="">Any arrangement</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option>
              </select>
            </label>
            <label className="field-label">Minimum salary
              <input type="number" min="0" value={filters.salaryMin} onChange={(event) => setFilters({ ...filters, salaryMin: event.target.value })} placeholder="e.g., 65000" />
            </label>
            <label className="field-label">Maximum salary
              <input type="number" min="0" value={filters.salaryMax} onChange={(event) => setFilters({ ...filters, salaryMax: event.target.value })} placeholder="e.g., 90000" />
            </label>
            <label className="field-label">Visa sponsorship
              <select value={filters.visaSponsorship} onChange={(event) => setFilters({ ...filters, visaSponsorship: event.target.value })}>
                <option value="">Any policy</option><option value="true">Offers sponsorship</option><option value="false">No sponsorship</option>
              </select>
            </label>
            <button className="mt-auto rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800" type="submit">Search jobs</button>
          </div>
        </form>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section aria-live="polite">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Available roles</h2><span className="text-sm text-slate-600">{jobs.length} matches</span></div>
            {isLoading && <p className="rounded-lg bg-white p-5">Loading opportunities…</p>}
            {error && <p className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">{error}</p>}
            {!isLoading && !error && jobs.length === 0 && <p className="rounded-lg bg-white p-5">No roles match these filters yet.</p>}
            <div className="space-y-4">{jobs.map((job) => <article className="rounded-xl bg-white p-5 shadow-sm" key={job.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{job.title}</h3><p className="text-slate-600">{job.companyName} · {job.city}{job.state ? `, ${job.state}` : ""}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{displayWorkArrangement(job.workArrangement)}</span></div>
              <p className="mt-3 line-clamp-2 text-slate-700">{job.description}</p><p className="mt-3 text-sm font-semibold">{displaySalary(job)}{job.offersVisaSponsorship ? " · Visa sponsorship" : ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">{job.skills.map((skill) => <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium" key={skill}>{skill}</span>)}</div>
            </article>)}</div>
          </section>
          <aside className="h-80 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-6 lg:sticky lg:top-6">
            <p className="font-semibold text-blue-800">Map view</p><h2 className="mt-2 text-2xl font-bold">Explore jobs near you</h2><p className="mt-3 text-slate-700">Each posting now includes latitude and longitude. This panel is ready to render interactive markers once the team selects a map provider.</p><div className="mt-8 grid h-32 place-items-center rounded-lg bg-white text-center text-sm text-slate-500">Interactive map coming next<br />{jobs.length} search results available for mapping</div>
          </aside>
        </div>
      </section>
    </main>
  );
}
