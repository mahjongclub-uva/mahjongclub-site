"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import WebGLBoundary from "./WebGLBoundary";
import Wordmark from "@/components/Wordmark";
import { useReducedMotion } from "@/lib/useReducedMotion";

const TileScene = dynamic(() => import("@/components/TileScene"), {
  ssr: false,
});
// Only a hero on the page that was loaded counts from page load; reaching
// the homepage by an in-site link counts from that click.
let loadedWithPage = true;

/** Flat artwork is a failure fallback, never an extra frame in the 3D entrance. */
export default function Hero() {
  const reduceMotion = useReducedMotion();
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);
  const arrived = useRef<number | null>(null);
  useEffect(() => {
    if (arrived.current === null) {
      const loaded = performance.getEntriesByType("navigation")[0]?.name;
      const isLoadedPage =
        loadedWithPage &&
        loaded !== undefined &&
        new URL(loaded).pathname === location.pathname;
      arrived.current = isLoadedPage ? 0 : performance.now();
      loadedWithPage = false;
    }
    if (sceneReady || reduceMotion || failed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 6s from when the visitor arrived, not from when this script started, so
    // a slow phone's blank wait is capped. A tab that was hidden gets a fresh
    // 6s once shown, since it drew nothing while hidden.
    // shortcut: a tab hidden only before this script ran still counts from
    // arrival; track visibility from page load if that turns out to matter.
    let wasHidden = false;
    const watch = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        const left = wasHidden
          ? 6000
          : 6000 - (performance.now() - arrived.current!);
        timer = setTimeout(() => setFailed(true), Math.max(0, left));
      } else {
        wasHidden = true;
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
