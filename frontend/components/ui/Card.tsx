import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
  padding?: "none" | "sm" | "md";
};

// Paper, big rounded corners, no border, and a 5px drop edge.
export default function Card({ hoverable = false, padding = "md", className = "", ...props }: Props) {
  const paddingClass = padding === "none" ? "" : padding === "sm" ? "p-4" : "p-5";
  const hoverClass = hoverable ? "cursor-pointer transition-[translate] duration-150 hover:-translate-y-0.5" : "";
  return (
    <div
      className={`bg-paper rounded-[24px] shadow-[0_5px_0_var(--color-edge)] ${paddingClass} ${hoverClass} ${className}`}
      {...props}
    />
  );
}
