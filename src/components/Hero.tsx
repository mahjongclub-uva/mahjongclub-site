"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
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
  const [hydrated, setHydrated] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);

  // Once this runs, JavaScript is available and the 3D scene is on its way,
  // so the flat tiles wait face-down rather than playing their own reveal.
  // Otherwise the header resolves twice: once in CSS, then again in canvas.
  useEffect(() => setHydrated(true), []);

  // ...but they must not wait forever. If the scene has not drawn a frame in
  // a few seconds — slow connection, blocked WebGL, a chunk that never
  // arrives — the flat tiles play their reveal and the name resolves anyway.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (sceneReady) return;
    const timer = setTimeout(() => setGaveUp(true), 3500);
    return () => clearTimeout(timer);
  }, [sceneReady]);

  return (
    <div
      className="hero-stage"
      data-scene={sceneReady ? "ready" : gaveUp ? "fallback" : "waiting"}
      data-js={hydrated ? "on" : undefined}
    >
      <Wordmark />
      <div className="hero-scene" aria-hidden="true">
        <TileScene onReady={onReady} />
      </div>
    </div>
  );
}
