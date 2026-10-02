"use client";

import { useEffect, useState } from "react";
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

function LiveTable({
  meeting,
  semester,
}: {
  meeting: Meeting;
  semester: Semester;
}) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [includeTonight, setIncludeTonight] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let stopped = false;
    let controller: AbortController;
    let request = 0;
    async function load() {
      controller?.abort();
      controller = new AbortController();
      const current = ++request;
      try {
        const next = await getResults(
          MEETING_SERVICE_URL,
          AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        );
        if (stopped || current !== request) return;
        if (next.meetingId !== meeting.meetingId || next.date !== meeting.date)
          throw new Error(
            "The meeting changed. Return to check-in to refresh it.",
          );
        setResults(next);
        setError("");
      } catch (failure) {
        if (!stopped && current === request) setError(requestError(failure));
      }
    }
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, [meeting.meetingId, meeting.date, revision]);
  const matching =
    meeting.semester === semester.id && semester.scoring_rule === "season-net";
  const rows = liveStandings(
    semester,
    matching ? results : null,
    includeTonight,
  );
  const alreadyCounted = Boolean(
    results && semester.last_session && results.date <= semester.last_session,
  );
  return (
    <section>
      <p className="eyebrow">Around the tables</p>
      <h1>The night is moving.</h1>
      <p className="meeting-intro">
        {matching
          ? "Season scores, with tonight’s hands added as they’re recorded."
          : "These are the latest season scores. Tonight’s meeting belongs to a different season."}
      </p>
      <p className="live-summary" role="status">
        {includeTonight && matching && !alreadyCounted
          ? "Tonight included · Not final yet"
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
            className="meeting-text"
            type="button"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry update
          </button>
        </div>
      )}
      {!results && !error && (
        <p className="quiet" role="status">
          Fetching tonight’s scores…
        </p>
      )}
      <ol className="live-list" aria-label="Live season standings">
        {rows.map((row) => {
          const change = row.before === null ? null : row.before - row.rank;
          return (
            <li key={`${row.id}:${row.rank}:${row.points}`}>
              <span className="live-rank" aria-label={`Rank ${row.rank}`}>
                {row.rank}
              </span>
              <span className="meeting-avatar" aria-hidden="true">
                {row.display[0]}
              </span>
              <span className="score-name">
                {row.display}
                <small>
                  {row.tables} {row.tables === 1 ? "table" : "tables"} this
                  season
                </small>
              </span>
              <strong className="live-points">{row.points}</strong>
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
                  ? "NEW"
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
          {includeTonight && matching && !alreadyCounted
            ? "The first recorded hand gets things moving. Check back after your table plays."
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
          {matching && !alreadyCounted && (
            <button
              className="meeting-text"
              type="button"
              aria-pressed={!includeTonight}
              onClick={() => setIncludeTonight((n) => !n)}
            >
              {includeTonight
                ? "See before tonight"
                : "Include tonight’s scores"}
            </button>
          )}
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
