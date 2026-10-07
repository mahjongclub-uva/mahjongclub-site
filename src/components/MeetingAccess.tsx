"use client";

import { useState, type ReactNode } from "react";
import { getMeeting, requestError, type Meeting } from "@/lib/meeting";
import { LOGO, MEETING_SERVICE_URL } from "@/lib/site";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

export default function MeetingAccess({
  children,
}: {
  children: (meeting: Meeting, refresh: () => void) => ReactNode;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");
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
  return (
    <div className="meeting-access">
      <header className="meeting-header">
        <div className="meeting-brand">
          {LOGO && <Image src={LOGO} alt="" width={36} height={36} />}
          <span>
            <strong>
              {meeting?.date
                ? `${formatDate(meeting.date)} - Meeting`
                : "Mahjong meeting"}
            </strong>
            <small>Mahjong Club @ UVA</small>
          </span>
        </div>
        <Link href="/" className="meeting-website">
          Club website ↗
        </Link>
      </header>
      {meeting?.open && (
        <p className="meeting-status">
          <span className="meeting-live-dot" aria-hidden="true" />
          {meeting.checkinsOpen
            ? "We’re playing right now!"
            : "Scores are still open"}
        </p>
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
      {!meeting && !error && <p role="status">Checking tonight’s meeting…</p>}
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
