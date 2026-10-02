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
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full border-0 bg-tan px-3 py-1 font-display text-[13px] font-semibold text-ink-3 shadow-[0_3px_0_#D9C59A] cursor-pointer hover:text-ink active:translate-y-[3px] active:shadow-none"
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
    <Card padding="none" className={`relative p-[22px] ${editing ? "outline-3 outline-sun" : ""}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <h2 className="m-0 font-display text-[19px] font-semibold text-ink">{title}</h2>
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
