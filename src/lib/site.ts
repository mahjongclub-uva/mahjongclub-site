import siteContent from "../../data/site.json";

/** Everything about the club that isn't scores, in one file so it's not scattered across components. */

/** Tiled in the header. Seven letters; changing this changes the geometry. */
export const WORDMARK = "MAHJONG";

/** Sits under the tiles. The @ is how CIOs are named around Grounds. */
export const CLUB_NAME = "Club @ UVA";

/** Read by screen readers in place of the seven separate tiles. */
export const FULL_NAME = "Mahjong Club @ UVA";

export const TAGLINE = siteContent.tagline;

/**
 * Google Calendar embed id, e.g. "abc123@group.calendar.google.com". Find it
 * under Settings → your calendar → Integrate calendar → "Calendar ID" (the
 * id, not the iCal/embed URLs on that same screen). Calendar must be public
 * for the embed to load. Leave null for a placeholder instead of a broken frame.
 */
export const CALENDAR_ID: string | null =
  "c2b93807305215ee07bdbd6d1c045e8f58588b299afa24dd14fa981830eb3c2a@group.calendar.google.com";

/** Logo, shown circular above the wordmark. Put the file in public/ and set
 * the path, e.g. "/logo.png"; a centered square image works best. Leave null
 * for an empty circle placeholder. */
export const LOGO: string | null = "/logo.webp";

/** Handle only, no @ and no URL. Leave null to hide the link entirely. */
export const INSTAGRAM: string | null = siteContent.instagram || null;

/** GroupMe invite URL. Keep null until there's a current link, otherwise the Contact page sends people to an expired or guessed group. */
export const GROUPME_URL: string | null = siteContent.groupme_url || null;

/**
 * Homepage photos. Put files in public/photos/, list them here with alt text
 * and intrinsic width/height (avoids layout reflow on load).
 *
 * Before adding anyone's photo, follow the consent and preparation steps in
 * OFFICER_GUIDE.md so only approved, metadata-free images are published.
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
  },
];

/**
 * Officers, in About-page order. name: null renders as "To be announced" for
 * an unfilled role. This is the one place the site shows more than a first
 * name + last initial, so use whatever each officer is comfortable being
 * called publicly (a first name alone is fine), and never list someone who
 * hasn't agreed to it.
 */
export type Officer = {
  role: string;
  name: string | null;
};

export const OFFICERS: Officer[] = siteContent.officers;

/** Homepage editorial copy, separate from the visual components. */
export const HOME = {
  welcomeTitle: siteContent.home.welcome_title,
  welcome: siteContent.home.welcome,
  meetingPhotoPending: siteContent.home.meeting_photo_pending,
  photosPending: siteContent.home.photos_pending,
};

/** Public footer contact details. */
export const CONTACT_EMAIL = siteContent.contact_email;
export const LOCATION = siteContent.location;
export const LOCATION_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LOCATION)}`;
export const ABOUT = {
  intro: siteContent.about.intro,
  game: siteContent.about.game,
  variety: siteContent.about.variety,
  otherStyles: siteContent.about.other_styles,
  tablePhoto: siteContent.about.table_photo,
};
