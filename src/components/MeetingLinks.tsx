"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconArrowRight } from "@tabler/icons-react";
import {
  getMeeting,
  meetingShortcut,
  playerConfirmed,
  savedPlayer,
  type Meeting,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { formatMeetingTime } from "@/lib/format";
import { nunito } from "@/lib/fonts";
import type { Meeting as ScheduledMeeting } from "@/lib/schema";
import { usePoll } from "@/lib/usePoll";
import PlayerTile from "./PlayerTile";
import styles from "./MeetingLinks.module.css";

// Matches the backend's default check-in and score margins. Outside these
// windows the site never contacts the meeting service.
export function nearMeeting(schedule: ScheduledMeeting[], now: number) {
  return schedule.some(
    (m) =>
      now >= Date.parse(m.start) - 30 * 60000 &&
      now < Date.parse(m.end ?? m.start) + 60 * 60000,
  );
}

/** Tonight's meeting while check-in is open, and where this phone should go. */
function useLiveMeeting(schedule: ScheduledMeeting[]) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tonight, setTonight] = useState<ScheduledMeeting>();
  usePoll(
    async (signal) => {
      const now = Date.now();
      setTonight(schedule.find((m) => nearMeeting([m], now)));
      if (!nearMeeting(schedule, now)) return setMeeting(null);
      const next = await getMeeting(MEETING_SERVICE_URL, signal).catch(
        () => null,
      );
      if (!signal.aborted) setMeeting(next);
    },
    60000,
    [schedule],
  );
  if (!meeting?.checkinsOpen) return null;
  return {
    ...meetingShortcut(
      meeting,
      playerConfirmed() ? savedPlayer(meeting) : null,
    ),
    tonight,
  };
}

function Live() {
  return <span className={styles.live}>Live</span>;
}

/** Floats at the bottom of every public page but home while check-in is open. */
export default function MeetingLinks({
  schedule,
}: {
  schedule: ScheduledMeeting[];
}) {
  // Home has its own card in the hero.
  if (usePathname() === "/") return null;
  return <MeetingPill schedule={schedule} />;
}

function MeetingPill({ schedule }: { schedule: ScheduledMeeting[] }) {
  const live = useLiveMeeting(schedule);
  if (!live) return null;
  return (
    <Link href={live.href} className={`${styles.pill} ${nunito.variable}`}>
      <Live />
      {live.player && <PlayerTile id={live.player.id} />}
      <span>
        <span className="sr-only">Meeting on now: </span>
        {live.label}
      </span>
      <IconArrowRight size={18} stroke={2.5} aria-hidden="true" />
    </Link>
  );
}

const ACTIONS: Record<string, string> = {
  "Check in": "Check in",
  Meeting: "Open the meeting",
  Tables: "Find a table",
};

/** The hero's buttons, swapped for the meeting while check-in is open. */
export function HomeMeeting({
  schedule,
  children,
}: {
  schedule: ScheduledMeeting[];
  children: ReactNode;
}) {
  const live = useLiveMeeting(schedule);
  if (!live) return children;
  const { tonight } = live;
  return (
    <section
      className={`${styles.card} ${nunito.variable}`}
      aria-labelledby="meeting-now"
    >
      <Live />
      <h2 id="meeting-now">We’re playing now</h2>
      {live.player ? (
        <p className={styles.you}>
          <PlayerTile id={live.player.id} />
          <span>
            Playing as <b>{live.player.display}</b>
          </span>
        </p>
      ) : (
        tonight && (
          <p className={styles.where}>
            {[tonight.location, formatMeetingTime(tonight.start, tonight.end)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )
      )}
      <Link href={live.href} className={styles.go}>
        {ACTIONS[live.label] ?? `Back to ${live.label}`}
        <IconArrowRight size={20} stroke={2.5} aria-hidden="true" />
      </Link>
    </section>
  );
}
