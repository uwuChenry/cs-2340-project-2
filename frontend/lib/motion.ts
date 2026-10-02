import type { Transition, Variants } from "motion/react";

// Shared motion presets, so the whole app moves with one personality: soft,
// slightly bouncy springs (things settle like they were set down by hand),
// never long fades. Everything is wrapped in <MotionConfig reducedMotion="user">
// in AppShell, so people who ask for less motion get opacity changes only.

export const springSoft: Transition = { type: "spring", stiffness: 380, damping: 32 };
export const springBouncy: Transition = { type: "spring", stiffness: 520, damping: 24 };
export const springSlide: Transition = { type: "spring", stiffness: 340, damping: 36 };
export const easeOut: Transition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

// A list whose children drop in one after another. Use with `listItem` on the
// children. The stagger is capped so long lists don't keep you waiting.
export const list: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: springSoft },
};

// Something that pops into place: a badge, a chip, a bubble.
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  shown: { opacity: 1, scale: 1, transition: springBouncy },
};
