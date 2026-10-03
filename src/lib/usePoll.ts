import { useEffect, useState } from "react";

/**
 * Runs `load` now and every `ms`, aborting the previous run first. `load`
 * must ignore results once its signal is aborted. Returns a retry function.
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
      controller.abort();
      controller = new AbortController();
      void load(controller.signal);
    };
    run();
    const timer = setInterval(run, ms);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass what `load` reads.
  }, [...deps, ms, revision]);
  return () => setRevision((n) => n + 1);
}
