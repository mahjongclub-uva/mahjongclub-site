"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconArrowRight } from "@tabler/icons-react";
import {
  getMeeting,
  inMeeting,
  latestMeeting,
  liveShortcut,
  type Meeting,
} from "@/lib/meeting";
import { LOGO, MEETING_SERVICE_URL, PARTNERS } from "@/lib/site";
import { formatMeetingTime } from "@/lib/format";
import { nunito } from "@/lib/fonts";
import type { Meeting as ScheduledMeeting } from "@/lib/schema";
import { usePoll } from "@/lib/usePoll";
import { collabOn, halloweenWeek, type Collab } from "@/lib/season";
import PlayerTile, { PumpkinFilled } from "./PlayerTile";
import styles from "./MeetingLinks.module.css";

/**
 * Tonight's meeting and where this phone should go. Asks every two minutes,
 * and only during the meeting's scheduled window. A failed request keeps the
 * last answer, so a busy night's timeout doesn't take the way in away.
 */
function useLiveMeeting(schedule: ScheduledMeeting[]) {
  const [meeting, setMeeting] = useState<Meeting | null>(latestMeeting);
  const [unreachable, setUnreachable] = useState(false);
  const [now, setNow] = useState(0);
  const [tonight, setTonight] = useState<ScheduledMeeting>();
  usePoll(
    async (signal) => {
      const time = Date.now();
      const scheduled = schedule.find((m) => inMeeting(m, time));
      setNow(time);
      setTonight(scheduled);
      if (!scheduled) return setMeeting(null);
      const next = await getMeeting(MEETING_SERVICE_URL, signal).catch(
        () => null,
      );
      if (signal.aborted) return;
      setUnreachable(!next);
      if (next) setMeeting(next);
    },
    120000,
    [schedule],
  );
  if (!tonight) return null;
  const shortcut = liveShortcut(schedule, now, meeting, unreachable);
  if (!shortcut) return null;
  // A collab night by the meeting's own date, so it matches every phone.
  return { ...shortcut, tonight, collab: collabOn(tonight.start.slice(0, 10)) };
}

// In Halloween week the pulsing dot becomes a jack-o'-lantern that flickers.
function Live() {
  const spooky = halloweenWeek(new Date());
  return (
    <span
      className={styles.live}
      data-season={spooky ? "halloween" : undefined}
    >
      {spooky && (
        <span className={styles.jack} aria-hidden="true">
          <PumpkinFilled />
        </span>
      )}
      Live
    </span>
  );
}

/** "MJC × name", with the partner's full name for a screen reader. */
function NightName({ collab }: { collab: Collab }) {
  const { name, fullName } = PARTNERS[collab];
  return (
    <>
      <span aria-hidden="true">MJC × {name}</span>
      <span className="sr-only">with the {fullName}</span>
    </>
  );
}

/** Floats at the bottom of every public page but home during the meeting. */
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
      <span className={styles.label}>
        <span>
          <span className="sr-only">Meeting on now: </span>
          {live.label}
        </span>
        {live.collab && (
          <small>
            <NightName collab={live.collab} />
          </small>
        )}
      </span>
      <IconArrowRight size={18} stroke={2.5} aria-hidden="true" />
    </Link>
  );
}

const ACTIONS: Record<string, string> = {
  "Check in": "Check in",
  "Find a table": "Find a table",
};

/** The hero's buttons, swapped for the meeting during the meeting. */
export function HomeMeeting({
  schedule,
  children,
}: {
  schedule: ScheduledMeeting[];
  children: ReactNode;
}) {
  const live = useLiveMeeting(schedule);
  if (!live) return children;
  const { tonight, collab } = live;
  return (
    <section
      className={`${styles.card} ${nunito.variable}`}
      aria-labelledby="meeting-now"
      data-collab={collab}
    >
      {collab ? (
        <>
          <Image
            className={styles.cardEmblem}
            src={PARTNERS[collab].emblem}
            alt=""
            width={150}
            height={150}
          />
          <div className={styles.night}>
            <span className={styles.lockup}>
              {LOGO && <Image src={LOGO} alt="" width={40} height={40} />}
              <Image
                src={PARTNERS[collab].logo}
                alt=""
                width={40}
                height={40}
              />
              <b>
                <NightName collab={collab} />
              </b>
            </span>
            <Live />
          </div>
        </>
      ) : (
        <Live />
      )}
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
            {[
              tonight.room,
              tonight.location,
              formatMeetingTime(tonight.start, tonight.end),
            ]
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
