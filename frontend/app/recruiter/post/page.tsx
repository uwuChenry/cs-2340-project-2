"use client";

import { type KeyboardEvent, useState } from "react";
import { postRoleSkills } from "@/lib/mockData";
import { useAppState } from "@/state/AppState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Label, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SingleLocationMap } from "@/components/SchematicMap";

export default function PostRolePage() {
  const { showToast } = useAppState();
  const [title, setTitle] = useState("Senior Frontend Engineer");
  const [baseRange, setBaseRange] = useState("$150k — $185k");
  const [setup, setSetup] = useState("Hybrid — 3 days onsite");
  const [skills, setSkills] = useState<string[]>(postRoleSkills);
  const [skillDraft, setSkillDraft] = useState("");
  const [description, setDescription] = useState(
    "You will own the candidate-facing surfaces of our product: search, map, and application flow. We care about craft, accessible markup, and shipping in small increments.",
  );
  const [address, setAddress] = useState("1104 Rio Grande St, Austin, TX");

  function addSkill(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = skillDraft.trim();
    if (value && !skills.includes(value)) setSkills((s) => [...s, value]);
    setSkillDraft("");
  }

  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-2 mb-2">Openings</div>
      <h1 className="m-0 mb-5 text-[30px] font-semibold tracking-[-0.025em]">Post a role</h1>

      <div className="flex flex-wrap gap-[18px] items-start">
        <Card padding="none" className="flex-[3_1_400px] min-w-0 p-[22px]">
          <div className="grid gap-4">
            <div>
              <Label>Role title</Label>
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} className="!text-[14.5px] !py-2.5" />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <Label>Base range</Label>
                <TextInput value={baseRange} onChange={(e) => setBaseRange(e.target.value)} className="!text-[14.5px] !py-2.5" />
              </div>
              <div>
                <Label>Work setup</Label>
                <Select value={setup} onChange={(e) => setSetup(e.target.value)}>
                  <option>Hybrid — 3 days onsite</option>
                  <option>Remote</option>
                  <option>Onsite</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Required skills</Label>
              <div className="flex flex-wrap gap-1.5 p-2.5 border border-line-strong rounded-lg bg-surface-sunken">
                {skills.map((s) => (
                  <span
                    key={s}
                    onClick={() => setSkills((cur) => cur.filter((sk) => sk !== s))}
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
              <TextArea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2.5 justify-end border-t border-line-soft pt-4">
              <Button variant="secondary" size="md" onClick={() => showToast("Draft saved")}>
                Save draft
              </Button>
              <Button variant="primary" size="md" onClick={() => showToast("Opening published")}>
                Publish opening
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="none" className="flex-[1_1_300px] min-w-0 max-w-[400px] p-[18px]">
          <h2 className="m-0 mb-1 text-[15px] font-semibold">Office location</h2>
          <p className="m-0 mb-3.5 text-[13px] text-muted leading-[1.5]">Drop the pin candidates will see on the map.</p>
          <SingleLocationMap address={address.split(",")[0] || address} height={230} />
          <TextInput value={address} onChange={(e) => setAddress(e.target.value)} className="mt-3 !text-[13.5px]" />
        </Card>
      </div>
    </div>
  );
}
