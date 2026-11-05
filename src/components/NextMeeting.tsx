import { getNextMeeting } from "@/lib/data";
import { IconClock, IconMapPin } from "@tabler/icons-react";
import { CLUB_TZ, formatMeetingDay, formatMeetingTime } from "@/lib/format";

/**
 * A card naming the next meeting, beside the calendar (an iframe: loads
 * late, is a scrollable widget, and asks too much of a phone for what's
 * really a one-fact question).
 *
 * Baked in at build time from data/meetings.json, refreshed weekly, so it
 * can be up to a week stale (a Thursday cancellation still shows here; the
 * live calendar underneath is the source of truth). Renders nothing between
 * semesters, when there's no meeting to name.
 */
export default function NextMeeting() {
  const meeting = getNextMeeting();
  if (!meeting) return null;
  const part = (option: Intl.DateTimeFormatOptions) =>
    new Date(meeting.start).toLocaleDateString("en-GB", {
      ...option,
      timeZone: CLUB_TZ,
    });
  // A plain "Chem 206" stays a chip; a room or an address needs the fuller block.
  const hasDetail = meeting.room || meeting.address;
  // Google gives some places no street number, only the city.
  const street = meeting.address?.split(",")[0] ?? "";
  const mapLabel = /^\d/.test(street) ? street : "Open in Maps";

  return (
    <div className="next-meeting">
      {/* A tear-off calendar page; the heading beside it says the same. */}
      <span className="next-meeting-tile" aria-hidden="true">
        <small>{part({ month: "short" })}</small>
        <b>{part({ day: "numeric" })}</b>
        <span>{part({ weekday: "short" })}</span>
      </span>
      <div>
        <p className="next-meeting-label">Next meeting</p>
        <p className="next-meeting-when">
          <time dateTime={meeting.start}>
            {formatMeetingDay(meeting.start)}
          </time>
        </p>
        <p className="next-meeting-detail">
          <span>
            <IconClock size={16} aria-hidden="true" />
            {formatMeetingTime(meeting.start, meeting.end)}
          </span>
          {!hasDetail && meeting.location && (
            <span>
              <IconMapPin size={16} aria-hidden="true" />
              {meeting.location}
            </span>
          )}
        </p>
        {hasDetail && (
          <div className="next-meeting-where">
            <IconMapPin size={16} aria-hidden="true" />
            <div>
              {meeting.room && <b>{meeting.room}</b>}
              {meeting.location && <span>{meeting.location}</span>}
              {meeting.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [meeting.location, meeting.address].filter(Boolean).join(", "),
                  )}`}
                  aria-label={`${mapLabel}, open in Google Maps`}
                >
                  {mapLabel}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
