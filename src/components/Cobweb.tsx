"use client";

import { useState } from "react";
import { IconSpiderFilled } from "@tabler/icons-react";
import { halloweenWeek } from "@/lib/season";

/** Halloween week only: a web in the corner of "You're in", and a spider on
 * a thread that runs back up when it is tapped, then creeps down again. */
export default function Cobweb() {
  const [scared, setScared] = useState(false);
  if (!halloweenWeek(new Date())) return null;
  const scare = () => {
    if (scared) return;
    setScared(true);
    setTimeout(() => setScared(false), 2400);
  };
  return (
    <span className="cobweb">
      <svg
        className="cobweb-web"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <path d="M64 0L0 64M32 0L24 64M64 32L0 40M64 0L0 20M64 0L44 64" />
        <path d="M50 0Q52 8 64 14M36 0Q40 18 64 28M20 0Q26 30 64 44M4 0Q12 44 64 60" />
      </svg>
      <button
        type="button"
        className="cobweb-spider"
        data-scared={scared || undefined}
        aria-label="Scare the spider"
        onClick={scare}
      >
        <IconSpiderFilled aria-hidden="true" />
      </button>
    </span>
  );
}
