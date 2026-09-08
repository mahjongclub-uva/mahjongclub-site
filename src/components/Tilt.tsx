"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Leans its children toward the pointer.
 *
 * The tiles are real 3D boxes, so a few degrees of lean is enough to show
 * their thickness and catch the light differently — which is what sells them
 * as objects rather than pictures of objects. Kept small on purpose: this is
 * meant to be noticed only if you look.
 *
 * It sets two custom properties and nothing else. The CSS decides what to do
 * with them, so the effect can be retuned or removed without touching this
 * file.
 *
 * Does nothing at all when the visitor prefers reduced motion, or on a device
 * without a hovering pointer — a phone has no cursor to follow, and reading
 * touch as a lean makes the page feel unstable while scrolling.
 */
export default function Tilt({
  children,
  max = 7,
}: {
  children: ReactNode;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hovers = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (still.matches || !hovers.matches) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      // Coalesce to one update per frame: pointermove fires far more often
      // than the screen repaints, and the extra work is invisible.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        const dx = (event.clientX - (box.left + box.width / 2)) / window.innerWidth;
        const dy = (event.clientY - (box.top + box.height / 2)) / window.innerHeight;
        const clamp = (n: number) => Math.max(-1, Math.min(1, n * 2));
        el.style.setProperty("--tilt-y", `${clamp(dx) * max}deg`);
        el.style.setProperty("--tilt-x", `${clamp(-dy) * max}deg`);
      });
    };

    const rest = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", rest);
    window.addEventListener("blur", rest);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", rest);
      window.removeEventListener("blur", rest);
    };
  }, [max]);

  return (
    <div className="tilt" ref={ref}>
      {children}
    </div>
  );
}
