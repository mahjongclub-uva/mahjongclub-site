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

    const update = () => {
      frame = 0;
      if (reducedMotion.matches) {
        sectionElement.style.setProperty("--progress", "1");
        return;
      }

      const top = headingElement.getBoundingClientRect().top;
      const progress =
        (window.innerHeight * 0.9 - top) / (window.innerHeight * 0.5);
      sectionElement.style.setProperty(
        "--progress",
        String(Math.max(0, Math.min(1, progress))),
      );
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
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
