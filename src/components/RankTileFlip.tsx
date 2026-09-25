"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/** Turning one tile over turns the last one back, so only one row is lit. */
const FLIP_EVENT = "rank-tile-flip";

export default function RankTileFlip({
  rank,
  children,
}: {
  rank: number;
  children: ReactNode;
}) {
  const id = useId();
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const turnBack = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setFlipped(false);
    };
    window.addEventListener(FLIP_EVENT, turnBack);
    return () => window.removeEventListener(FLIP_EVENT, turnBack);
  }, [id]);

  return (
    <button
      type="button"
      className="rank-toggle"
      aria-label={`Show number for rank ${rank}`}
      aria-pressed={flipped}
      onClick={() => {
        if (!flipped) {
          window.dispatchEvent(new CustomEvent(FLIP_EVENT, { detail: id }));
        }
        setFlipped(!flipped);
      }}
    >
      <span className="rank-flip">{children}</span>
    </button>
  );
}
