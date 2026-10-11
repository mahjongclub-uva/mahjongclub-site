"use client";

import { useEffect, useReducer, useState, type ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import Sheet from "@/components/Sheet";
import {
  getMeeting,
  playerConfirmed,
  PLAYER_EVENT,
  rememberPlayer,
  requestError,
  savedPlayer,
  type Meeting,
  type Player,
  MEETING_PATHS,
} from "@/lib/meeting";
import { LOGO, MEETING_SERVICE_URL } from "@/lib/site";
import Link from "next/link";
import Image from "next/image";
import { formatShortDate } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

/** Who this phone is playing as, and the two things that belong to them:
 * tonight's standings and switching player. */
function PlayerSheet({
  meeting,
  player,
  close,
}: {
  meeting: Meeting;
  player: Player;
  close: () => void;
}) {
  return (
    <Sheet title={player.display} close={close}>
      <ul className="menu-links">
        <li>
          <Link href={MEETING_PATHS.standings} onClick={close}>
            Tonight’s standings
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              rememberPlayer(meeting, null);
              window.location.assign(MEETING_PATHS.checkin);
            }}
          >
            Not you? Switch player
          </button>
        </li>
      </ul>
    </Sheet>
  );
}

export default function MeetingAccess({
  children,
}: {
  children: (meeting: Meeting, refresh: () => void) => ReactNode;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");
  const [sheet, setSheet] = useState(false);
  const [, playerChanged] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(PLAYER_EVENT, playerChanged);
    return () => window.removeEventListener(PLAYER_EVENT, playerChanged);
  }, []);
  const refresh = usePoll(
    async (signal) => {
      setChecking(true);
      try {
        const next = await getMeeting(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        setMeeting(next);
        setError("");
        setCheckedAt(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      } catch (failure) {
        if (!signal.aborted) setError(requestError(failure));
      } finally {
        if (!signal.aborted) setChecking(false);
      }
    },
    60000,
    [],
  );
  // Read on every render; PLAYER_EVENT re-renders when the player changes.
  // Waits for "Continue as" on a phone reopened in a new session.
  const player =
    meeting?.open && playerConfirmed() ? savedPlayer(meeting) : null;
  return (
    <div className="meeting-access">
      <header className="meeting-header">
        <Link className="meeting-brand" href="/">
          {LOGO && <Image src={LOGO} alt="" width={32} height={32} />}
          <span className="sr-only">Mahjong Club @ UVA website</span>
        </Link>
        <p className="meeting-status">
          {meeting?.open && meeting.date
            ? `${formatShortDate(meeting.date)} · ${
                meeting.checkinsOpen
                  ? `${meeting.players?.length ?? 0} here`
                  : "Scores still open"
              }`
            : "Mahjong Club @ UVA"}
        </p>
        {player && (
          <button
            type="button"
            className="meeting-you"
            aria-haspopup="dialog"
            onClick={() => setSheet(true)}
          >
            <span>{player.display}</span>
            <IconChevronDown size={16} aria-hidden="true" />
          </button>
        )}
      </header>
      {sheet && meeting && player && (
        <PlayerSheet
          meeting={meeting}
          player={player}
          close={() => setSheet(false)}
        />
      )}
      {error && (
        <div className="meeting-notice" role="alert">
          <p>{error}</p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={refresh}
            disabled={checking}
          >
            {checking ? "Connecting…" : "Retry connection"}
          </button>
          <p>An officer can help with attendance and scores.</p>
        </div>
      )}
      {!meeting && !error && (
        <div className="meeting-loading" role="status">
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Checking tonight’s meeting…
        </div>
      )}
      {meeting && !meeting.open && (
        <div className="meeting-closed">
          <h1>See you at the table.</h1>
          <p>
            Check-in opens during club meetings. Already here? Ask an officer to
            open it.
          </p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={refresh}
            disabled={checking}
          >
            {checking ? "Checking…" : "Check again"}
          </button>
          <p className="quiet" role="status">
            {checking
              ? "Checking for an open meeting…"
              : `Last checked at ${checkedAt}.`}
          </p>
          <Link className="meeting-text" href="/">
            Back to the club
          </Link>
        </div>
      )}
      {meeting?.open && meeting.players && children(meeting, refresh)}
      {meeting?.open && !meeting.players && !error && (
        <p role="alert">
          The meeting service needs an update. Ask an officer to record
          attendance and scores for now.
        </p>
      )}
      <noscript>
        <p>
          Enable JavaScript to check in or submit a score. An officer can also
          record your attendance and result in the Sheet.
        </p>
      </noscript>
    </div>
  );
}
