"use client";

import { type ReactNode, useState } from "react";
import { ApiError, http, messageOf } from "@/lib/api";
import { useAppState } from "@/state/AppState";
import ProfileCard from "./ProfileCard";
import Button from "./ui/Button";
import { FieldError, Label, TextArea, TextInput } from "./ui/Field";

export type FieldDef = {
  // Must match the API field name, since validation errors come back keyed by it.
  key: string;
  label: string;
  kind?: "text" | "date" | "number" | "textarea" | "url";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  // Takes the full row instead of half of it.
  wide?: boolean;
};

type Props<T extends { id: number }> = {
  title: string;
  addLabel: string;
  emptyText: string;
  // Collection endpoint, e.g. "/api/profile/experience/". Rows live at `${path}${id}/`.
  path: string;
  items: T[];
  fields: FieldDef[];
  renderItem: (item: T) => ReactNode;
  // Receives the fresh list from the server after every add, edit or delete, so
  // the order always matches what the API (and recruiters) will see.
  onItems: (items: T[]) => void;
};

type Editing = "new" | number | null;

/**
 * One repeating part of a profile (jobs, schools, links, projects).
 *
 * It reads as a plain list. Pressing Edit in the corner switches the block to
 * management mode, where each entry can be edited or removed and new ones added;
 * Done goes back to reading. The four sections differ only in their fields, so
 * this turns a field list into the form and talks to the matching REST endpoint.
 */
export default function ProfileSection<T extends { id: number }>({
  title,
  addLabel,
  emptyText,
  path,
  items,
  fields,
  renderItem,
  onItems,
}: Props<T>) {
  const { showToast } = useAppState();
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  function open(item?: T) {
    const values: Record<string, string> = {};
    for (const field of fields) {
      const current = item ? (item as unknown as Record<string, unknown>)[field.key] : "";
      values[field.key] = current === null || current === undefined ? "" : String(current);
    }
    setForm(values);
    setErrors({});
    setEditing(item ? item.id : "new");
  }

  function closeEntry() {
    setEditing(null);
    setErrors({});
  }

  function finish() {
    closeEntry();
    setManaging(false);
  }

  async function refresh() {
    onItems(await http.get<T[]>(path));
  }

  async function save() {
    const missing: Record<string, string[]> = {};
    for (const field of fields) {
      if (field.required && !form[field.key]?.trim()) missing[field.key] = ["Required."];
    }
    if (Object.keys(missing).length) {
      setErrors(missing);
      return;
    }

    // The API wants real numbers and nulls, not the empty strings a form holds.
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const value = form[field.key] ?? "";
      if (field.kind === "number") body[field.key] = value === "" ? null : Number(value);
      else if (field.kind === "date") body[field.key] = value === "" ? null : value;
      else body[field.key] = value.trim();
    }

    setSaving(true);
    try {
      if (editing === "new") await http.post(path, body);
      else await http.patch(`${path}${editing}/`, body);
      await refresh();
      closeEntry();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else showToast(messageOf(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: T) {
    if (!window.confirm("Remove this entry from your profile?")) return;
    try {
      await http.delete(`${path}${item.id}/`);
      await refresh();
      if (editing === item.id) closeEntry();
    } catch (e) {
      showToast(messageOf(e));
    }
  }

  const editor = (
    <div className="bg-surface-sunken border border-line rounded-[11px] p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {fields.map((field) => (
          <div key={field.key} className={field.wide || field.kind === "textarea" ? "sm:col-span-2" : ""}>
            <Label>
              {field.label}
              {field.required ? "" : " (optional)"}
            </Label>
            {field.kind === "textarea" ? (
              <TextArea
                rows={3}
                value={form[field.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
            ) : (
              <TextInput
                type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"}
                value={form[field.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
            )}
            {field.hint && !errors[field.key] && <p className="m-0 mt-1 text-[12px] text-muted-2">{field.hint}</p>}
            <FieldError messages={errors[field.key]} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={closeEntry} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );

  return (
    <ProfileCard
      title={title}
      editing={managing}
      onEdit={() => setManaging(true)}
      action={
        <Button variant="primary" onClick={finish}>
          Done
        </Button>
      }
    >
      {items.length === 0 && editing !== "new" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[13.5px] text-muted">{emptyText}</p>
          {!managing && (
            <button
              onClick={() => {
                setManaging(true);
                open();
              }}
              className="border-0 bg-transparent p-0 text-[13px] text-accent cursor-pointer hover:underline"
            >
              + {addLabel}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) =>
          managing && editing === item.id ? (
            <div key={item.id}>{editor}</div>
          ) : (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{renderItem(item)}</div>
              {managing && (
                <div className="shrink-0 flex gap-3 text-[12.5px]">
                  <button onClick={() => open(item)} className="border-0 bg-transparent p-0 text-muted underline cursor-pointer hover:text-ink">
                    Edit
                  </button>
                  <button onClick={() => remove(item)} className="border-0 bg-transparent p-0 text-muted underline cursor-pointer hover:text-danger">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ),
        )}
        {managing && editing === "new" && editor}
      </div>

      {managing && editing !== "new" && (
        <button
          onClick={() => open()}
          className={`${items.length ? "mt-4" : "mt-3"} border-0 bg-transparent p-0 text-[13px] text-accent cursor-pointer hover:underline`}
        >
          + {addLabel}
        </button>
      )}
    </ProfileCard>
  );
}
