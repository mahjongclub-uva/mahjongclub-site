import { CALENDAR_ID } from "@/lib/site";

/**
 * The club calendar, embedded from Google Calendar.
 *
 * Set CALENDAR_ID in src/lib/site.ts and the frame appears. Leave it null and
 * this renders a quiet placeholder, which is the right default: an empty or
 * broken calendar frame looks worse than no calendar, and a stale one is
 * worse than both.
 *
 * Two things to know before switching it on:
 *
 *   - The calendar has to be public, or visitors see a permission error.
 *   - Whatever is in an event's Location field becomes public. Keep it to a
 *     building, not a room and a time a stranger could wait outside.
 */
export default function Calendar() {
  if (!CALENDAR_ID) {
    return (
      <div className="calendar-placeholder">
        <p>Meeting times are posted on Instagram while the calendar is set up.</p>
      </div>
    );
  }

  const src = new URL("https://calendar.google.com/calendar/embed");
  src.searchParams.set("src", CALENDAR_ID);
  src.searchParams.set("mode", "AGENDA");
  src.searchParams.set("showTitle", "0");
  src.searchParams.set("showPrint", "0");
  src.searchParams.set("showTabs", "0");
  src.searchParams.set("showCalendars", "0");
  src.searchParams.set("showTz", "0");
  src.searchParams.set("ctz", "America/New_York");

  return (
    <div className="calendar-frame">
      <iframe
        src={src.toString()}
        title="Mahjong Club calendar"
        loading="lazy"
        // The frame reserves its height in CSS, so the page never reflows
        // when the calendar finishes loading.
        style={{ border: 0 }}
      />
    </div>
  );
}
