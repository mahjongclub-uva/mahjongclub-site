"use client";

import { useState } from "react";
import { INSTAGRAM } from "@/lib/site";
import InstagramTile from "@/components/InstagramTile";

/**
 * Instagram is where meeting times and changes actually get posted, so this is
 * the most useful thing on the homepage after the calendar.
 *
 * Hover and focus are tracked here rather than inside the canvas, because the
 * whole card is the link — so the tile responds when you focus it with a
 * keyboard too, not only when a mouse happens to be over the canvas.
 *
 * Renders as plain text with no link until INSTAGRAM is set in site.ts — a
 * dead link is worse than a sentence.
 */
export default function FollowUs() {
  const [active, setActive] = useState(false);

  if (!INSTAGRAM) {
    return (
      <p className="quiet">
        Meeting times and updates go up on Instagram. The account handle is
        being set up.
      </p>
    );
  }

  return (
    <a
      className="ig"
      href={`https://instagram.com/${INSTAGRAM}`}
      rel="me noopener noreferrer"
      target="_blank"
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <InstagramTile active={active} />

      <span className="ig-body">
        <span className="ig-handle">@{INSTAGRAM}</span>
        <span className="ig-sub">
          Meeting times, table photos and last-minute changes
        </span>
      </span>
    </a>
  );
}
