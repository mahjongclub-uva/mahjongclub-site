"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import Wordmark from "@/components/Wordmark";

/**
 * The header, in two layers.
 *
 * The CSS wordmark renders first and always. It holds the <h1> with the club's
 * name as real text, so the name is present before any JavaScript runs and
 * stays present for screen readers afterwards.
 *
 * The 3D scene loads after and mounts on top. When it is ready the CSS tiles
 * fade out — the heading element stays in the DOM, it simply stops being the
 * thing you look at. If WebGL is missing, blocked, or the chunk fails, none of
 * that happens and you keep the CSS version.
 *
 * Never make the 3D layer the only copy of the name.
 */
const TileScene = dynamic(() => import("@/components/TileScene"), {
  ssr: false,
  loading: () => null,
});

export default function Hero() {
  const [sceneReady, setSceneReady] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);

  return (
    <div className="hero-stage" data-scene={sceneReady ? "ready" : "waiting"}>
      <Wordmark />
      <div className="hero-scene" aria-hidden="true">
        <TileScene onReady={onReady} />
      </div>
    </div>
  );
}
