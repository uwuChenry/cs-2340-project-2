import type { ReactNode } from "react";

/** The small paper pill above a page title, e.g. "The Board". */
export function SectionTag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-block font-display text-[13px] font-semibold bg-paper text-area-ink-2 px-3 py-1 rounded-full shadow-[0_3px_0_var(--color-edge)] ${className}`}
    >
      {children}
    </span>
  );
}

/** Section tag + page title (+ optional line underneath), in the area's ink colour. */
export default function PageHeading({
  tag,
  title,
  sub,
  className = "",
}: {
  tag: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <SectionTag className="mb-2">{tag}</SectionTag>
      <h1 className="m-0 font-display text-[30px] sm:text-[34px] font-semibold leading-[1.15] tracking-[-0.01em] text-area-ink">
        {title}
      </h1>
      {sub && <p className="m-0 mt-1.5 text-[16px] font-bold leading-[1.5] text-area-ink-2 max-w-[600px]">{sub}</p>}
    </div>
  );
}
