"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCrown,
  IconTriangleFilled,
  IconTriangleInvertedFilled,
} from "@tabler/icons-react";
import MeetingAccess from "@/components/MeetingAccess";
import PlayerTile from "@/components/PlayerTile";
import {
  getResults,
  getRooms,
  inCheckIn,
  requestError,
  savedPlayer,
  seatedRoom,
  type Meeting,
  type Results,
  MEETING_PATHS,
} from "@/lib/meeting";
import {
  liveStandings,
  podium,
  tonightStandings,
  tonightTables,
} from "@/lib/live";
import type { Meeting as ScheduledMeeting, Semester } from "@/lib/schema";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";
import { clock, minus, signed, tileNames } from "@/lib/format";

// Tonight's tables, asked for alongside the meeting check rather than after
// it, during the meeting's window only. Taken once by the first update;
// null means ask again.
let firstRooms: Promise<Awaited<ReturnType<typeof getRooms>> | null> | null =
  null;

const pointsClass = (net: number) =>
  `live-points${net < 0 ? " down" : net > 0 ? " up" : ""}`;

/** Tonight's standings, then how tonight moves the season for the players
 * who played. */
function LiveTable({
  meeting,
  semester,
}: {
  meeting: Meeting;
  semester: Semester;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [me] = useState(() => savedPlayer(meeting));
  // The table this player is at, so the standings can lead straight back.
  const [myTable, setMyTable] = useState(
    () => seatedRoom(meeting.rooms, me?.id)?.table,
  );
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  // The service still sends the rooms when it can't read the saved tables,
  // so ended tables would silently drop out; say so instead.
  const [missingSaved, setMissingSaved] = useState(false);
  const previousPoints = useRef<Map<string, number> | null>(null);
  const [scoreChanges, setScoreChanges] = useState<Record<string, number>>({});
  const matching = meeting.semester === semester.id;
  const retry = usePoll(
    async (signal) => {
      setUpdating(true);
      try {
        // With table rooms, one read carries both the rooms and the saved
        // tables, so games still in play count once and only once.
        const early = firstRooms;
        firstRooms = null;
        const state =
          meeting.rooms &&
          ((await early) ??
            (await getRooms(MEETING_SERVICE_URL, signal, true)));
        const next: Results = state
          ? {
              status: 200 as const,
              meetingId: meeting.meetingId!,
              date: meeting.date!,
              tables: tonightTables(state.results, state.rooms),
            }
          : await getResults(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        if (next.meetingId !== meeting.meetingId || next.date !== meeting.date)
          throw new Error(
            "The meeting changed. Return to check-in to refresh it.",
          );
        const nextRows = liveStandings(semester, matching ? next : null);
        const previous = previousPoints.current;
        if (previous) {
          const changed = nextRows.filter(
            (row) => previous.get(row.id) !== row.points,
          );
          if (changed.length)
            setScoreChanges((counts) => {
              const updated = { ...counts };
              for (const row of changed)
                updated[row.id] = (updated[row.id] || 0) + 1;
              return updated;
            });
        }
        previousPoints.current = new Map(
          nextRows.map((row) => [row.id, row.points]),
        );
        setResults(next);
        if (state) setMyTable(seatedRoom(state.rooms, me?.id)?.table);
        setMissingSaved(Boolean(state && !state.results));
        setError("");
        setUpdatedAt(clock());
      } catch (failure) {
        if (!signal.aborted) setError(requestError(failure));
      } finally {
        if (!signal.aborted) setUpdating(false);
      }
    },
    30000,
    [meeting.meetingId, meeting.date],
  );
  const rows = liveStandings(semester, matching ? results : null);
  const alreadyCounted = Boolean(
    results && semester.last_session && results.date <= semester.last_session,
  );
  const tonight = tonightStandings(results?.tables ?? []);
  const playedTonight = new Set(tonight.map((row) => row.id));
  const season = matching
    ? rows.filter((row) => playedTonight.has(row.id))
    : [];
  // The top places tonight stand on a podium, step heights by rank.
  const top = tonight.length > 1 ? podium(tonight) : [];
  const podiumNames = tileNames(tonight);
  return (
    <section>
      {me && meeting.rooms && (
        <Link
          className="meeting-chip back-to-table"
          href={myTable ? MEETING_PATHS.table(myTable) : MEETING_PATHS.tables}
        >
          <IconArrowLeft aria-hidden="true" />
          {myTable ? `Back to Table ${myTable}` : "All tables"}
        </Link>
      )}
      {/* Live until an officer publishes tonight, then official. */}
      <p
        className="live-badge"
        data-official={!matching || alreadyCounted || undefined}
        aria-hidden="true"
      >
        {!matching || alreadyCounted ? "Official" : "Live"}
      </p>
      <h1 className="meeting-title live-title">Standings</h1>
      <p
        // The badge says live or official; only loading and delays still
        // need words.
        className={results && !error ? "sr-only" : "live-summary"}
        role="status"
      >
        {!results && matching
          ? error
            ? "Scores unavailable"
            : "Loading…"
          : matching && !alreadyCounted
            ? error
              ? "Delayed"
              : "Awaiting review"
            : "Official standings"}
        {results && (
          <span>
            · <span className="sr-only">Updated </span>
            {updatedAt}
          </span>
        )}
      </p>
      {error && (
        <div className="meeting-notice" role="alert">
          <p>
            {error} {results && "Showing the last scores."}
          </p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={retry}
            disabled={updating}
          >
            {updating ? "Trying…" : "Try again"}
          </button>
        </div>
      )}
      {missingSaved && !error && (
        <p className="meeting-notice" role="alert">
          Ended tables are missing. Officers: run Club › Recheck.
        </p>
      )}
      {top.length > 0 && (
        // Drawn for the eye only; the list below still reads every place.
        <div className="live-podium" aria-hidden="true">
          {top.map((row, i) => (
            <div
              key={row.id}
              data-step={Math.min(row.rank, 3)}
              data-you={row.id === me?.id || undefined}
              // First in the middle, then left, then right.
              style={{ gridColumn: [2, 1, 3][i] }}
            >
              <span className="podium-tile">
                <PlayerTile id={row.id} />
                {row.rank === 1 && (
                  <span className="seat-crown">
                    <IconCrown />
                  </span>
                )}
              </span>
              <span className="podium-name">{podiumNames.get(row.id)}</span>
              <strong className={pointsClass(row.net)}>
                {signed(row.net)}
              </strong>
              <span className="podium-step">{row.rank}</span>
            </div>
          ))}
        </div>
      )}
      <ol className="live-list" aria-label="Tonight’s standings">
        {tonight.map((row, i) => (
          <li
            key={row.id}
            data-you={row.id === me?.id || undefined}
            className={i < top.length ? "sr-only" : undefined}
          >
            <span className="live-rank" aria-label={`Rank ${row.rank}`}>
              {row.rank}
            </span>
            <PlayerTile id={row.id} />
            <span className="score-name">
              {row.display}
              {row.id === me?.id && <span className="sr-only"> (you)</span>}
            </span>
            <strong className={pointsClass(row.net)}>
              {signed(row.net)}
              <span className="sr-only"> net tonight</span>
            </strong>
          </li>
        ))}
      </ol>
      {season.length > 0 && (
        <section className="live-season" aria-labelledby="season-after">
          <h2 id="season-after">
            Season <span>after tonight</span>
          </h2>
          <ol
            className="live-list"
            aria-label="Season standings for tonight’s players"
          >
            {season.map((row) => {
              const change = row.before === null ? null : row.before - row.rank;
              const [move, said, shown] =
                change === null
                  ? ["new", "new player", "new"]
                  : change > 0
                    ? ["up", `up ${change}`, change]
                    : change < 0
                      ? ["down", `down ${-change}`, -change]
                      : ["same", "no change", null];
              return (
                <li key={row.id} data-you={row.id === me?.id || undefined}>
                  <PlayerTile id={row.id} />
                  <span className="score-name">
                    {row.display}
                    {row.id === me?.id && (
                      <span className="sr-only"> (you)</span>
                    )}
                  </span>
                  <strong
                    key={scoreChanges[row.id] || 0}
                    className={`live-points${scoreChanges[row.id] ? " live-points-changed" : ""}`}
                  >
                    {minus(row.points)}
                    <span className="sr-only"> points</span>
                  </strong>
                  <span className="live-change">
                    #{row.rank}{" "}
                    {/* Keyed by the move, so it lands only when it changes. */}
                    <span
                      className="live-move"
                      data-move={move}
                      key={`${move}${shown}`}
                    >
                      {move === "up" && (
                        <IconTriangleFilled aria-hidden="true" />
                      )}
                      {move === "down" && (
                        <IconTriangleInvertedFilled aria-hidden="true" />
                      )}
                      <span aria-hidden="true">{shown}</span>
                      <span className="sr-only">{said}</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {results && !tonight.length && (
        <p className="meeting-notice">No scores yet tonight.</p>
      )}
      {!meeting.rooms && (
        <div className="meeting-actions">
          {/* Only without table rooms: with them, scores are recorded at the
              table, and typing them in here would count those games twice. */}
          <Link className="meeting-primary" href={MEETING_PATHS.score}>
            Record a table
          </Link>
        </div>
      )}
      {/* A phone with no player has no menu, so it gets its own way back. */}
      {meeting.rooms && !me && (
        <Link className="meeting-text" href={MEETING_PATHS.tables}>
          All tables
        </Link>
      )}
    </section>
  );
}
export default function LiveStandings({
  semester,
  schedule,
}: {
  semester: Semester;
  schedule: ScheduledMeeting[];
}) {
  useEffect(() => {
    if (schedule.some((m) => inCheckIn(m, Date.now())))
      firstRooms = getRooms(MEETING_SERVICE_URL, undefined, true).catch(
        () => null,
      );
  }, [schedule]);
  return (
    <MeetingAccess>
      {(meeting) => (
        <LiveTable
          key={meeting.meetingId}
          meeting={meeting}
          semester={semester}
        />
      )}
    </MeetingAccess>
  );
}
