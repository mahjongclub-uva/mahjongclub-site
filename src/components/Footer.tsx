import { FULL_NAME, INSTAGRAM } from "@/lib/site";

/**
 * Appears on every page.
 *
 * Two things here are obligations rather than decoration:
 *
 *   1. The CIO disclaimer. Contracted Independent Organizations are not part
 *      of the University and are required to say so.
 *   2. The consent notice. Playing a scored game is what publishes a player's
 *      result, so the site has to say that plainly and say how to leave. It
 *      lives here rather than on the leaderboard so that page stays short,
 *      but it must appear somewhere a visitor can actually find.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-disclaimer">
          {FULL_NAME}. All rights reserved.
        </p>

        {INSTAGRAM && (
          <p className="footer-social">
            <a
              className="social-link"
              href={`https://instagram.com/${INSTAGRAM}`}
              rel="me noopener noreferrer"
              target="_blank"
            >
              <InstagramMark />
              <span>@{INSTAGRAM}</span>
            </a>
          </p>
        )}
      </div>
    </footer>
  );
}

/**
 * Inline rather than fetched, so the page makes no third-party request and
 * the mark inherits the surrounding text colour.
 */
function InstagramMark() {
  return (
    <svg
      width="18"
      height="18"
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
