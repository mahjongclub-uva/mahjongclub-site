import { useEffect, useState } from "react";

/**
 * Runs `load` now and every `ms`. A timer tick is skipped while the previous
 * run is still in flight, so a slow reply always lands; showing the tab or
 * calling the returned retry function aborts it and starts again. `load` must
 * ignore results once its signal is aborted. Always loads once; repeat runs
 * skip while the tab is hidden and resume as soon as it is shown.
 */
export function usePoll(
  load: (signal: AbortSignal) => Promise<void>,
  ms: number,
  deps: unknown[],
) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let controller = new AbortController();
    let running: AbortController | null = null;
    const run = (restart: boolean) => {
      if (!restart && (document.hidden || running)) return;
      controller.abort();
      const current = (controller = new AbortController());
      running = current;
      void load(current.signal).finally(() => {
        // Only this run's own completion clears the flag.
        if (running === current) running = null;
      });
    };
    run(true);
    const timer = setInterval(() => run(false), ms);
    const shown = () => !document.hidden && run(true);
    document.addEventListener("visibilitychange", shown);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", shown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass what `load` reads.
  }, [...deps, ms, revision]);
  return () => setRevision((n) => n + 1);
}
