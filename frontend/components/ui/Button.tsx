import type { ButtonHTMLAttributes } from "react";

// Every button is a pill with a hard "drop edge" underneath that it sinks into
// when pressed.
type Variant = "primary" | "secondary" | "paper" | "selected" | "sent" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full border-0 font-display font-semibold cursor-pointer whitespace-nowrap transition-[translate,box-shadow] duration-100 hover:-translate-y-px active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:active:translate-y-0";

const variants: Record<Exclude<Variant, "link">, string> = {
  primary: "bg-accent text-white shadow-[0_4px_0_var(--color-accent-deep)]",
  secondary: "bg-tan text-ink-2 shadow-[0_4px_0_#D9C59A]",
  paper: "bg-paper text-ink-2 shadow-[0_4px_0_var(--color-edge)]",
  selected: "bg-sun text-sun-ink shadow-[0_4px_0_var(--color-sun-edge)]",
  sent: "bg-success-bg text-success shadow-[0_4px_0_var(--color-success-border)]",
};

const sizes: Record<Size, string> = {
  sm: "px-[15px] py-[7px] text-[13.5px]",
  md: "px-[18px] py-[10px] text-[15px]",
  lg: "px-[22px] py-[11px] text-[16px]",
};

const link =
  "bg-transparent border-0 p-0 text-[13px] font-bold text-muted-2 underline cursor-pointer hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({ variant = "secondary", size = "sm", className = "", ...props }: Props) {
  const styleClasses = variant === "link" ? link : `${base} ${variants[variant]} ${sizes[size]}`;
  return <button className={`${styleClasses} ${className}`} {...props} />;
}
