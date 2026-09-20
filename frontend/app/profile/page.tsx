"use client";

import { ApiError, http, messageOf } from "@/lib/api";
import type { ApiEducation, ApiExperience, ApiProfile, ApiProfileLink, ApiProject } from "@/lib/apiTypes";
import { toExperienceList } from "@/lib/adapters";
import { privacyFieldDefs } from "@/lib/constants";
import { privacySummary } from "@/lib/derive";
import type { PrivacySettings } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { useAppState } from "@/state/AppState";
import { useAuth } from "@/state/AuthState";
import Guard from "@/components/Guard";
import { AboutBlock, HeaderBlock, type SaveResult, SkillsBlock } from "@/components/ProfileBlocks";
import ProfileSection from "@/components/ProfileSection";
import Card from "@/components/ui/Card";
import Notice from "@/components/ui/Notice";
import Toggle from "@/components/ui/Toggle";

export default function ProfilePage() {
  return (
    <Guard role="job_seeker">
      <Profile />
    </Guard>
  );
}

function Profile() {
  const { showToast, setMySkills } = useAppState();
  const { refresh: refreshSession } = useAuth();
  const { data: profile, error, loading, setData } = useAsync(() => http.get<ApiProfile>("/api/profile/"), []);

  // Folds a whole-profile reply into the page, and keeps the skills the search
  // screen uses for match scores in step with it.
  function applyProfile(updated: ApiProfile) {
    setData(() => updated);
    setMySkills(updated.skills);
  }

  async function save(changes: Record<string, unknown>, success?: string): Promise<SaveResult> {
    try {
      applyProfile(await http.patch<ApiProfile>("/api/profile/", changes));
      if (success) showToast(success);
      return { ok: true, errors: {} };
    } catch (e) {
      showToast(messageOf(e));
      return { ok: false, errors: e instanceof ApiError ? e.fieldErrors : {} };
    }
  }

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!profile) return loading ? <p className="text-[14px] text-muted">Loading your profile…</p> : null;

  const privacy: PrivacySettings = profile.privacy;

  const checklist = [
    { label: "Add a headline", done: !!profile.headline },
    { label: "Set your location", done: !!profile.location },
    { label: "List your skills", done: profile.skills.length > 0 },
    { label: "Add work experience", done: profile.experience.length > 0 },
    { label: "Add your education", done: profile.education.length > 0 },
  ];
  const remaining = checklist.filter((c) => !c.done).length;

  return (
    <div className="flex flex-wrap gap-[18px] items-start">
      <div className="flex-[3_1_400px] min-w-0 flex flex-col gap-3.5">
        <HeaderBlock
          profile={profile}
          save={save}
          onProfile={applyProfile}
          onNameChanged={() => refreshSession().catch(() => {})}
        />

        {remaining > 0 && (
          <div className="bg-accent-tint-2 border border-accent-border-2 rounded-xl px-[18px] py-4">
            <div className="text-[13.5px] font-semibold text-accent-deep mb-2.5">
              Finish your profile · {checklist.length - remaining} of {checklist.length} done
            </div>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {checklist.map((item) => (
                <li key={item.label} className={`flex items-center gap-2 text-[13px] ${item.done ? "text-muted-2 line-through" : "text-accent-text"}`}>
                  <span
                    aria-hidden
                    className={`w-3.5 h-3.5 rounded-full border grid place-items-center text-[9px] leading-none ${
                      item.done ? "bg-accent border-accent text-white" : "bg-surface border-accent-border"
                    }`}
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AboutBlock profile={profile} save={save} />
        <SkillsBlock profile={profile} save={save} />

        <ProfileSection<ApiExperience>
          title="Experience"
          addLabel="Add experience"
          emptyText="No experience added yet."
          path="/api/profile/experience/"
          items={profile.experience}
          onItems={(experience) => setData((p) => ({ ...p, experience }))}
          fields={[
            { key: "title", label: "Title", required: true, placeholder: "Frontend Engineer" },
            { key: "company", label: "Company", required: true, placeholder: "Fielder Logistics" },
            { key: "startDate", label: "Start date", kind: "date", required: true },
            { key: "endDate", label: "End date", kind: "date", hint: "Leave empty if this is your current role." },
            { key: "description", label: "What you did", kind: "textarea" },
          ]}
          renderItem={(item) => {
            const [entry] = toExperienceList([item]);
            return (
              <div className="grid gap-4" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
                <div className="font-mono text-xs text-muted-2 pt-0.5">{entry.years}</div>
                <div>
                  <div className="text-[14.5px] font-semibold">{entry.role}</div>
                  <div className="text-[13px] text-muted my-0.5 mb-1.5">{entry.org}</div>
                  {entry.detail && <p className="m-0 text-[13.5px] text-ink-3 leading-[1.55]">{entry.detail}</p>}
                </div>
              </div>
            );
          }}
        />

        <ProfileSection<ApiEducation>
          title="Education"
          addLabel="Add education"
          emptyText="No education added yet."
          path="/api/profile/education/"
          items={profile.education}
          onItems={(education) => setData((p) => ({ ...p, education }))}
          fields={[
            { key: "school", label: "School", required: true, wide: true, placeholder: "University of Texas at Austin" },
            { key: "degree", label: "Degree", required: true, placeholder: "B.S." },
            { key: "fieldOfStudy", label: "Field of study", placeholder: "Computer Science" },
            { key: "startYear", label: "Start year", kind: "number", placeholder: "2017" },
            { key: "graduationYear", label: "Graduation year", kind: "number", placeholder: "2021" },
          ]}
          renderItem={(ed) => (
            <div className="grid gap-4" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
              <div className="font-mono text-xs text-muted-2 pt-0.5">
                {[ed.startYear, ed.graduationYear].filter(Boolean).join(" — ")}
              </div>
              <div>
                <div className="text-[14.5px] font-semibold">
                  {ed.degree}
                  {ed.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ""}
                </div>
                <div className="text-[13px] text-muted mt-0.5">{ed.school}</div>
              </div>
            </div>
          )}
        />

        <ProfileSection<ApiProject>
          title="Projects"
          addLabel="Add project"
          emptyText="Recruiters can search candidates by what's in their projects."
          path="/api/profile/projects/"
          items={profile.projects}
          onItems={(projects) => setData((p) => ({ ...p, projects }))}
          fields={[
            { key: "name", label: "Name", required: true, wide: true, placeholder: "Clustered map view" },
            { key: "description", label: "Description", kind: "textarea", placeholder: "What it does and what you built." },
            { key: "url", label: "Link", kind: "url", wide: true, placeholder: "https://…" },
          ]}
          renderItem={(project) => (
            <div>
              <div className="text-[14.5px] font-semibold">
                {project.url ? (
                  <a href={project.url} target="_blank" rel="noreferrer">
                    {project.name}
                  </a>
                ) : (
                  project.name
                )}
              </div>
              {project.description && <p className="m-0 mt-1 text-[13.5px] text-ink-3 leading-[1.55]">{project.description}</p>}
            </div>
          )}
        />

        <ProfileSection<ApiProfileLink>
          title="Links"
          addLabel="Add link"
          emptyText="Portfolio, GitHub, LinkedIn — anything you want recruiters to open."
          path="/api/profile/links/"
          items={profile.links}
          onItems={(links) => setData((p) => ({ ...p, links }))}
          fields={[
            { key: "label", label: "Label", required: true, placeholder: "GitHub" },
            { key: "url", label: "URL", kind: "url", required: true, placeholder: "https://github.com/you" },
          ]}
          renderItem={(link) => (
            <div className="text-[14px]">
              <span className="font-semibold">{link.label}</span>{" "}
              <a href={link.url} target="_blank" rel="noreferrer" className="text-[13px] break-all">
                {link.url}
              </a>
            </div>
          )}
        />
      </div>

      <aside className="flex-[1_1_280px] min-w-0 max-w-[340px] flex flex-col gap-3.5">
        <Card>
          <h2 className="m-0 mb-1 text-[15px] font-semibold">Privacy</h2>
          <p className="m-0 mb-3.5 text-[13px] text-muted leading-[1.5]">Control what recruiters see before you apply.</p>
          <div className="flex flex-col gap-1">
            {privacyFieldDefs.map((f) => (
              <button
                key={f.key}
                onClick={() => save({ privacy: { [f.key]: !privacy[f.key] } })}
                className="flex items-center justify-between gap-3 border-0 bg-transparent py-2.5 cursor-pointer text-left border-b border-line-soft last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px]">{f.label}</span>
                  <span className="block text-xs text-muted-2 mt-0.5">{f.hint}</span>
                </span>
                <Toggle on={privacy[f.key]} />
              </button>
            ))}
          </div>
          <div className="mt-3.5 px-3 py-2.5 bg-surface-muted rounded-lg text-[12.5px] text-ink-3 leading-[1.5]">
            {privacySummary(privacy)}
          </div>
        </Card>
      </aside>
    </div>
  );
}
