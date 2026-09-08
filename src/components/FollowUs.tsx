import { INSTAGRAM } from "@/lib/site";
import InstagramTile from "@/components/InstagramTile";

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
      <InstagramTile />

      <span className="ig-body">
        <span className="ig-handle">@{INSTAGRAM}</span>
        <span className="ig-sub">
          Meeting times, table photos and last-minute changes
        </span>
      </span>
    </a>
  );
}

