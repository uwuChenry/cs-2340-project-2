"use client";

import { privacySummary } from "@/lib/derive";
import { SEEKER_INITIALS, SEEKER_NAME, mySkills, privacyFieldDefs, seekerEducation, seekerExperience } from "@/lib/mockData";
import type { PrivacySettings } from "@/lib/types";
import { useAppState } from "@/state/AppState";
import { Avatar } from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";

export default function ProfilePage() {
  const { headline, setHeadline, privacy, togglePrivacy } = useAppState();

  return (
    <div className="flex flex-wrap gap-[18px] items-start">
      <div className="flex-[3_1_400px] min-w-0 flex flex-col gap-3.5">
        <Card padding="none" className="p-[22px]">
          <div className="flex gap-4 items-start">
            <Avatar initials={SEEKER_INITIALS} size={64} radius="square" />
            <div className="min-w-0 flex-1">
              <h1 className="m-0 mb-1 text-2xl font-semibold tracking-[-0.02em]">{SEEKER_NAME}</h1>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-2.5 py-2 border border-line rounded-lg bg-surface-sunken text-[14.5px] mb-2.5 focus:outline-none focus:border-accent"
              />
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted">
                <span>Austin, TX</span>
                <span>Open to remote</span>
                <a href="#">portfolio.mayae.dev</a>
                <a href="#">github.com/mayae</a>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="none" className="p-[22px]">
          <h2 className="m-0 mb-3 text-[15px] font-semibold">Skills</h2>
          <div className="flex flex-wrap gap-1.5">
            {mySkills.map((s) => (
              <span key={s} className="text-[13px] text-ink-3 bg-tag-fill border border-line-tag rounded-md px-2.5 py-[5px]">
                {s}
              </span>
            ))}
            <button className="text-[13px] text-accent bg-surface border border-dashed border-accent-border rounded-md px-2.5 py-[5px] cursor-pointer">
              + Add skill
            </button>
          </div>
        </Card>

        <Card padding="none" className="p-[22px]">
          <h2 className="m-0 mb-3.5 text-[15px] font-semibold">Experience</h2>
          <div className="flex flex-col gap-4">
            {seekerExperience.map((e) => (
              <div key={`${e.years}-${e.role}`} className="grid gap-4" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
                <div className="font-mono text-xs text-muted-2 pt-0.5">{e.years}</div>
                <div>
                  <div className="text-[14.5px] font-semibold">{e.role}</div>
                  <div className="text-[13px] text-muted my-0.5 mb-1.5">{e.org}</div>
                  <p className="m-0 text-[13.5px] text-ink-3 leading-[1.55]">{e.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="none" className="p-[22px]">
          <h2 className="m-0 mb-3.5 text-[15px] font-semibold">Education</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "110px minmax(0,1fr)" }}>
            <div className="font-mono text-xs text-muted-2 pt-0.5">{seekerEducation.years}</div>
            <div>
              <div className="text-[14.5px] font-semibold">{seekerEducation.degree}</div>
              <div className="text-[13px] text-muted mt-0.5">{seekerEducation.org}</div>
            </div>
          </div>
        </Card>
      </div>

      <aside className="flex-[1_1_280px] min-w-0 max-w-[340px] flex flex-col gap-3.5">
        <Card>
          <h2 className="m-0 mb-1 text-[15px] font-semibold">Privacy</h2>
          <p className="m-0 mb-3.5 text-[13px] text-muted leading-[1.5]">Control what recruiters see before you apply.</p>
          <div className="flex flex-col gap-1">
            {privacyFieldDefs.map((f) => (
              <button
                key={f.key}
                onClick={() => togglePrivacy(f.key as keyof PrivacySettings)}
                className="flex items-center justify-between gap-3 border-0 bg-transparent py-2.5 cursor-pointer text-left border-b border-line-soft last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px]">{f.label}</span>
                  <span className="block text-xs text-muted-2 mt-0.5">{f.hint}</span>
                </span>
                <Toggle on={privacy[f.key as keyof PrivacySettings]} />
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
