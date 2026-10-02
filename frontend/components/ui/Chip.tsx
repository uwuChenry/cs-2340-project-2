import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  // A suggestion to add something, e.g. the note prompts: white with a dashed outline.
  dashed?: boolean;
};

export default function Chip({ selected = false, dashed = false, className = "", ...props }: Props) {
  const tone = selected
    ? "bg-sun text-sun-ink shadow-[0_3px_0_var(--color-sun-edge)]"
    : dashed
      ? "bg-paper text-ink-3 border-2 border-dashed border-line-strong"
      : "bg-paper text-ink-3 shadow-[0_3px_0_#D9C59A]";

  return (
    <button
      className={`rounded-full px-3 py-[5px] font-display text-[13px] font-semibold cursor-pointer active:translate-y-[2px] active:shadow-none ${tone} ${className}`}
      {...props}
    />
  );
}
