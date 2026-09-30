"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CODE_EVENT,
  CODE_STORAGE,
  getMeeting,
  rememberedCode,
  requestError,
  type Meeting,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { formatDate } from "@/lib/format";

export default function MeetingAccess({
  children,
}: {
  children: (code: string, meeting: Meeting, refresh: () => void) => ReactNode;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    async function initialize() {
      const url = new URL(window.location.href);
      let saved = "";
      try {
        saved = rememberedCode(sessionStorage.getItem(CODE_STORAGE));
        if (!saved) sessionStorage.removeItem(CODE_STORAGE);
      } catch {
        /* The code form still works without storage. */
      }
      const initial = (url.searchParams.get("k") || saved).trim().toUpperCase();
      if (url.searchParams.has("k")) {
        url.searchParams.delete("k");
        window.history.replaceState(window.history.state, "", url);
      }
      setEntry(initial);
      setCode(initial);
    }
    void initialize();
  }, []);

  useEffect(() => {
    if (code === null) return;
    let cancelled = false;
    let controller: AbortController;
    async function load() {
      controller = new AbortController();
      try {
        const next = await getMeeting(
          MEETING_SERVICE_URL,
          code!,
          AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        );
        if (cancelled) return;
        setMeeting(next);
        setError("");
        if (code && next.players) {
          try {
            if (
              JSON.parse(sessionStorage.getItem(CODE_STORAGE) || "null")
                ?.code !== code
            )
              sessionStorage.setItem(
                CODE_STORAGE,
                JSON.stringify({ code, savedAt: Date.now() }),
              );
            window.dispatchEvent(new Event(CODE_EVENT));
          } catch {
            /* No identity is stored. */
          }
        }
      } catch (failure) {
        if (!cancelled) setError(requestError(failure));
      }
    }
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, [code, revision]);

  const refresh = () => setRevision((value) => value + 1);
  const authorized = Boolean(code && meeting?.open && meeting.players);
  return (
    <div className="meeting-access">
      {error && (
        <div className="meeting-notice" role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Retry connection
          </button>
          <p>An officer can record attendance and scores in the Sheet.</p>
        </div>
      )}
      {!meeting && !error && <p role="status">Checking tonight’s meeting…</p>}
      {meeting && !meeting.open && (
        <div className="meeting-notice">
          <h2>No meeting is open</h2>
          <p>
            Check-in and scores are available during a club meeting. Ask an
            officer if you’re at a table now.
          </p>
          <button type="button" onClick={refresh}>
            Check again
          </button>
        </div>
      )}
      {meeting?.open && !authorized && (
        <form
          className="meeting-form"
          onSubmit={(event) => {
            event.preventDefault();
            setMeeting(null);
            setCode(entry.trim().toUpperCase());
            refresh();
          }}
        >
          <h2>Enter tonight’s code</h2>
          <p>
            Find the semester code under your table’s QR code, or ask an
            officer.
          </p>
          {code && (
            <p role="alert">
              That code isn’t recognized. Check it and try again.
            </p>
          )}
          <label htmlFor="meeting-code">Semester code</label>
          <input
            id="meeting-code"
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            required
            maxLength={64}
          />
          <button className="meeting-primary" type="submit">
            Continue
          </button>
        </form>
      )}
      {authorized && meeting && (
        <>
          <div className="meeting-session">
            <span>
              {meeting.date ? formatDate(meeting.date) : "Tonight’s meeting"}
            </span>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(CODE_STORAGE);
                  window.dispatchEvent(new Event(CODE_EVENT));
                } catch {
                  /* Storage can be disabled. */
                }
                setCode("");
                setEntry("");
                setMeeting(null);
              }}
            >
              Change code
            </button>
          </div>
          {children(code!, meeting, refresh)}
        </>
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
