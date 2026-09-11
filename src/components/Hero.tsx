"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import WebGLBoundary from "./WebGLBoundary";
import Wordmark from "@/components/Wordmark";

const TileScene = dynamic(() => import("@/components/TileScene"), {
  ssr: false,
});
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Flat artwork is a failure fallback, never an extra frame in the 3D entrance. */
export default function Hero() {
  const reduceMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    () => null,
  );
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);
  useEffect(() => {
    if (sceneReady || reduceMotion || failed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        timer = setTimeout(() => setFailed(true), 4000);
      }
    };
    watch();
    document.addEventListener("visibilitychange", watch);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", watch);
    };
  }, [sceneReady, reduceMotion, failed]);
  const onError = useCallback(() => setFailed(true), []);
  return (
    <div
      className="hero-stage"
      data-scene={
        reduceMotion || failed ? "fallback" : sceneReady ? "ready" : "waiting"
      }
    >
      <Wordmark />
      <div className="hero-scene" aria-hidden="true">
        {reduceMotion === false && !failed && (
          <WebGLBoundary onError={onError}>
            <TileScene onReady={onReady} />
          </WebGLBoundary>
        )}
      </div>
    </div>
  );
}
