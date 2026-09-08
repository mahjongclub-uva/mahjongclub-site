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
  const [gaveUp, setGaveUp] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);

  // The flat tiles ship hidden, so nothing has to be gated on hydration. But
  // they must not stay hidden forever: if the scene has not drawn a frame in
  // a few seconds — slow connection, blocked WebGL, a chunk that never
  // arrives — reveal them so the name resolves anyway.
  useEffect(() => {
    if (sceneReady) return;

    // Only count down while the page is actually being looked at. A
    // backgrounded tab does not draw frames or run timers on schedule, so a
    // plain timeout would decide the scene had failed when it simply has not
    // been given a chance yet — and the flat tiles would appear, then swap
    // out the moment you switched to the tab.
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
  }, [sceneReady]);

  return (
    <div
      className="hero-stage"
      data-scene={sceneReady ? "ready" : gaveUp ? "fallback" : "waiting"}
    >
      <Wordmark />
      <div className="hero-scene" aria-hidden="true">
        <TileScene onReady={onReady} />
      </div>
    </div>
  );
}
