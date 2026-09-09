import { getNextMeeting } from "@/lib/data";
import { formatMeetingDay, formatMeetingTime } from "@/lib/format";

/**
 * One line naming the next meeting, above the calendar.
 *
 * The embedded calendar below is authoritative and always current, but it is
 * an iframe: it loads late, it is a scrollable widget rather than a sentence,
 * and on a phone it asks for more attention than the question deserves. Most
 * visitors want one fact, so this states it in words.
 *
 * The text is baked in at build time from data/meetings.json, which a weekly
 * Action refreshes. That means it can be up to a week behind — a meeting
 * cancelled on Thursday will still be named here. Nothing on this line implies
 * otherwise, and the live calendar sits directly underneath it.
 *
 * Renders nothing at all when there is no meeting to name, which is the honest
 * state between semesters.
 */
export default function NextMeeting() {
  const meeting = getNextMeeting();
  if (!meeting) return null;

  return (
    <p className="next-meeting">
      <span className="next-meeting-label">Next meeting:</span>
      <time dateTime={meeting.start}>
        {formatMeetingDay(meeting.start)}
        <span className="next-meeting-time">
          {formatMeetingTime(meeting.start, meeting.end)}
        </span>
      </time>
      {meeting.location && (
        <span className="next-meeting-where">at {meeting.location}</span>
      )}
    </p>
  );
}
