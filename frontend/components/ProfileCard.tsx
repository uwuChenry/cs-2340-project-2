"use client";

import type { ReactNode } from "react";
import Card from "./ui/Card";

// The small "Edit" control that sits in the top-right corner of a profile block.
export function EditButton({ onClick, label = "Edit", pressed }: { onClick: () => void; label?: string; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 py-1 text-[12.5px] font-medium text-ink-3 cursor-pointer hover:bg-hover-fill hover:text-ink"
    >
      {label}
    </button>
  );
}

/**
 * One block of a profile. It reads as plain content until its Edit button (top
 * right) is pressed; the block then swaps to its edit controls while the rest of
 * the page stays as it was. `action` replaces the Edit button while editing, for
 * blocks whose changes save immediately and just need a "Done".
 */
export default function ProfileCard({
  title,
  editing,
  onEdit,
  action,
  children,
}: {
  title?: string;
  editing: boolean;
  onEdit: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  const corner = editing ? action : <EditButton onClick={onEdit} />;

  return (
    <Card padding="none" className={`relative p-[22px] ${editing ? "border-accent-border" : ""}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
          {corner}
        </div>
      ) : (
        // Blocks without a title (the header) float the control in the corner.
        <div className="absolute top-[18px] right-[18px]">{corner}</div>
      )}
      {children}
    </Card>
  );
}
