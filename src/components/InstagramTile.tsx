"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
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

export default function InstagramTile({ active = false }: { active?: boolean }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <span
      className="ig-tile"
      data-scene={ready ? "ready" : "waiting"}
      aria-hidden="true"
    >
      <TileFaceArt />
      <MarkGlyph />
      <span className="ig-tile-scene">
        <Scene active={active} onReady={onReady} />
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
