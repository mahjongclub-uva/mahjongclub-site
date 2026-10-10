"use client";

import { useState, type ReactNode } from "react";
import "@/app/(meeting)/meeting.css";
import { LiveTable } from "@/components/LiveStandings";
import { nearMeeting } from "@/components/MeetingLinks";
import { getMeeting, type Meeting } from "@/lib/meeting";
import type { Meeting as ScheduledMeeting, Semester } from "@/lib/schema";
import { MEETING_REHEARSAL, MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";

/**
 * The official standings, plus a provisional "Tonight" tab while a meeting of
 * this season is open. Outside meetings it renders the official standings only.
 */
export default function LeaderboardLive({
  semester,
  schedule,
  children,
}: {
  semester: Semester;
  schedule: ScheduledMeeting[];
  children: ReactNode;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [view, setView] = useState<"live" | "official">("live");
  usePoll(
    async (signal) => {
      // Like the site's meeting banner, only ask the meeting service near a
      // scheduled meeting, so most visits never contact it.
      if (!nearMeeting(schedule, Date.now())) return setMeeting(null);
      try {
        const next = await getMeeting(MEETING_SERVICE_URL, signal);
        if (!signal.aborted) setMeeting(next);
      } catch {
        // The official standings need no meeting; stay quiet if it can't be reached.
      }
    },
    60000,
    [schedule],
  );
  const live =
    !MEETING_REHEARSAL &&
    meeting?.open &&
    meeting.semester === semester.id &&
    semester.scoring_rule === "season-net";
  if (!live) return children;
  return (
    <>
      <div className="leaderboard-view" role="group" aria-label="Standings">
        <button
          type="button"
          aria-pressed={view === "live"}
          onClick={() => setView("live")}
        >
          <span className="meeting-live-dot" aria-hidden="true" />
          Tonight · live
        </button>
        <button
          type="button"
          aria-pressed={view === "official"}
          onClick={() => setView("official")}
        >
          Official
        </button>
      </div>
      {view === "live" ? (
        <div className="meeting-page leaderboard-live">
          <LiveTable
            key={meeting.meetingId}
            meeting={meeting}
            semester={semester}
            embedded
          />
        </div>
      ) : (
        children
      )}
    </>
  );
}
