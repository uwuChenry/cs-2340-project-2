"use client";

import { motion } from "motion/react";
import { STAGE_COLORS } from "@/lib/constants";
import { springBouncy } from "@/lib/motion";
import { STAGES } from "@/lib/types";

/**
 * A postage stamp in the stage's colour: dashed cream inner border, solid outer
 * outline. It lands like it was just stamped on, and lands again when the stage changes.
 */
export function StageStamp({ stageIndex, size = 76, delay = 0 }: { stageIndex: number; size?: number; delay?: number }) {
  const color = STAGE_COLORS[stageIndex];
  return (
    <motion.div
      key={stageIndex}
      initial={{ opacity: 0, scale: 1.5, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 18, delay }}
      className="shrink-0 grid place-items-center rounded-[9px] border-[3px] border-dashed border-paper font-display text-[12.5px] font-semibold text-center leading-[1.1] p-1"
      style={{ width: size, height: size, background: color.fill, color: color.text, outline: `3px solid ${color.fill}` }}
    >
      {STAGES[stageIndex]}
    </motion.div>
  );
}

/** Five chunky segments that fill one after another, up to the current stage, in that stage's colour. */
export function StageProgress({ stageIndex, delay = 0 }: { stageIndex: number; delay?: number }) {
  const color = STAGE_COLORS[stageIndex];
  return (
    <div className="flex gap-[5px]" aria-label={`Stage: ${STAGES[stageIndex]}`}>
      {STAGES.map((label, i) => {
        const reached = i <= stageIndex;
        return (
          <div key={label} className="flex-1 flex flex-col gap-1 min-w-0">
            <span className="h-2.5 rounded-full bg-tan overflow-hidden">
              {reached && (
                <motion.span
                  className="block h-full rounded-full origin-left"
                  style={{ background: color.fill }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: delay + 0.2 + i * 0.12 }}
                />
              )}
            </span>
            <span
              className="text-[11px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: reached ? "#4A3726" : "#8A6E52" }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A round count in a stage's colour, used on stage pills and planter headers. Bounces when the number changes. */
export function StageCount({ stageIndex, count, size = 28 }: { stageIndex: number; count: number; size?: number }) {
  const color = STAGE_COLORS[stageIndex];
  return (
    <motion.span
      key={count}
      initial={{ scale: 1.5 }}
      animate={{ scale: 1 }}
      transition={springBouncy}
      className="grid place-items-center rounded-full px-2 font-display font-semibold"
      style={{ minWidth: size, height: size, background: color.fill, color: color.text, fontSize: size >= 28 ? 14 : 13 }}
    >
      {count}
    </motion.span>
  );
}
