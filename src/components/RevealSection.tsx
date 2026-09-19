"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** One cross-browser timeline drives both the rolling tile and its heading. */
export default function RevealSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  const section = useRef<HTMLElement>(null);
  const heading = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sectionElement = section.current;
    const headingElement = heading.current;
    if (!sectionElement || !headingElement) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    // A circle rolling a distance d turns d / (pi * diameter) times. The dot's
    // box spans the travel and the svg inside it is one diameter, so measuring
    // both here is what keeps the dot rolling instead of slipping or spinning
    // in place. CSS cannot divide one length by another, hence the measurement.
    const measureTurns = () => {
      const dot = headingElement.querySelector<HTMLElement>(".roll-dot");
      const svg = dot?.querySelector("svg");
      if (!dot || !svg) return;
      // Layout widths, not bounding rects: the svg is already rotated, and a
      // rect measures the rotated box, which would feed the error back in.
      const travel = dot.offsetWidth;
      const diameter = parseFloat(getComputedStyle(svg).width);
      if (!travel || !diameter) return;
      sectionElement.style.setProperty(
        "--roll-turns",
        String(travel / (Math.PI * diameter)),
      );
    };

    const update = () => {
      frame = 0;
      measureTurns();
      if (reducedMotion.matches) {
        sectionElement.style.setProperty("--progress", "1");
        return;
      }

      const top = headingElement.getBoundingClientRect().top;
      const progress =
        (window.innerHeight * 0.9 - top) / (window.innerHeight * 0.5);

      // Finish the reveal once there is no scrolling left to do. The formula
      // above assumes the heading keeps rising, but on a tall viewport the
      // page runs out of scroll first, and the heading would then sit
      // permanently half revealed: the title clipped mid-word and the dot
      // parked mid-roll. Reported on a 1440p screen, invisible on a laptop.
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 1;

      sectionElement.style.setProperty(
        "--progress",
        atEnd ? "1" : String(Math.max(0, Math.min(1, progress))),
      );
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    // The heading is nowrap in a web font, so its width jumps when that font
    // swaps in. Neither scroll nor resize fires for that.
    document.fonts?.ready.then(schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <section
      ref={section}
      className="section section-reveal"
      aria-labelledby={id}
    >
      <div className="section-wrap">
        <div ref={heading} className="rolling-heading">
          {lead}
          <h2 className="section-title section-title-reveal" id={id}>
            {title}
          </h2>
        </div>
        <div className="meeting-layout">{children}</div>
      </div>
    </section>
  );
}
