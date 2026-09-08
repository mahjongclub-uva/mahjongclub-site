import { INSTAGRAM } from "@/lib/site";
import { TileFaceArt } from "@/components/TileArt";

/**
 * Instagram is where meeting times and changes actually get posted, so this is
 * the most useful thing on the homepage after the calendar.
 *
 * The mark sits on a tile, in the same vermilion the wordmark letters use, so
 * it reads as part of the set rather than as a pasted-in brand asset. On hover
 * or keyboard focus the tile tilts toward you and lifts, the way you would
 * pick one up off the table to look at it.
 *
 * Renders as plain text with no link until INSTAGRAM is set in site.ts — a
 * dead link is worse than a sentence.
 */
export default function FollowUs() {
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
    >
      <span className="ig-tile" aria-hidden="true">
        {/* Same four walls as the wordmark tiles, so this reads as one of the
            set rather than a flat card wearing the same colours. */}
        <span className="tile-side tile-side-l" />
        <span className="tile-side tile-side-r" />
        <span className="tile-side tile-side-t" />
        <span className="tile-side tile-side-b" />
        <span className="ig-tile-face">
          <TileFaceArt />
          <InstagramMark />
        </span>
      </span>

      <span className="ig-body">
        <span className="ig-handle">@{INSTAGRAM}</span>
        <span className="ig-sub">
          Meeting times, table photos and last-minute changes
        </span>
      </span>
    </a>
  );
}

/** Inline, so the page makes no third-party request for it. */
function InstagramMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
