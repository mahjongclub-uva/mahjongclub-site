"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import MeetingAccess from "@/components/MeetingAccess";
import PlayerTile from "@/components/PlayerTile";
import {
  getResults,
  getRooms,
  requestError,
  savedPlayer,
  type Meeting,
  type Results,
  MEETING_PATHS,
} from "@/lib/meeting";
import { liveStandings, tonightStandings, tonightTables } from "@/lib/live";
import type { Semester } from "@/lib/schema";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";

function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "±0";
}

/** Tonight's standings, then how tonight moves the season for the players
 * who played. `embedded` is the public leaderboard's Tonight tab: tonight
 * only, with no heading, tiles, season block or meeting links. */
export function LiveTable({
  meeting,
  semester,
  embedded = false,
}: {
  meeting: Meeting;
  semester: Semester;
  embedded?: boolean;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [me] = useState(() => savedPlayer(meeting));
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const previousPoints = useRef<Map<string, number> | null>(null);
  const [scoreChanges, setScoreChanges] = useState<Record<string, number>>({});
  const retry = usePoll(
    async (signal) => {
      setUpdating(true);
      try {
        // With table rooms, one read carries both the rooms and the saved
        // tables, so games still in play count once and only once.
        const next: Results = meeting.rooms
          ? await getRooms(MEETING_SERVICE_URL, signal).then((state) => ({
              status: 200 as const,
              meetingId: meeting.meetingId!,
              date: meeting.date!,
              tables: tonightTables(state.results, state.rooms),
            }))
          : await getResults(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        if (next.meetingId !== meeting.meetingId || next.date !== meeting.date)
          throw new Error(
            "The meeting changed. Return to check-in to refresh it.",
          );
        const nextRows = liveStandings(
          semester,
          meeting.semester === semester.id &&
            semester.scoring_rule === "season-net"
            ? next
            : null,
        );
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
        setError("");
        setUpdatedAt(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      } catch (failure) {
        if (!signal.aborted) setError(requestError(failure));
      } finally {
        if (!signal.aborted) setUpdating(false);
      }
    },
    30000,
    [meeting.meetingId, meeting.date],
  );
  const matching =
    meeting.semester === semester.id && semester.scoring_rule === "season-net";
  const rows = liveStandings(semester, matching ? results : null);
  const alreadyCounted = Boolean(
    results && semester.last_session && results.date <= semester.last_session,
  );
  const tonight = tonightStandings(results?.tables ?? []);
  const mineTonight = me && tonight.find((row) => row.id === me.id);
  const playedTonight = new Set(tonight.map((row) => row.id));
  const season = matching
    ? rows.filter((row) => playedTonight.has(row.id))
    : [];
  return (
    <section>
      {embedded ? (
        <p className="meeting-intro">
          Tonight’s nets include games at tables still playing. Nothing is
          official until an officer publishes it.
        </p>
      ) : (
        <h1 className="meeting-title">Tonight</h1>
      )}
      <p
        // On the meeting page the usual "Awaiting review" is left unsaid;
        // loading, delays and official standings still show.
        className={
          !embedded && results && matching && !alreadyCounted && !error
            ? "sr-only"
            : "live-summary"
        }
        role="status"
      >
        {!results && matching
          ? error
            ? "Season scores only"
            : "Loading tonight’s scores…"
          : matching && !alreadyCounted
            ? error
              ? "Last received scores · Update delayed"
              : "Awaiting review"
            : "Official standings"}
        {results && (
          <span>
            · {results.tables.length}{" "}
            {results.tables.length === 1 ? "table" : "tables"} tonight
          </span>
        )}
        {results && <span>· Updated {updatedAt}</span>}
      </p>
      {error && (
        <div className="meeting-notice" role="alert">
          <p>
            {error} {results && "Showing the last scores received."}
          </p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={retry}
            disabled={updating}
          >
            {updating ? "Updating…" : "Retry update"}
          </button>
        </div>
      )}
      {embedded && mineTonight && (
        <p className="live-you">
          <span>You tonight</span>
          <strong data-sign={Math.sign(mineTonight.net)}>
            {signed(mineTonight.net)}
          </strong>
          <span>
            #{mineTonight.rank} of {tonight.length} · {mineTonight.tables}{" "}
            {mineTonight.tables === 1 ? "table" : "tables"}
          </span>
        </p>
      )}
      <ol className="live-list" aria-label="Tonight’s standings">
        {tonight.map((row) => (
          <li key={row.id} data-you={row.id === me?.id || undefined}>
            <span className="live-rank" aria-label={`Rank ${row.rank}`}>
              {row.rank}
            </span>
            {!embedded && <PlayerTile id={row.id} />}
            <span className="score-name">
              {row.display}
              {row.id === me?.id && <span className="sr-only"> (you)</span>}
              {embedded && (
                <small>
                  {row.tables} {row.tables === 1 ? "table" : "tables"} tonight
                </small>
              )}
            </span>
            <strong
              className={`live-points${row.net < 0 ? " down" : row.net > 0 ? " up" : ""}`}
            >
              {signed(row.net)}
              <span className="sr-only"> net tonight</span>
            </strong>
          </li>
        ))}
      </ol>
      {!embedded && season.length > 0 && (
        <section className="live-season" aria-labelledby="season-after">
          <h2 id="season-after">Season after tonight</h2>
          <ol
            className="live-list"
            aria-label="Season standings for tonight’s players"
          >
            {season.map((row) => {
              const change = row.before === null ? null : row.before - row.rank;
              return (
                <li key={row.id} data-you={row.id === me?.id || undefined}>
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
                    {String(row.points).replace("-", "−")}
                    <span className="sr-only"> points</span>
                  </strong>
                  <span
                    className={`live-change${change !== null && change < 0 ? " down" : change ? " up" : ""}`}
                  >
                    #{row.rank}{" "}
                    <span
                      aria-label={
                        change === null
                          ? "new player"
                          : change > 0
                            ? `up ${change}`
                            : change < 0
                              ? `down ${-change}`
                              : "no change"
                      }
                    >
                      {change === null
                        ? "new"
                        : change > 0
                          ? `↑${change}`
                          : change < 0
                            ? `↓${-change}`
                            : "·"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {results && !tonight.length && (
        <p className="meeting-notice">
          No tables saved yet tonight. Check back after the first table is
          saved.
        </p>
      )}
      {!embedded &&
        results &&
        matching &&
        !alreadyCounted &&
        tonight.length > 0 && (
          <p className="quiet">
            Includes tables still playing. Nothing is official until an officer
            publishes it.
          </p>
        )}
      {season.length > 0 && semester.unranked.length > 0 && (
        <p className="quiet">
          Players still qualifying appear after their scores are officially
          updated.
        </p>
      )}
      {!embedded && !meeting.rooms && (
        <div className="meeting-actions">
          {/* Only without table rooms: with them, scores are recorded at the
              table, and typing them in here would count those games twice. */}
          <Link className="meeting-primary" href={MEETING_PATHS.score}>
            Record a table
          </Link>
        </div>
      )}
      {/* A phone with no player has no menu, so it gets its own way back. */}
      {!embedded && meeting.rooms && !me && (
        <Link className="meeting-text" href={MEETING_PATHS.tables}>
          See tonight’s tables
        </Link>
      )}
    </section>
  );
}
export default function LiveStandings({ semester }: { semester: Semester }) {
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
