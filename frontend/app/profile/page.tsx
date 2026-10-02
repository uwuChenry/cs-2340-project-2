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
import { SectionTag } from "@/components/ui/PageHeading";
import Toggle from "@/components/ui/Toggle";

const datePill = "self-start font-display text-[13px] font-semibold bg-tan text-ink-3 px-[11px] py-[3px] rounded-full whitespace-nowrap";

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
  if (!profile) return loading ? <p className="text-[15px] font-bold text-area-ink-2">Opening the front door…</p> : null;

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
    <div>
      <SectionTag className="mb-4">My house</SectionTag>
      <div className="flex flex-wrap gap-5 items-start">
        <div className="flex-[3_1_420px] min-w-0 flex flex-col gap-4">
          <HeaderBlock
            profile={profile}
            save={save}
            onProfile={applyProfile}
            onNameChanged={() => refreshSession().catch(() => {})}
          />

          {remaining > 0 && (
            <div className="bg-success-bg rounded-[22px] px-5 py-4 shadow-[0_4px_0_var(--color-success-border)]">
              <div className="font-display text-[17px] font-semibold text-accent-text mb-2.5">
                Finish settling in · {checklist.length - remaining} of {checklist.length} done
              </div>
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {checklist.map((item) => (
                  <li key={item.label} className={`flex items-center gap-2 text-[14px] font-bold ${item.done ? "text-muted-2 line-through" : "text-accent-text"}`}>
                    <span
                      aria-hidden
                      className={`w-[18px] h-[18px] rounded-full border-2 grid place-items-center text-[10px] leading-none ${
                        item.done ? "bg-accent border-accent text-white" : "bg-white border-accent-border"
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
            title="Work experience"
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
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <span className={datePill}>{entry.years}</span>
                  <div className="flex-[1_1_280px] min-w-0">
                    <div className="font-display text-[17px] font-semibold text-ink-2">{entry.role}</div>
                    <div className="text-[14px] font-bold text-muted mt-0.5 mb-1.5">{entry.org}</div>
                    {entry.detail && <p className="m-0 text-[14.5px] font-semibold text-ink-3 leading-[1.55]">{entry.detail}</p>}
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
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {(ed.startYear || ed.graduationYear) && (
                  <span className={datePill}>{[ed.startYear, ed.graduationYear].filter(Boolean).join(" – ")}</span>
                )}
                <div className="flex-[1_1_280px] min-w-0">
                  <div className="font-display text-[17px] font-semibold text-ink-2">
                    {ed.degree}
                    {ed.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ""}
                  </div>
                  <div className="text-[14px] font-bold text-muted mt-0.5">{ed.school}</div>
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
                <div className="font-display text-[17px] font-semibold text-ink-2">
                  {project.url ? (
                    <a href={project.url} target="_blank" rel="noreferrer">
                      {project.name}
                    </a>
                  ) : (
                    project.name
                  )}
                </div>
                {project.description && <p className="m-0 mt-1 text-[14.5px] font-semibold text-ink-3 leading-[1.55]">{project.description}</p>}
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
              <div className="text-[14.5px]">
                <span className="font-extrabold text-ink-2">{link.label}</span>{" "}
                <a href={link.url} target="_blank" rel="noreferrer" className="text-[14px] break-all">
                  {link.url}
                </a>
              </div>
            )}
          />
        </div>

        <aside className="flex-[1_1_290px] min-w-0 max-w-[360px] flex flex-col gap-4">
          <Card>
            <h2 className="m-0 mb-1 font-display text-[19px] font-semibold text-ink">Who can peek in</h2>
            <p className="m-0 mb-3 text-[14px] font-semibold text-muted leading-[1.5]">Choose what recruiters see before you apply.</p>
            <div className="flex flex-col">
              {privacyFieldDefs.map((f) => (
                <button
                  key={f.key}
                  role="switch"
                  aria-checked={privacy[f.key]}
                  onClick={() => save({ privacy: { [f.key]: !privacy[f.key] } })}
                  className="flex items-center justify-between gap-3 border-0 bg-transparent py-[11px] cursor-pointer text-left border-b-2 border-dashed border-line-tag"
                >
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-extrabold text-ink-2">{f.label}</span>
                    <span className="block text-[12.5px] font-semibold text-muted-2 mt-0.5">{f.hint}</span>
                  </span>
                  <Toggle on={privacy[f.key]} />
                </button>
              ))}
            </div>
            <div className="mt-3.5 px-3.5 py-3 bg-white rounded-[14px] text-[13.5px] font-bold text-ink-3 leading-[1.5]">
              {privacySummary(privacy)}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
