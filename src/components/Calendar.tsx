import { CALENDAR_ID } from "@/lib/site";
import Link from "next/link";

/**
 * Club calendar, embedded from Google Calendar. Set CALENDAR_ID in
 * src/lib/site.ts; null renders a placeholder instead of an empty/broken
 * frame. Before switching on: the calendar must be public, and an event's
 * Location becomes public too, keep it to a building, not a room+time a
 * stranger could wait outside.
 */
export default function Calendar() {
  if (!CALENDAR_ID) {
    return (
      <div className="calendar-placeholder">
        <p className="calendar-label">Next session</p>
        <p className="calendar-message">
          Meeting times are shared through Instagram and GroupMe while the
          calendar is being set up.
        </p>
        <Link className="action-link" href="/about/#connect">
          Find the group
        </Link>
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
