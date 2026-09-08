import { INSTAGRAM } from "@/lib/site";

/**
 * Instagram is where meeting times and changes actually get posted, so this is
 * the most useful thing on the homepage after the calendar.
 *
 * Renders without a link until INSTAGRAM is set in src/lib/site.ts — a dead
 * link is worse than a plain sentence.
 */
export default function FollowUs() {
  return (
    <div className="follow">
      <p className="follow-line">
        Meeting times, table photos and last-minute changes all go up on
        Instagram. Follow along to keep up.
      </p>

      {INSTAGRAM ? (
        <a
          className="follow-link"
          href={`https://instagram.com/${INSTAGRAM}`}
          rel="me noopener noreferrer"
          target="_blank"
        >
          <InstagramMark />
          <span>@{INSTAGRAM}</span>
        </a>
      ) : (
        <p className="quiet">The account handle is being set up.</p>
      )}
    </div>
  );
}

function InstagramMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
