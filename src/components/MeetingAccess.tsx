"use client";

import { useEffect, useReducer, useState, type ReactNode } from "react";
import {
  IconArmchair,
  IconArrowsExchange,
  IconChevronRight,
  IconDoorExit,
  IconLayoutGrid,
  IconMenu2,
  IconTrophy,
} from "@tabler/icons-react";
import Sheet from "@/components/Sheet";
import {
  getMeeting,
  keepMeeting,
  latestMeeting,
  playerConfirmed,
  PLAYER_EVENT,
  provisionalMeeting,
  rememberPlayer,
  requestError,
  savedPlayer,
  seatedRoom,
  WINDS,
  type Meeting,
  type Player,
  type SavedPlayer,
  MEETING_PATHS,
} from "@/lib/meeting";
import { LOGO, MEETING_SERVICE_URL } from "@/lib/site";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import PlayerTile from "@/components/PlayerTile";
import { clock, formatShortDate } from "@/lib/format";
import type { Meeting as ScheduledMeeting } from "@/lib/schema";
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
  // Trailing slashes come and go with the router; the paths keep theirs.
  const path = usePathname().replace(/\/?$/, "/");
  const router = useRouter();
  const mine = seatedRoom(meeting.rooms, player.id);
  const seat = mine?.seats.find((item) => item.id === player.id);
  const playing = meeting.rooms?.filter((room) => room.seats.length) ?? [];
  const open = playing.reduce((n, room) => n + 4 - room.seats.length, 0);
  const links = [
    mine &&
      seat && {
        href: MEETING_PATHS.table(mine.table),
        icon: <IconArmchair aria-hidden="true" />,
        title: `Table ${mine.table}`,
        note: `${WINDS[seat.wind]} seat`,
        // Once games are saved, the table changes groups by ending instead.
        leave: !mine.hands.length && MEETING_PATHS.leave(mine.table),
      },
    meeting.rooms && {
      href: MEETING_PATHS.tables,
      icon: <IconLayoutGrid aria-hidden="true" />,
      title: "Tables tonight",
      note: `${playing.length} playing${open ? ` · ${open} open ${open === 1 ? "seat" : "seats"}` : ""}`,
    },
    {
      href: MEETING_PATHS.tonight,
      icon: <IconTrophy aria-hidden="true" />,
      title: "Tonight’s standings",
      note: "Live",
    },
  ].filter((link) => !!link);
  return (
    <Sheet title="Menu" close={close}>
      <div className="menu-you">
        <PlayerTile id={player.id} />
        <p>
          <small>Playing as</small>
          <strong>{player.display}</strong>
        </p>
        <button
          type="button"
          className="meeting-chip"
          onClick={() => {
            rememberPlayer(meeting, null);
            window.location.assign(MEETING_PATHS.checkin);
          }}
        >
          <IconArrowsExchange aria-hidden="true" /> Switch
          <span className="sr-only"> player</span>
        </button>
      </div>
      <ul className="menu-links">
        {links.map(({ href, icon, title, note, leave }) => {
          const here = path === href;
          return (
            <li key={href} data-leave={leave || undefined}>
              <Link
                href={href}
                onClick={close}
                aria-current={here ? "page" : undefined}
              >
                {icon}
                <span>
                  {title}
                  <small>{note}</small>
                </span>
                {here ? (
                  <em>You’re here</em>
                ) : (
                  <IconChevronRight aria-hidden="true" />
                )}
              </Link>
              {leave && (
                <button
                  type="button"
                  className="meeting-chip"
                  onClick={() => {
                    close();
                    // The table page handles leaving, with its own checks.
                    if (here) window.location.hash = "leave";
                    else router.push(leave);
                  }}
                >
                  <IconDoorExit aria-hidden="true" />
                  Leave
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

export default function MeetingAccess({
  children,
  schedule,
}: {
  children: (meeting: Meeting, refresh: () => void) => ReactNode;
  /** Lets the page start from the calendar while the first reply is slow. */
  schedule?: ScheduledMeeting[];
}) {
  const [fetched, setMeeting] = useState(latestMeeting);
  const [early, setEarly] = useState<Meeting | null>(null);
  const meeting = fetched ?? early;
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");
  const [sheet, setSheet] = useState(false);
  const [, playerChanged] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    // A player who just checked in joins the last reply, so the next page
    // knows them before the service has answered again.
    const changed = (event: Event) => {
      const saved = (event as CustomEvent<SavedPlayer | null>).detail;
      const withPlayer = (shown: Meeting | null) =>
        shown &&
        saved &&
        shown.meetingId === saved.meetingId &&
        !shown.players?.some((p) => p.id === saved.player.id)
          ? { ...shown, players: [...(shown.players ?? []), saved.player] }
          : shown;
      keepMeeting(withPlayer(latestMeeting()));
      setMeeting(withPlayer);
      playerChanged();
    };
    window.addEventListener(PLAYER_EVENT, changed);
    return () => window.removeEventListener(PLAYER_EVENT, changed);
  }, []);
  const refresh = usePoll(
    async (signal) => {
      setChecking(true);
      // Decided once, so checking in early cannot bring the loading screen back.
      if (schedule)
        setEarly((shown) => shown ?? provisionalMeeting(schedule, Date.now()));
      try {
        const next = await getMeeting(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        setMeeting(next);
        setError("");
        setCheckedAt(clock());
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
          {meeting?.open && meeting.date ? (
            <>
              <small>Mahjong Club @ UVA</small>
              <b>{formatShortDate(meeting.date)}</b>
            </>
          ) : (
            <b>Mahjong Club @ UVA</b>
          )}
        </p>
        {player && (
          <button
            type="button"
            className="meeting-you"
            aria-haspopup="dialog"
            onClick={() => setSheet(true)}
          >
            <span className="meeting-you-tile">
              <PlayerTile id={player.id} />
            </span>
            Menu
            <IconMenu2 aria-hidden="true" />
            <span className="sr-only">, playing as {player.display}</span>
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
