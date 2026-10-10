import { useEffect, useState } from "react";

/**
 * Runs `load` now and every `ms`, aborting the previous run first. `load`
 * must ignore results once its signal is aborted. Skips runs while the tab is
 * hidden and runs again as soon as it is shown. Returns a retry function.
 */
export function usePoll(
  load: (signal: AbortSignal) => Promise<void>,
  ms: number,
  deps: unknown[],
) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let controller = new AbortController();
    const run = () => {
      if (document.hidden) return;
      controller.abort();
      controller = new AbortController();
      void load(controller.signal);
    };
    run();
    const timer = setInterval(run, ms);
    const shown = () => !document.hidden && run();
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
