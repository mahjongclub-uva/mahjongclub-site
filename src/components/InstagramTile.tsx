"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { TileFaceArt } from "@/components/TileArt";

/**
 * The Instagram mark, in two layers — the same arrangement as the hero.
 *
 * The drawn tile renders first and stays as the fallback. The 3D version
 * mounts over it and the flat one steps aside only once a frame has actually
 * drawn, so a missing or blocked WebGL context leaves the drawn tile in place
 * rather than a hole.
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
  const [ready, setReady] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  // The drawn tile ships hidden, so a snapshot of it never flashes before the
  // canvas arrives. It is revealed only if the scene fails to turn up — and
  // the countdown runs only while the page is visible, because a backgrounded
  // tab draws no frames and would otherwise be judged a failure.
  useEffect(() => {
    if (ready) return;
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
  }, [ready]);

  return (
    <span
      className="ig-tile"
      data-scene={ready ? "ready" : gaveUp ? "fallback" : "waiting"}
      aria-hidden="true"
    >
      <TileFaceArt />
      <MarkGlyph />
      <span className="ig-tile-scene">
        <Scene active={active} pointer={pointer} onReady={onReady} />
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
