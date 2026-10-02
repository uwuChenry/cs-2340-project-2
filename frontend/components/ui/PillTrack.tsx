"use client";

import { type HTMLAttributes, useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

type Props = HTMLAttributes<HTMLDivElement> & {
  // Changes whenever the selection does; the pill glides to the new option.
  selected: string | null;
  // Classes for the pill itself: its colour, radius and edge.
  pillClassName?: string;
};

/**
 * A row of options with one yellow pill that glides to whichever is selected
 * (the child with aria-pressed="true" or aria-current). The pill is positioned
 * from the selected option's offsetLeft/offsetTop inside this container, so
 * nothing outside — a banner appearing above, the page settling in — can knock
 * it out of place.
 *
 * Options need no background of their own when selected; give their labels
 * `relative z-[2]` so they sit above the pill. Options must not create their own
 * stacking context (no z-index on them) or the pill would slide underneath.
 */
export default function PillTrack({ selected, pillClassName = "bg-sun rounded-full", className = "", children, ...rest }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const container = track.current;
    const el = pill.current;
    if (!container || !el) return;

    function target() {
      return container!.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current]:not([aria-current="false"])');
    }

    function place(animated: boolean) {
      const option = target();
      if (!option) {
        el!.style.opacity = "0";
        placed.current = false;
        return;
      }
      const box = { x: option.offsetLeft, y: option.offsetTop, width: option.offsetWidth, height: option.offsetHeight };
      el!.style.opacity = "1";
      // Both paths go through Motion so it always knows where the pill is.
      const glide = animated && placed.current && !reduceMotion;
      animate(el!, box, glide ? { type: "spring", stiffness: 420, damping: 34 } : { duration: 0 });
      placed.current = true;
    }

    place(true);
    // Wrapping, font loading and window resizes move the options: follow them
    // without animating. A ResizeObserver also fires once as soon as it starts
    // observing; skip that one or it would cut the glide short.
    let initial = true;
    const observer = new ResizeObserver(() => {
      if (initial) {
        initial = false;
        return;
      }
      place(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [selected, reduceMotion]);

  return (
    <div ref={track} className={`relative ${className}`} {...rest}>
      <span ref={pill} aria-hidden className={`absolute left-0 top-0 z-[1] pointer-events-none opacity-0 ${pillClassName}`} />
      {children}
    </div>
  );
}
