/**
 * Everything about the club that is not scores.
 *
 * One file, so updating the Instagram handle or swapping the calendar does not
 * mean hunting through components. If you are new here, this is the file you
 * are most likely looking for.
 */

/** Tiled in the header. Seven letters; changing this changes the geometry. */
export const WORDMARK = "MAHJONG";

/** Sits under the tiles. The @ is how CIOs are named around Grounds. */
export const CLUB_NAME = "Club @ UVA";

/** Read by screen readers in place of the seven separate tiles. */
export const FULL_NAME = "Mahjong Club @ UVA";

export const TAGLINE = "Your next good hand starts here. Everyone’s welcome.";

/**
 * Google Calendar embed id — an address like
 * "abc123@group.calendar.google.com". Find it in Calendar under
 * Settings → your calendar → Integrate calendar, listed as "Calendar ID".
 *
 * The id, not one of the URLs on that same screen. Pasting the iCal or
 * embed URL here produces a frame that loads and then says the calendar
 * cannot be found, which is easy to miss.
 *
 * The calendar must be public for the embed to load for visitors.
 *
 * Leave null and the page shows a quiet placeholder instead of a broken frame.
 */
export const CALENDAR_ID: string | null =
  "c2b93807305215ee07bdbd6d1c045e8f58588b299afa24dd14fa981830eb3c2a@group.calendar.google.com";

/**
 * Club logo, shown as a circle above the wordmark.
 *
 * Put the file in public/ and set the path, e.g. "/logo.png". It is displayed
 * inside a circular frame, so a square image with the mark centred works best.
 * Leave null and an empty circle holds the space.
 */
export const LOGO: string | null = "/logo.webp";

/** Handle only, no @ and no URL. Leave null to hide the link entirely. */
export const INSTAGRAM: string | null = "mahjongclub_uva";

/**
 * GroupMe invitation URL.
 *
 * Keep this null until there is a current invitation link. The Contact page
 * will explain that the link is coming instead of sending people to an
 * expired or guessed group.
 */
export const GROUPME_URL: string | null =
  "https://groupme.com/join_group/103973752/UZkrxfg4";

/**
 * Photographs for the homepage.
 *
 * Put files in public/photos/ and list them here. Every entry needs alt text,
 * and intrinsic width and height so the page never reflows as images load.
 *
 * Before adding anyone's photograph, read the privacy rules in CLAUDE.md: no
 * full legal names and no precise meeting location, in the alt text or
 * anywhere else. Strip EXIF first — phone photos carry GPS coordinates.
 */
export type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Optional short caption and CSS object-position for the editorial crop. */
  caption?: string;
  position?: string;
};

export const PHOTOS: Photo[] = [
  {
    src: "/photos/club-table.webp",
    alt: "Club members gathered around a table playing mahjong with blue-backed tiles.",
    width: 1800,
    height: 1201,
    caption: "A full table. A fresh hand. Your move.",
  },
];

/**
 * The club's officers, in the order they appear on the About page.
 *
 * A name of null renders as "To be announced", which is the right thing to
 * show for a role nobody has filled yet — and the reason this ships as a
 * placeholder rather than five invented names.
 *
 * Officers are the one place the site shows more than a first name and last
 * initial, because these are the people a visitor is meant to be able to ask
 * for. Use whatever each officer is comfortable being called publicly; a first
 * name alone is a perfectly good answer, and nobody should be listed here who
 * has not agreed to it.
 */
export type Officer = {
  role: string;
  name: string | null;
};

export const OFFICERS: Officer[] = [
  { role: "President", name: "Loy Luo" },
  { role: "Vice President", name: "Benjamin Liu" },
  { role: "Secretary", name: "Sean Pan" },
  { role: "Treasurer", name: "Kevin Jiang" },
  { role: "Publicity", name: "Brittney Men" },
];

/** Homepage editorial copy, separate from the visual components. */
export const HOME = {
  welcomeTitle: "A seat for everyone.",
  welcome:
    "No set? No experience? You’re in the right place. Bring a friend or come on your own. We’ll get you settled at a table and help you learn as you play.",
  welcomeNote:
    "A little strategy. A little luck. A good excuse to get together.",
  photosPending: "Club photos coming soon.",
  photoIntro: "The people, the hands, and the moments between games.",
};

/** Public footer contact details. */
export const CONTACT_EMAIL = "zrk2xw@virginia.edu";
export const LOCATION = "Charlottesville, VA";
export const LOCATION_URL =
  "https://www.google.com/maps/search/?api=1&query=Charlottesville%2C%20VA";
export const ABOUT = {
  intro:
    "A few good hands, a few new friends, and always room for another player.",
  game: "Fuzhounese (Fuzhou-style) mahjong is one of our main games: sixteen tiles in hand, four players around the table, and a gold wildcard to keep you guessing.",
  variety:
    "But we don’t stop there. Play a different style at home? Tell us about it. We’re happy to learn from each other, and we’ll agree on the rules before the tiles come out.",
  learn:
    "Never played? Pull up a chair. We’ll bring the sets and walk through a practice hand together. Questions are part of the game.",
};
