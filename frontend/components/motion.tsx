"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";

// Shared motion settings, so every panel, pill and card moves the same way.
export const easeOut = [0.22, 1, 0.36, 1] as const;
export const spring = { type: "spring", bounce: 0.15, visualDuration: 0.35 } as const;
export const snappy = { type: "spring", bounce: 0.3, visualDuration: 0.25 } as const;

type WrapProps = { children: ReactNode; delay?: number; className?: string };

/** Fades and lifts its children in once, on first render. */
export function FadeUp({ children, delay = 0, className }: WrapProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: "translateY(14px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.55, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

/** Like FadeUp, but waits until the element scrolls into view. Pass `as` to render a list item or section instead of a div. */
export function Reveal({ children, delay = 0, className, as = "div" }: WrapProps & { as?: "div" | "li" | "section" }) {
  const Tag = as === "li" ? motion.li : as === "section" ? motion.section : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, transform: "translateY(18px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: easeOut }}
    >
      {children}
    </Tag>
  );
}

/** Counts from 0 up to `to` the first time it is visible. */
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(() => Math.round(count.get()));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, { duration: reduce ? 0 : 1.1, ease: easeOut });
    return () => controls.stop();
  }, [inView, to, count, reduce]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}
