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

export const TAGLINE = "Anyone is welcome to play. Come learn with us.";

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
export const CALENDAR_ID: string | null = "c2b93807305215ee07bdbd6d1c045e8f58588b299afa24dd14fa981830eb3c2a@group.calendar.google.com";

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
export const GROUPME_URL: string | null = "https://groupme.com/join_group/103973752/UZkrxfg4";

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
};

export const PHOTOS: Photo[] = [];
