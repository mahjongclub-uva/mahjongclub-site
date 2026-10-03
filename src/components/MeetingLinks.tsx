"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RETURN_STORAGE,
  getMeeting,
  isMeetingPage,
  type Meeting,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { formatDate } from "@/lib/format";
import type { Meeting as ScheduledMeeting } from "@/lib/schema";
import { usePoll } from "@/lib/usePoll";
import styles from "./MeetingLinks.module.css";

// Matches the backend's default check-in and score margins. Outside these
// windows the banner never contacts the meeting service.
function nearMeeting(schedule: ScheduledMeeting[], now: number) {
  return schedule.some(
    (m) =>
      now >= Date.parse(m.start) - 30 * 60000 &&
      now < Date.parse(m.end ?? m.start) + 60 * 60000,
  );
}

export default function MeetingLinks({
  schedule,
}: {
  schedule: ScheduledMeeting[];
}) {
  const pathname = usePathname();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [target, setTarget] = useState("/checkin/");
  usePoll(
    async (signal) => {
      try {
        const saved = sessionStorage.getItem(RETURN_STORAGE);
        setTarget(saved && isMeetingPage(saved) ? saved : "/checkin/");
      } catch {
        /* Public meeting state is still available without storage. */
      }
      if (!nearMeeting(schedule, Date.now())) return setMeeting(null);
      const next = await getMeeting(MEETING_SERVICE_URL, signal).catch(
        () => null,
      );
      if (!signal.aborted) setMeeting(next);
    },
    60000,
    [pathname, schedule],
  );
  if (!meeting?.open || !meeting.date) return null;
  const href =
    !meeting.checkinsOpen && target === "/checkin/" ? "/score/" : target;
  return (
    <Link href={href} className={styles.dock}>
      <span className={styles.dot} aria-hidden="true" />
      <span>
        <strong>
          {meeting.checkinsOpen
            ? "We’re playing right now!"
            : "Scores are still open"}
        </strong>
        <small>
          <time dateTime={meeting.date}>{formatDate(meeting.date)}</time> -
          Meeting
        </small>
      </span>
      <b>
        {target !== "/checkin/"
          ? "Back to meeting →"
          : meeting.checkinsOpen
            ? "Check in →"
            : "Record a table →"}
      </b>
    </Link>
  );
}
