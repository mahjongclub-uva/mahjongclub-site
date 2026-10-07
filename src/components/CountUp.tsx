"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A score counting up from 0 as its row lands. JavaScript rather than a CSS
 * counter: Safari does not repaint a counter while its value animates, so the
 * score only appeared at the end. The server-rendered number stays for no-JS
 * and reduced motion.
 */
export default function CountUp({
  value,
  delay,
}: {
  value: number;
  delay: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // Layout effect, so a client-side navigation never paints the final number
  // before the count starts.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Already showing (JS arrived after the CSS fallback, or motion is
    // reduced): leave the real number alone rather than resetting it to 0.
    const shown = getComputedStyle(element).visibility === "visible";
    element.dataset.counted = "";
    if (shown) return;

    const start = performance.now() + delay;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 600));
      element.textContent = String(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    tick(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      element.textContent = String(value);
      // A remount (or Strict Mode's rerun) must judge visibility afresh.
      delete element.dataset.counted;
    };
  }, [value, delay]);

  return (
    <span ref={ref} className="count">
      {value}
    </span>
  );
}
