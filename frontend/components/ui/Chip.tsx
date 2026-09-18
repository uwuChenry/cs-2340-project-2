import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  dashed?: boolean;
};

export default function Chip({ selected = false, dashed = false, className = "", ...props }: Props) {
  const tone = selected
    ? "bg-accent-tint text-accent border-accent-border"
    : dashed
      ? "bg-surface text-accent border-accent-border border-dashed"
      : "bg-surface text-ink-3 border-line-strong";

  return (
    <button
      className={`rounded-full border px-2.5 py-[5px] text-[12.5px] cursor-pointer transition-colors duration-150 ${tone} ${className}`}
      {...props}
    />
  );
}
