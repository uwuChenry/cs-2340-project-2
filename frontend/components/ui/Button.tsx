"use client";

import { motion, type HTMLMotionProps } from "motion/react";

type Variant = "primary" | "secondary" | "accent" | "link";
type Size = "sm" | "md";

const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ground border border-transparent hover:bg-ink-2",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-hover-fill",
  accent: "bg-accent text-white border border-transparent hover:bg-accent-deep",
  link: "bg-transparent text-muted border-0 underline font-normal p-0 hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-[7px] text-[13px]",
  md: "px-4 py-2.5 text-[14.5px]",
};

type Props = HTMLMotionProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({ variant = "secondary", size = "sm", className = "", ...props }: Props) {
  const styleClasses = variant === "link" ? variants.link : `${variants[variant]} ${sizes[size]}`;
  // A small press-in on click; skipped for text links and disabled buttons.
  const pressable = variant !== "link" && !props.disabled;
  return (
    <motion.button
      className={`${base} ${styleClasses} ${className}`}
      whileTap={pressable ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", bounce: 0.4, visualDuration: 0.2 }}
      {...props}
    />
  );
}
