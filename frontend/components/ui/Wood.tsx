import type { HTMLAttributes } from "react";

/** A wooden container: the town job board and the pipeline planters. */
export default function Wood({ big = false, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { big?: boolean }) {
  const shape = big
    ? "rounded-[26px] p-4 shadow-[inset_0_0_0_5px_var(--color-wood-inner),0_6px_0_var(--color-wood-edge)]"
    : "rounded-[22px] p-3 shadow-[inset_0_0_0_4px_var(--color-wood-inner),0_5px_0_var(--color-wood-edge)]";
  return <div className={`bg-wood ${shape} ${className}`} {...props} />;
}
