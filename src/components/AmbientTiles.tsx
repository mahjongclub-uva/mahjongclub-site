"use client";

import { Dots, Bamboo } from "@/components/TileArtwork";
import { useEffect, useRef } from "react";

/** Decorative edge tiles drift with the reader, with no continuous animation. */
export default function AmbientTiles() {
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = backdrop.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      if (reducedMotion.matches) {
        element.style.removeProperty("--ambient-progress");
        return;
      }

      const scrollRange =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollRange > 0 ? window.scrollY / scrollRange : 0;
      element.style.setProperty(
        "--ambient-progress",
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
    <div ref={backdrop} className="ambient-tiles" aria-hidden="true">
      <span className="ambient-drift-left ambient-turn" />
      <span className="ambient-drift-right" />
      <span className="ambient-drift-left" />
      <svg
        className="ambient-motif ambient-dots"
        viewBox="0 0 88 124"
      >
        <Dots count={3} />
      </svg>
      <svg
        className="ambient-motif ambient-bamboo"
        viewBox="0 0 88 124"
      >
        <Bamboo count={2} />
      </svg>
      <div className="ambient-character ambient-drift-right">福</div>
      <svg
        className="ambient-motif ambient-center-dots"
        viewBox="0 0 88 124"
      >
        <Dots count={1} />
      </svg>
      <svg
        className="ambient-motif ambient-center-bamboo"
        viewBox="0 0 88 124"
      >
        <Bamboo count={3} />
      </svg>
      <svg
        className="ambient-motif ambient-extra-dots"
        viewBox="0 0 88 124"
      >
        <Dots count={5} />
      </svg>
      <svg
        className="ambient-motif ambient-extra-bamboo"
        viewBox="0 0 88 124"
      >
        <Bamboo count={4} />
      </svg>
    </div>
  );
}
