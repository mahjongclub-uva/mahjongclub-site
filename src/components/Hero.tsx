"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Wordmark from "@/components/Wordmark";

/**
 * The header, in two layers.
 *
 * The CSS wordmark keeps the club's name in the DOM for screen readers, but
 * stays visually hidden while the 3D scene loads. It is shown only for reduced
 * motion, disabled JavaScript, or a scene that fails to become ready.
 *
 * Never make the 3D layer the only copy of the name.
 */
const TileScene = dynamic(() => import("@/components/TileScene"), {
  ssr: false,
  loading: () => null,
});

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Hero() {
  // Unknown during server rendering: do not paint a fallback before learning
  // the visitor's actual motion preference during hydration.
  const reduceMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => null);
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
      data-scene={reduceMotion ? "fallback" : sceneReady ? "ready" : gaveUp ? "fallback" : "waiting"}
    >
      <Wordmark />
      <div className="hero-scene" aria-hidden="true">
        {reduceMotion === false && <TileScene onReady={onReady} />}
      </div>
    </div>
  );
}
