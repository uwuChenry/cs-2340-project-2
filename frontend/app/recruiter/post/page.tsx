"use client";

import { type KeyboardEvent, useState } from "react";
import { http, messageOf } from "@/lib/api";
import type { ApiRecruiterJob } from "@/lib/apiTypes";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Label, Select, TextArea, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import { SingleLocationMap } from "@/components/SchematicMap";

type Setup = "hybrid" | "remote" | "on_site";

const setupOptions: { value: Setup; label: string }[] = [
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "on_site", label: "Onsite" },
];

type Form = {
  title: string;
  baseRange: string;
  setup: Setup;
  skills: string[];
  description: string;
  address: string;
};

const emptyForm: Form = { title: "", baseRange: "", setup: "hybrid", skills: [], description: "", address: "" };

// "$150k — $185k", "150-185" and "$150,000 to $185,000" all mean the same thing.
// Bare numbers under 1000 are read as thousands, which is how people type a range.
function parseRange(text: string): { min: number | null; max: number | null } | null {
  const values = [...text.matchAll(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/gi)].map((m) => {
    const n = parseFloat(m[1].replace(/,/g, ""));
    return m[2] || n < 1000 ? Math.round(n * 1000) : Math.round(n);
  });
  if (values.length === 0) return text.trim() ? null : { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

// The form has a single address box; the API wants city and state separately.
// "1104 Rio Grande St, Austin, TX" -> Austin / TX, and "Austin, TX" -> Austin / TX.
function parseAddress(text: string): { city: string; state: string } | null {
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { city: parts[0], state: "" };
  if (parts.length === 2) {
    return /^[A-Za-z]{2}$/.test(parts[1]) ? { city: parts[0], state: parts[1] } : { city: parts[1], state: "" };
  }
  return { city: parts[parts.length - 2], state: parts[parts.length - 1] };
}

const dollarsToK = (n: number) => `$${Math.round(n / 1000)}k`;

function formFromJob(job: ApiRecruiterJob): Form {
  const range =
    job.salaryMin !== null && job.salaryMax !== null
      ? `${dollarsToK(job.salaryMin)} — ${dollarsToK(job.salaryMax)}`
      : job.salaryMin !== null
        ? dollarsToK(job.salaryMin)
        : "";
  return {
    title: job.title,
    baseRange: range,
    setup: job.setup,
    skills: job.skills,
    description: job.description,
    address: [job.address, job.city, job.state].filter(Boolean).join(", "),
  };
}

export default function PostRolePage() {
  return (
    <Guard role="recruiter">
      <PostRole />
    </Guard>
  );
}

function PostRole() {
  const { showToast, bumpData } = useAppState();
  const openings = useAsync(() => http.get<ApiRecruiterJob[]>("/api/recruiter/jobs/"), []);

  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [skillDraft, setSkillDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function addSkill(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = skillDraft.trim();
    if (value && !form.skills.some((s) => s.toLowerCase() === value.toLowerCase())) set("skills", [...form.skills, value]);
    setSkillDraft("");
  }

  function startEditing(job: ApiRecruiterJob | null) {
    setEditingId(job?.id ?? null);
    setForm(job ? formFromJob(job) : emptyForm);
    setProblem(null);
  }

  async function submit(status: "draft" | "published") {
    const range = parseRange(form.baseRange);
    const place = parseAddress(form.address);
    if (!form.title.trim()) return setProblem("Give the role a title.");
    if (!range) return setProblem("Enter the base range like $150k — $185k.");
    if (!place) return setProblem("Add an address or at least a city.");
    if (status === "published" && !form.description.trim()) return setProblem("Add a description before publishing.");

    setSaving(true);
    setProblem(null);
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      status,
      setup: form.setup,
      salaryMin: range.min,
      salaryMax: range.max,
      skills: form.skills,
      address: form.address.split(",")[0].trim(),
      city: place.city,
      state: place.state,
    };
    try {
      const saved = editingId
        ? await http.patch<ApiRecruiterJob>(`/api/recruiter/jobs/${editingId}/`, body)
        : await http.post<ApiRecruiterJob>("/api/recruiter/jobs/", body);
      setEditingId(saved.id);
      openings.reload();
      bumpData();
      showToast(status === "published" ? "Opening published" : "Draft saved");
    } catch (e) {
      setProblem(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  const list = openings.data ?? [];

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Openings</div>
      <h1 className="m-0 mb-5 text-[30px] font-semibold tracking-[-0.025em]">
        {editingId ? "Edit role" : "Post a role"}
      </h1>

      <div className="flex flex-wrap gap-[18px] items-start">
        <Card padding="none" className="flex-[3_1_400px] min-w-0 p-[22px]">
          <div className="grid gap-4">
            <div>
              <Label>Role title</Label>
              <TextInput
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="!text-[14.5px] !py-2.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <Label>Base range</Label>
                <TextInput
                  value={form.baseRange}
                  onChange={(e) => set("baseRange", e.target.value)}
                  placeholder="$150k — $185k"
                  className="!text-[14.5px] !py-2.5"
                />
              </div>
              <div>
                <Label>Work setup</Label>
                <Select value={form.setup} onChange={(e) => set("setup", e.target.value as Setup)}>
                  {setupOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Required skills</Label>
              <div className="flex flex-wrap gap-1.5 p-2.5 border border-line-strong rounded-lg bg-surface-sunken">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    onClick={() => set("skills", form.skills.filter((sk) => sk !== s))}
                    className="text-[12.5px] bg-accent-tint text-accent rounded-md px-[9px] py-1 cursor-pointer"
                    title="Remove skill"
                  >
                    {s}
                  </span>
                ))}
                <input
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder="Add skill…"
                  className="border-0 bg-transparent outline-none text-[13px] flex-1 min-w-[80px]"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <TextArea
                rows={5}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What will this person own? What does the team care about?"
              />
            </div>

            {problem && <Notice tone="error">{problem}</Notice>}

            <div className="flex gap-2.5 justify-end border-t border-line-soft pt-4">
              <Button variant="secondary" size="md" disabled={saving} onClick={() => submit("draft")}>
                Save draft
              </Button>
              <Button variant="primary" size="md" disabled={saving} onClick={() => submit("published")}>
                {editingId ? "Save and publish" : "Publish opening"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex-[1_1_300px] min-w-0 max-w-[400px] flex flex-col gap-3.5">
          <Card padding="none" className="p-[18px]">
            <h2 className="m-0 mb-1 text-[15px] font-semibold">Office location</h2>
            <p className="m-0 mb-3.5 text-[13px] text-muted leading-[1.5]">
              Candidates see this address on the role. The pin is placed automatically from the address you type below.
            </p>
            <SingleLocationMap address={form.address.split(",")[0] || "Add an address"} height={230} />
            <TextInput
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="1104 Rio Grande St, Austin, TX"
              className="mt-3 !text-[13.5px]"
            />
          </Card>

          <Card padding="none" className="p-[18px]">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="m-0 text-[15px] font-semibold">Your openings</h2>
              {editingId && (
                <button
                  onClick={() => startEditing(null)}
                  className="border-0 bg-transparent p-0 text-[13px] text-accent cursor-pointer"
                >
                  + New role
                </button>
              )}
            </div>
            {openings.error && <Notice tone="error">{openings.error}</Notice>}
            {list.length === 0 && !openings.error && (
              <p className="m-0 text-[13px] text-muted">{openings.loading ? "Loading…" : "Nothing posted yet."}</p>
            )}
            <div className="flex flex-col">
              {list.map((job) => (
                <button
                  key={job.id}
                  onClick={() => startEditing(job)}
                  className={`text-left border-0 border-b border-line-soft last:border-b-0 py-2.5 cursor-pointer flex items-center justify-between gap-3 ${
                    job.id === editingId ? "bg-accent-tint-2 -mx-2 px-2 rounded-lg" : "bg-transparent"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{job.title}</span>
                    <span className="block text-[11.5px] text-muted-2 mt-0.5">
                      {job.applicantCount} applicant{job.applicantCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[10.5px] tracking-[0.06em] uppercase rounded-md px-[7px] py-[3px] ${
                      job.status === "published" ? "text-success bg-success-bg" : "text-muted bg-tag-fill"
                    }`}
                  >
                    {job.status}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
