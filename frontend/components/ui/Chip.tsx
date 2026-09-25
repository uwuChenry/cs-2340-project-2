"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimate, type HTMLMotionProps } from "motion/react";

type Props = HTMLMotionProps<"button"> & {
  selected?: boolean;
  dashed?: boolean;
};

export default function Chip({ selected = false, dashed = false, className = "", ...props }: Props) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const mounted = useRef(false);

  // Pop a little when the chip becomes selected (but not on first render).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (selected) animate(scope.current, { scale: [1, 1.1, 1] }, { duration: 0.3, ease: "easeOut" });
  }, [selected, animate, scope]);

  const tone = selected
    ? "bg-accent-tint text-accent border-accent-border"
    : dashed
      ? "bg-surface text-accent border-accent-border border-dashed"
      : "bg-surface text-ink-3 border-line-strong";

  return (
    <motion.button
      ref={scope}
      className={`rounded-full border px-2.5 py-[5px] text-[12.5px] cursor-pointer transition-colors duration-150 ${tone} ${className}`}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", bounce: 0.4, visualDuration: 0.2 }}
      {...props}
    />
  );
}
