"use client";

import { type KeyboardEvent, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { http, messageOf } from "@/lib/api";
import type { ApiRecruiterJob } from "@/lib/apiTypes";
import { springBouncy } from "@/lib/motion";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import Guard from "@/components/Guard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Label, Select, TextArea, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import PageHeading from "@/components/ui/PageHeading";
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
    if (!range) return setProblem("Enter the pay range like $150k – $185k.");
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
      showToast(status === "published" ? "Pinned! Your posting is on the board." : "Draft saved. It's not on the board yet.");
    } catch (e) {
      setProblem(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  const list = openings.data ?? [];

  return (
    <div>
      <PageHeading tag="Pin a posting" title={editingId ? "Edit posting" : "Post a role"} className="mb-[22px]" />

      <div className="flex flex-wrap gap-5 items-start">
        <Card padding="none" className="flex-[3_1_420px] min-w-0 p-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="post-title">Role title</Label>
              <TextInput
                id="post-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="!text-[15px] !font-bold"
              />
            </div>
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <Label htmlFor="post-range">Pay range</Label>
                <TextInput
                  id="post-range"
                  value={form.baseRange}
                  onChange={(e) => set("baseRange", e.target.value)}
                  placeholder="$150k – $185k"
                  className="!text-[15px] !font-bold"
                />
              </div>
              <div>
                <Label htmlFor="post-setup">Work setup</Label>
                <Select id="post-setup" value={form.setup} onChange={(e) => set("setup", e.target.value as Setup)} className="!text-[15px] !font-bold">
                  {setupOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="post-skill">Skills you need</Label>
              <div className="flex flex-wrap gap-[7px] p-2.5 border-2 border-line rounded-[14px] bg-white has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sun">
                <AnimatePresence initial={false} mode="popLayout">
                {form.skills.map((s) => (
                  <motion.button
                    key={s}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={springBouncy}
                    type="button"
                    onClick={() => set("skills", form.skills.filter((sk) => sk !== s))}
                    className="border-0 font-display text-[13.5px] font-semibold bg-success-bg text-accent-deep rounded-full px-[11px] py-[3px] cursor-pointer"
                    title="Remove skill"
                    aria-label={`Remove ${s}`}
                  >
                    {s} ×
                  </motion.button>
                ))}
                </AnimatePresence>
                <input
                  id="post-skill"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder="Add skill, then Enter…"
                  className="border-0 bg-transparent outline-none text-[14px] font-semibold flex-1 min-w-[90px]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="post-description">Description</Label>
              <TextArea
                id="post-description"
                rows={5}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What will this person own? What does the team care about?"
              />
            </div>

            {problem && <Notice tone="error">{problem}</Notice>}

            <div className="flex flex-wrap gap-2.5 justify-end border-t-2 border-dashed border-line pt-[18px]">
              <Button variant="secondary" size="md" disabled={saving} onClick={() => submit("draft")}>
                Save draft
              </Button>
              <Button variant="primary" size="md" disabled={saving} onClick={() => submit("published")}>
                {editingId ? "Save and pin it" : "Pin it to the board"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex-[1_1_300px] min-w-0 max-w-[420px] flex flex-col gap-4">
          <Card padding="none" className="p-[18px]">
            <h2 className="m-0 mb-1 font-display text-[19px] font-semibold text-ink">Office location</h2>
            <p className="m-0 mb-3.5 text-[14px] font-semibold text-muted leading-[1.5]">
              The pin candidates see on the map. It&rsquo;s placed from the address you type below.
            </p>
            <SingleLocationMap address={form.address.split(",")[0] || "Add an address"} height={240} />
            <TextInput
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="1104 Rio Grande St, Austin, TX"
              aria-label="Office address"
              className="mt-3 !font-bold"
            />
          </Card>

          <Card padding="none" className="p-[18px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="m-0 font-display text-[19px] font-semibold text-ink">Your postings</h2>
              {editingId && (
                <Button variant="paper" onClick={() => startEditing(null)}>
                  + New posting
                </Button>
              )}
            </div>
            {openings.error && <Notice tone="error">{openings.error}</Notice>}
            {list.length === 0 && !openings.error && (
              <p className="m-0 text-[14px] font-bold text-muted">{openings.loading ? "Looking at the board…" : "Nothing pinned yet."}</p>
            )}
            <div className="flex flex-col">
              {list.map((job) => (
                <button
                  key={job.id}
                  onClick={() => startEditing(job)}
                  aria-current={job.id === editingId ? "true" : undefined}
                  className={`text-left border-0 border-b-2 border-dashed border-line-tag last:border-b-0 py-2.5 cursor-pointer flex items-center justify-between gap-3 ${
                    job.id === editingId ? "bg-sun/40 -mx-2 px-2 rounded-xl" : "bg-transparent"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold text-ink-2 whitespace-nowrap overflow-hidden text-ellipsis">{job.title}</span>
                    <span className="block text-[12.5px] font-bold text-muted-2 mt-0.5">
                      {job.applicantCount} applicant{job.applicantCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-display text-[12px] font-semibold rounded-full px-[9px] py-0.5 ${
                      job.status === "published" ? "text-white bg-accent" : "text-ink-3 bg-tan"
                    }`}
                  >
                    {job.status === "published" ? "On the board" : job.status === "draft" ? "Draft" : "Closed"}
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
