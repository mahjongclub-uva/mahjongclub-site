"use client";

import { useEffect } from "react";

/** Publishes scroll progress (0..1) for the background tiles to drift with. */
export default function AmbientDrift() {
  useEffect(() => {
    const element = document.querySelector<HTMLElement>(".ambient-tiles");
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

  return null;
}
