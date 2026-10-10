"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import MeetingAccess from "@/components/MeetingAccess";
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

/** `embedded` is the public leaderboard's Tonight tab: tonight only, with no
 * page heading, view switch or meeting links. */
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
  const [view, setView] = useState<"tonight" | "semester">("tonight");
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
  const showTonight = embedded || view === "tonight";
  return (
    <section>
      {!embedded && (
        <>
          <h1>{showTonight ? "Tonight." : "This semester."}</h1>
          <div className="leaderboard-view" role="group" aria-label="Standings">
            <button
              type="button"
              aria-pressed={showTonight}
              onClick={() => setView("tonight")}
            >
              Tonight
            </button>
            <button
              type="button"
              aria-pressed={!showTonight}
              onClick={() => setView("semester")}
            >
              Semester
            </button>
          </div>
        </>
      )}
      <p className="meeting-intro">
        {showTonight
          ? "Each player’s net tonight. Games at tables still playing are included and stay provisional until an officer publishes them."
          : matching
            ? "Season scores with tonight’s saved tables added. Provisional until an officer publishes them."
            : "These are the latest season scores. Tonight’s meeting belongs to a different season."}
      </p>
      <p className="live-summary" role="status">
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
      {showTonight && mineTonight && (
        <p className="live-you">
          <span>You tonight</span>
          <strong>{signed(mineTonight.net)}</strong>
          <span>
            #{mineTonight.rank} of {tonight.length} · {mineTonight.tables}{" "}
            {mineTonight.tables === 1 ? "table" : "tables"}
          </span>
        </p>
      )}
      {showTonight ? (
        <ol className="live-list" aria-label="Tonight’s standings">
          {tonight.map((row) => (
            <li key={row.id} data-you={row.id === me?.id || undefined}>
              <span className="live-rank" aria-label={`Rank ${row.rank}`}>
                {row.rank}
              </span>
              <span className="score-name">
                {row.display}
                {row.id === me?.id && " (you)"}
                <small>
                  {row.tables} {row.tables === 1 ? "table" : "tables"} tonight
                </small>
              </span>
              <strong className={`live-points${row.net < 0 ? " down" : ""}`}>
                {signed(row.net)}
                <span className="sr-only"> net tonight</span>
              </strong>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="live-list" aria-label="Live season standings">
          {rows.map((row) => {
            const change = row.before === null ? null : row.before - row.rank;
            return (
              <li key={row.id} data-you={row.id === me?.id || undefined}>
                <span className="live-rank" aria-label={`Rank ${row.rank}`}>
                  {row.rank}
                </span>
                <span className="score-name">
                  {row.display}
                  {row.id === me?.id && " (you)"}
                  <small>
                    {row.tables} {row.tables === 1 ? "table" : "tables"} this
                    season
                  </small>
                </span>
                <strong
                  key={scoreChanges[row.id] || 0}
                  className={`live-points${scoreChanges[row.id] ? " live-points-changed" : ""}`}
                >
                  {row.points}
                  <span className="sr-only"> points</span>
                </strong>
                <span
                  className={`live-change ${change !== null && change < 0 ? "down" : ""}`}
                  aria-label={
                    change === null
                      ? "New player"
                      : change > 0
                        ? `Up ${change} ranks`
                        : change < 0
                          ? `Down ${-change} ranks`
                          : "No rank change"
                  }
                >
                  {change === null
                    ? "New"
                    : change > 0
                      ? `↑ ${change}`
                      : change < 0
                        ? `↓ ${-change}`
                        : "·"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {showTonight && results && !tonight.length && (
        <p className="meeting-notice">
          No tables saved yet tonight. Check back after the first table is
          saved.
        </p>
      )}
      {!showTonight && !rows.length && results && (
        <p className="meeting-notice">
          {matching && !alreadyCounted
            ? "The first recorded table gets things moving. Check back after your table plays."
            : "No official scores have been recorded yet."}
        </p>
      )}
      {!showTonight && semester.unranked.length > 0 && (
        <p className="quiet">
          Players still qualifying appear after their scores are officially
          updated.
        </p>
      )}
      {!embedded && (
        <div className="meeting-actions">
          {/* With table rooms, scores are recorded at the table; typing them
              in again here would count those games twice. */}
          <Link
            className="meeting-primary"
            href={meeting.rooms ? MEETING_PATHS.tables : MEETING_PATHS.score}
          >
            {meeting.rooms ? "Back to the tables" : "Record a table"}
          </Link>
          <div className="meeting-quiet-actions">
            <Link className="meeting-text" href={MEETING_PATHS.checkin}>
              Check in
            </Link>
          </div>
        </div>
      )}
      <p className="quiet">Refreshes about every 30 seconds.</p>
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
