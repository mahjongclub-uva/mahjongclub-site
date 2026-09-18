import { getNextMeeting } from "@/lib/data";
import { formatMeetingDay, formatMeetingTime } from "@/lib/format";

/**
 * One line naming the next meeting, above the calendar (an iframe: loads
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

  return (
    <div className="next-meeting">
      <p className="next-meeting-label">Next meeting</p>

      {/* Day is the headline; time and room are the details once you've
          decided to come ("where" is what the calendar frame answers worst). */}
      <p className="next-meeting-when">
        <time dateTime={meeting.start}>{formatMeetingDay(meeting.start)}</time>
      </p>

      <p className="next-meeting-detail">
        <span className="next-meeting-time">
          {formatMeetingTime(meeting.start, meeting.end)}
        </span>
        {meeting.location && (
          <span className="next-meeting-where">{meeting.location}</span>
        )}
      </p>
    </div>
  );
}
