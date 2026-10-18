"use client";

import {
  useEffect,
  useReducer,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  IconArmchair,
  IconChevronRight,
  IconDoorExit,
  IconMenu2,
  IconTrophy,
} from "@tabler/icons-react";
import Sheet from "@/components/Sheet";
import {
  getMeeting,
  getRooms,
  keepMeeting,
  latestMeeting,
  playerConfirmed,
  PLAYER_EVENT,
  provisionalMeeting,
  rememberPlayer,
  requestError,
  savedPlayer,
  seatedRoom,
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
import { clock, formatShortDate, signed } from "@/lib/format";
import { tonightStandings, tonightTables } from "@/lib/live";
import { SEASON_START, type Meeting as ScheduledMeeting } from "@/lib/schema";
import { usePoll } from "@/lib/usePoll";

// Net from 0, signed and coloured, like the standings.
const NetScore = ({ net }: { net: number }) => (
  <b data-sign={Math.sign(net)}>{signed(net)}</b>
);

const ordinals = new Intl.PluralRules("en", { type: "ordinal" });
const SUFFIX = { one: "st", two: "nd", few: "rd", other: "th" } as Record<
  string,
  string
>;
const ORDINAL = (n: number) => `${n}${SUFFIX[ordinals.select(n)]}`;

/** The menu: your table first (or a way to find one), the other places
 * tonight, and who this phone is playing as. */
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
  const tablePath = mine && MEETING_PATHS.table(mine.table);
  // The table page does the leaving, and asks first once games are saved.
  const leave = mine && MEETING_PATHS.leave(mine.table);
  const openTables = (meeting.rooms ?? []).filter(
    (room) => room.seats.length < 4,
  );
  // The menu only offers what the page you're on doesn't already show.
  const findCard = !mine && meeting.rooms && path !== MEETING_PATHS.tables;
  const standings = path !== MEETING_PATHS.tonight;
  const leaveHere = leave && path === tablePath;
  // Your night so far, across every table, read once when the menu opens.
  const [night, setNight] = useState<ReturnType<
    typeof tonightStandings
  > | null>(null);
  const hasRooms = !!meeting.rooms;
  useEffect(() => {
    if (!hasRooms) return;
    const controller = new AbortController();
    getRooms(MEETING_SERVICE_URL, controller.signal, true)
      .then((state) =>
        setNight(tonightStandings(tonightTables(state.results, state.rooms))),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [hasRooms]);
  const me = night?.find((row) => row.id === player.id);
  const tonight = !hasRooms
    ? null
    : !night
      ? "…"
      : me
        ? `· ${ORDINAL(me.rank)} tonight`
        : "No games yet";
  return (
    <Sheet title="Menu" close={close} className="menu-sheet">
      <div className="menu-me">
        <PlayerTile id={player.id} />
        <p>
          <strong>{player.display}</strong>
          {tonight && (
            <small>
              {me && <NetScore net={me.net} />} {tonight}
            </small>
          )}
        </p>
        <button
          type="button"
          className="meeting-text"
          onClick={() => {
            rememberPlayer(meeting, null);
            window.location.assign(MEETING_PATHS.checkin);
          }}
        >
          Switch<span className="sr-only"> player</span>
        </button>
      </div>
      {mine && path !== tablePath && (
        // Away from your table: its four players and scores, and the way back.
        <section className="menu-card" aria-label={`Table ${mine.table}`}>
          <h3>
            Table {mine.table}
            <small>Game {mine.hands.length + 1}</small>
          </h3>
          <ul className="menu-card-seats">
            {mine.seats
              .toSorted((a, b) => a.wind - b.wind)
              .map((item) => (
                <li key={item.id}>
                  <PlayerTile id={item.id} />
                  <span data-me={item.id === player.id || undefined}>
                    {item.id === player.id ? "You" : item.display}
                  </span>
                  <NetScore
                    net={
                      (mine.totals.find((total) => total.id === item.id)
                        ?.total ?? SEASON_START) - SEASON_START
                    }
                  />
                </li>
              ))}
          </ul>
          <div className="menu-card-actions">
            <Link className="meeting-primary" href={tablePath!} onClick={close}>
              <IconArmchair aria-hidden="true" />
              Back to table
            </Link>
            {leave && (
              <button
                type="button"
                className="menu-leave"
                onClick={() => {
                  close();
                  // The table page handles leaving, with its own checks.
                  router.push(leave);
                }}
              >
                <IconDoorExit aria-hidden="true" />
                Leave table
              </button>
            )}
          </div>
        </section>
      )}
      {findCard && (
        <section className="menu-card" aria-label="Find a table">
          <h3>Open seats</h3>
          {openTables.length > 0 && (
            <ul className="menu-card-open">
              {openTables.slice(0, 3).map((room) => (
                <li key={room.table}>
                  Table {room.table} · {4 - room.seats.length} open
                </li>
              ))}
            </ul>
          )}
          <Link
            className="meeting-primary"
            href={MEETING_PATHS.tables}
            onClick={close}
          >
            <IconArmchair aria-hidden="true" />
            Find a table
          </Link>
        </section>
      )}
      {(standings || leaveHere) && (
        <ul className="menu-links">
          {standings && (
            <li>
              <Link href={MEETING_PATHS.tonight} onClick={close}>
                <IconTrophy aria-hidden="true" />
                <span>Tonight’s standings</span>
                <IconChevronRight aria-hidden="true" />
              </Link>
            </li>
          )}
          {leaveHere && (
            <li>
              <button
                type="button"
                className="menu-leave"
                onClick={() => {
                  close();
                  window.location.hash = "leave";
                }}
              >
                <IconDoorExit aria-hidden="true" />
                Leave table
              </button>
            </li>
          )}
        </ul>
      )}
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
            {checking ? "Trying…" : "Try again"}
          </button>
          <p>Still stuck? An officer can check you in.</p>
        </div>
      )}
      {!meeting && !error && (
        <div className="meeting-loading" role="status">
          <span className="sr-only">Loading tonight’s meeting</span>
          <span aria-hidden="true">
            {[..."LOADING"].map((letter, i) => (
              <span
                className="loading-drop"
                key={i}
                style={{ "--i": i } as CSSProperties}
              >
                <span className="loading-turn">
                  <span className="loading-face">{letter}</span>
                  <span className="loading-back" />
                </span>
              </span>
            ))}
          </span>
        </div>
      )}
      {meeting && !meeting.open && (
        <div className="meeting-closed">
          <h1>No meeting yet</h1>
          <p>Here? Ask an officer to open it.</p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={refresh}
            disabled={checking}
          >
            {checking ? "Checking…" : "Check again"}
          </button>
          {/* Spoken, not shown: the button already shows when it's checking. */}
          <p className="sr-only" role="status">
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
          This page needs an update. Ask an officer to record scores.
        </p>
      )}
      <noscript>
        <p>Turn on JavaScript to check in, or ask an officer.</p>
      </noscript>
    </div>
  );
}
