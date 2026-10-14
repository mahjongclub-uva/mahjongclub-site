import { useEffect, useRef } from "react";

/**
 * Each answer swaps the game's buttons out from under a keyboard player.
 * When `step` changes and their focus went with the old button, hand it to
 * the game's first button, so Tab carries on from where they were.
 */
export default function useKeepFocus<T extends HTMLElement>(step: unknown) {
  const ref = useRef<T>(null);
  const typing = useRef(false);
  useEffect(() => {
    const game = ref.current;
    if (!game) return;
    const onKey = () => (typing.current = true);
    const onPointer = () => (typing.current = false);
    game.addEventListener("keydown", onKey, true);
    game.addEventListener("pointerdown", onPointer, true);
    return () => {
      game.removeEventListener("keydown", onKey, true);
      game.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  useEffect(() => {
    const game = ref.current;
    if (!game || !typing.current || game.contains(document.activeElement))
      return;
    game.querySelector<HTMLElement>("button:not([hidden])")?.focus();
  }, [step]);
  return ref;
}
