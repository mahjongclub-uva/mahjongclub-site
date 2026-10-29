import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/**
 * The visitor's reduced-motion setting, kept live. Null until hydration, so
 * callers can wait rather than guess before they know.
 */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  );
}
