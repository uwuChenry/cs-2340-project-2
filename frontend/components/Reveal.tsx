"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { springSoft } from "@/lib/motion";

/**
 * Rises into place the first time it scrolls into view. Lets server components
 * (the landing page) use a scroll reveal without becoming client components.
 */
export default function Reveal({
  as = "div",
  className,
  children,
}: {
  as?: "div" | "section";
  className?: string;
  children: ReactNode;
}) {
  const Tag = as === "section" ? motion.section : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={springSoft}
    >
      {children}
    </Tag>
  );
}
