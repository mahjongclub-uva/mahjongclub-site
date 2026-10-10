"use client";

import { useState } from "react";
import Link from "next/link";
import MeetingAccess from "@/components/MeetingAccess";
import ContinueAs from "@/components/ContinueAs";
import {
  MEETING_PATHS,
  playerConfirmed,
  rememberPlayer,
  savedPlayer,
  type Meeting,
} from "@/lib/meeting";

/** Tonight at a glance: who this phone is, and the one next thing to do. */
function Hub({ meeting }: { meeting: Meeting }) {
  const [player, setPlayer] = useState(() => savedPlayer(meeting));
  const [confirmed, setConfirmed] = useState(() => playerConfirmed());
  if (player && !confirmed)
    return (
      <ContinueAs
        player={player}
        yes={() => {
          rememberPlayer(meeting, player);
          setConfirmed(true);
        }}
        no={() => {
          rememberPlayer(meeting, null);
          setPlayer(null);
        }}
      />
    );
  const seatedAt = meeting.rooms?.find((room) =>
    room.seats.some((seat) => seat.id === player?.id),
  )?.table;
  const next = !player
    ? meeting.checkinsOpen
      ? { href: MEETING_PATHS.checkin, label: "Check in" }
      : { href: MEETING_PATHS.standings, label: "See tonight’s standings" }
    : seatedAt
      ? {
          href: MEETING_PATHS.table(seatedAt),
          label: `Return to Table ${seatedAt}`,
        }
      : meeting.rooms
        ? { href: MEETING_PATHS.tables, label: "Find a table" }
        : { href: MEETING_PATHS.score, label: "Record a table" };
  return (
    <div className="meeting-form">
      <h1>
        {player ? `Hi, ${player.display.split(" ")[0]}.` : "Tonight’s meeting."}
      </h1>
      <p className="meeting-intro">
        {!player
          ? meeting.checkinsOpen
            ? "Check in with your computing ID, sit at a table of four, and record each game as you play."
            : "Check-in has closed. Players already here can keep recording games."
          : seatedAt
            ? `You’re seated at Table ${seatedAt}.`
            : "You’re checked in. Pick a table when you’re ready."}
      </p>
      <Link className="meeting-primary" href={next.href}>
        {next.label}
      </Link>
    </div>
  );
}

export default function MeetingHub() {
  return (
    <MeetingAccess>
      {(meeting) => <Hub key={meeting.meetingId} meeting={meeting} />}
    </MeetingAccess>
  );
}
