"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * Instagram mark in two layers, same arrangement as the hero: the drawn tile
 * renders first as fallback, and only steps aside once the 3D scene has
 * actually drawn a frame, so a blocked WebGL context leaves it in place.
 * Under reduced motion the scene never loads, since it turns with the pointer.
 */
const Scene = dynamic(() => import("@/components/InstagramTileScene"), {
  ssr: false,
  loading: () => null,
});

export default function InstagramTile({
  active = false,
  pointer,
}: {
  active?: boolean;
  pointer: React.RefObject<{ x: number; y: number }>;
}) {
  const still = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  // The tile sits far down the page, so its 3D scene waits until the tile is
  // nearly in view rather than competing with the hero's as the page loads.
  const tile = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        watch.disconnect();
      },
      { rootMargin: "400px" },
    );
    watch.observe(tile.current!);
    return () => watch.disconnect();
  }, []);

  // Ships hidden and is revealed only if the 3D scene fails to turn up. The
  // countdown pauses while backgrounded, since a hidden tab draws no frames
  // and would otherwise be wrongly judged a failure.
  useEffect(() => {
    if (ready || !near || still) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (document.visibilityState !== "visible" || timer) return;
      timer = setTimeout(() => setGaveUp(true), 3500);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", start);
    };
  }, [ready, near, still]);

  return (
    <span
      ref={tile}
      className="ig-tile"
      data-scene={still || gaveUp ? "fallback" : ready ? "ready" : "waiting"}
      aria-hidden="true"
    >
      <MarkGlyph />
      <span className="ig-tile-scene">
        {near && still === false && (
          <Scene active={active} pointer={pointer} onReady={onReady} />
        )}
      </span>
    </span>
  );
}

function MarkGlyph() {
  return (
    <svg
      className="ig-mark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
