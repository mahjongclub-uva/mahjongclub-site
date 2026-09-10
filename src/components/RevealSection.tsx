"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A section that publishes its own scroll progress as a CSS variable.
 *
 * `--progress` runs 0 when the section's top edge is at the bottom of the
 * viewport to 1 when its bottom edge leaves the top. CSS does the rest, so the
 * animation itself is still declarative — this only supplies the clock.
 *
 * Why not `animation-timeline: view()`, which needs no JavaScript at all: it
 * has not shipped in Firefox. Everything else driven that way degrades to its
 * final state and looks deliberate — text at full ink, sections visible. The
 * rolling dot does not: a dot that never rolls is a dot sitting in the middle
 * of the page doing nothing, which reads as broken rather than as restrained.
 * That is worth one scroll listener.
 *
 * The listener is passive and coalesced to one write per frame, so it cannot
 * block scrolling. If JavaScript never runs, `--progress` is never set and the
 * CSS falls back to 1 — the finished state, which is where the animation ends
 * anyway.
 */
export default function RevealSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  /** Sits above the heading. Decorative — the rolling dot lives here. */
  lead?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Someone who has asked for less motion gets the finished state, not a
    // faster version of the journey.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) {
      el.style.setProperty("--progress", "1");
      return;
    }

    let frame = 0;

    const write = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const span = box.height + window.innerHeight;
      const progress = span > 0 ? (window.innerHeight - box.top) / span : 1;
      el.style.setProperty(
        "--progress",
        String(Math.min(1, Math.max(0, progress))),
      );
    };

    // One write per frame however many scroll events arrive.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    // A hidden document suspends requestAnimationFrame, so a scroll that
    // happens in a background tab schedules a frame that never arrives and
    // leaves the dot stranded mid-roll when you come back. Re-read on the way
    // in rather than waiting for the next scroll to fix it.
    const onVisible = () => {
      if (document.visibilityState === "visible") write();
    };

    write();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <section ref={ref} className="section section-reveal" aria-labelledby={id}>
      <div className="section-wrap">
        {lead}
        <h2 className="section-title section-title-reveal" id={id}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
