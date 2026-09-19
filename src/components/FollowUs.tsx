"use client";

import { useRef, useState } from "react";
import { INSTAGRAM } from "@/lib/site";
import InstagramTile from "@/components/InstagramTile";

/**
 * Instagram is where meeting changes actually get posted, so this is the
 * most useful thing on the homepage after the calendar.
 *
 * Pointer position is tracked on the link, not the canvas (the canvas
 * ignores pointer events so the whole card is one clickable surface), and
 * written into a ref rather than state since a pointer moves far more often
 * than the screen repaints. Renders as plain text with no link until
 * INSTAGRAM is set in site.ts, a dead link is worse than a sentence.
 */
export default function FollowUs() {
  const [active, setActive] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });

  if (!INSTAGRAM) {
    return (
      <p className="quiet">
        Meeting times and updates go up on Instagram. The account handle is
        being set up.
      </p>
    );
  }

  const track = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    // -1 to 1 across the card, so the tile leans toward wherever you are.
    pointer.current = {
      x: ((event.clientX - box.left) / box.width - 0.5) * 2,
      y: ((event.clientY - box.top) / box.height - 0.5) * 2,
    };
  };

  const rest = () => {
    setActive(false);
    pointer.current = { x: 0, y: 0 };
  };

  return (
    <a
      className="ig"
      href={`https://instagram.com/${INSTAGRAM}`}
      rel="me noopener noreferrer"
      target="_blank"
      onPointerEnter={() => setActive(true)}
      onPointerMove={track}
      onPointerLeave={rest}
      onFocus={() => setActive(true)}
      onBlur={rest}
    >
      <InstagramTile active={active} pointer={pointer} />

      <span className="ig-body">
        <span className="ig-handle">@{INSTAGRAM}</span>
        <span className="ig-sub">Photos and meeting updates on Instagram.</span>
      </span>
    </a>
  );
}
