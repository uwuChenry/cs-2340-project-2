import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
  padding?: "none" | "sm" | "md";
};

export default function Card({ hoverable = false, padding = "md", className = "", ...props }: Props) {
  const paddingClass = padding === "none" ? "" : padding === "sm" ? "p-4" : "p-[18px]";
  const hoverClass = hoverable ? "hover:border-line-hover cursor-pointer" : "";
  return (
    <div
      className={`bg-surface border border-line rounded-xl transition-colors duration-150 ${paddingClass} ${hoverClass} ${className}`}
      {...props}
    />
  );
}
