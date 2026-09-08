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
 * Google Calendar embed id — usually an address like
 * "abc123@group.calendar.google.com". Find it in Calendar under
 * Settings → your calendar → Integrate calendar.
 *
 * The calendar must be public for the embed to load for visitors.
 *
 * Leave null and the page shows a quiet placeholder instead of a broken frame.
 */
export const CALENDAR_ID: string | null = null;

/** Handle only, no @ and no URL. Leave null to hide the link entirely. */
export const INSTAGRAM: string | null = "mahjongclub_uva";

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
