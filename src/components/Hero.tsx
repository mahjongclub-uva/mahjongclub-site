"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
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

/** The CSS name is visible immediately; 3D takes over only after drawing. */
export default function Hero() {
  const reduceMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    () => null,
  );
  const [sceneReady, setSceneReady] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);
  const onError = useCallback(() => setSceneReady(false), []);
  return (
    <div
      className="hero-stage"
      data-scene={reduceMotion ? "fallback" : sceneReady ? "ready" : "waiting"}
    >
      <Wordmark />
      <div className="hero-scene" aria-hidden="true">
        {reduceMotion === false && (
          <WebGLBoundary onError={onError}>
            <TileScene onReady={onReady} />
          </WebGLBoundary>
        )}
      </div>
    </div>
  );
}
