"use client";

import { useState } from "react";
import Link from "next/link";
import MeetingAccess from "@/components/MeetingAccess";
import {
  getResults,
  requestError,
  type Meeting,
  type Results,
} from "@/lib/meeting";
import { liveStandings } from "@/lib/live";
import type { Semester } from "@/lib/schema";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";

function LiveTable({
  meeting,
  semester,
}: {
  meeting: Meeting;
  semester: Semester;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const retry = usePoll(
    async (signal) => {
      setUpdating(true);
      try {
        const next = await getResults(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        if (next.meetingId !== meeting.meetingId || next.date !== meeting.date)
          throw new Error(
            "The meeting changed. Return to check-in to refresh it.",
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
  return (
    <section>
      <h1>Live standings</h1>
      <p className="meeting-intro">
        {matching
          ? "Season scores, with tonight’s tables added as they’re recorded."
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
              : "Tonight included · Not final yet"
            : "Official standings"}
        {results && (
          <span>
            · {results.tables.length}{" "}
            {results.tables.length === 1 ? "table" : "tables"} tonight
          </span>
        )}
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
      {results && <p className="quiet">Last updated at {updatedAt}.</p>}
      <ol className="live-list" aria-label="Live season standings">
        {rows.map((row) => {
          const change = row.before === null ? null : row.before - row.rank;
          return (
            <li key={row.id}>
              <span className="live-rank" aria-label={`Rank ${row.rank}`}>
                {row.rank}
              </span>
              <span className="score-name">
                {row.display}
                <small>
                  {row.tables} {row.tables === 1 ? "table" : "tables"} this
                  season
                </small>
              </span>
              <strong className="live-points">
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
      {!rows.length && results && (
        <p className="meeting-notice">
          {matching && !alreadyCounted
            ? "The first recorded table gets things moving. Check back after your table plays."
            : "No official scores have been recorded yet."}
        </p>
      )}
      {semester.unranked.length > 0 && (
        <p className="quiet">
          Players still qualifying appear after their scores are officially
          updated.
        </p>
      )}
      <div className="meeting-actions">
        <Link className="meeting-primary" href="/score/">
          Record a table
        </Link>
        <div className="meeting-quiet-actions">
          <Link className="meeting-text" href="/checkin/">
            Check in
          </Link>
        </div>
      </div>
      <p className="quiet">
        Updates about every 30 seconds. An officer checks tonight’s scores
        before they become official.
      </p>
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
