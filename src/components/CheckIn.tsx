"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TileFace, SuitFace } from "@/components/PlayingTile";
import MeetingAccess from "@/components/MeetingAccess";
import {
  postMeeting,
  rememberMeetingPage,
  requestError,
  type Meeting,
  type Player,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";

function CheckInForm({
  meeting,
  refresh,
}: {
  meeting: Meeting;
  refresh: () => void;
}) {
  const [computingId, setComputingId] = useState("");
  const [fullName, setFullName] = useState("");
  const [register, setRegister] = useState(false);
  const [suggestions, setSuggestions] = useState<Player[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (register) nameInput.current?.focus();
  }, [register]);

  async function submit(
    choice: { matchId?: string; createNew?: boolean } = {},
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const reply = await postMeeting(MEETING_SERVICE_URL, {
        r: register ? "players" : "checkins",
        computingId: computingId.trim(),
        ...(register ? { fullName: fullName.trim(), ...choice } : {}),
      });
      if (reply.status === 404 && !register) {
        setRegister(true);
        return;
      }
      if (reply.status === 409 && reply.suggestions?.length) {
        setSuggestions(reply.suggestions);
        return;
      }
      if (reply.status >= 400) {
        setError(reply.message || "Ask an officer to check your attendance.");
        if (reply.status === 423) refresh();
        return;
      }
      if (!reply.player)
        throw new Error("Could not confirm check-in. Please retry.");
      setPlayer(reply.player);
      rememberMeetingPage("/score/");
      setComputingId("");
      setFullName("");
      setSuggestions([]);
      refresh();
    } catch (failure) {
      setError(requestError(failure));
    } finally {
      setBusy(false);
    }
  }

  if (player)
    return (
      <div className="meeting-receipt" role="status">
        <p className="eyebrow">You’re checked in</p>
        <span className="meeting-check" aria-hidden="true">
          ✓
        </span>
        <h1>You’re in, {player.display.split(" ")[0]}.</h1>
        <p>
          You’re ready to play. After a hand, one person enters everyone’s card
          totals.
        </p>
        <div className="meeting-actions">
          <Link className="meeting-primary" href="/score/">
            Record a table
          </Link>
          <div className="meeting-quiet-actions">
            <Link href="/live/">Leaderboard</Link>
            <button
              className="meeting-text"
              type="button"
              onClick={() => {
                rememberMeetingPage("/checkin/");
                setPlayer(null);
                setRegister(false);
                setError("");
              }}
            >
              Switch player
            </button>
          </div>
        </div>
      </div>
    );
  if (!meeting.checkinsOpen)
    return (
      <div className="meeting-notice">
        <h2>Check-in has closed</h2>
        <p>
          Scores are still open for players already checked in. If you missed
          check-in, ask an officer.
        </p>
        <Link href="/score/">Record a table</Link>
      </div>
    );
  return (
    <form
      className="meeting-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {!register && !suggestions.length && (
        <>
          <h1>
            Grab a <span className="meeting-accent">seat.</span>
          </h1>
          <p className="meeting-intro">Check in, find your table, and play.</p>
          <div className="meeting-tiles" aria-hidden="true">
            {(
              [
                { suit: "dots", rank: 2 },
                { suit: "characters", rank: 1 },
                { suit: "bamboo", rank: 3 },
              ] as const
            ).map(({ suit, rank }) => (
              <span key={suit}>
                <TileFace index={rank}>
                  <SuitFace suit={suit} rank={rank} />
                </TileFace>
              </span>
            ))}
          </div>
        </>
      )}
      {register && !suggestions.length && (
        <>
          <h1>What’s your name?</h1>
          <p className="meeting-intro">
            Tell us once. If you’ve played before, we’ll keep your past scores
            together.
          </p>
        </>
      )}
      <fieldset disabled={busy}>
        <legend className="sr-only">Player check-in</legend>
        <label htmlFor="computing-id">UVA computing ID</label>
        <input
          id="computing-id"
          value={computingId}
          onChange={(event) => {
            setComputingId(event.target.value);
            setSuggestions([]);
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          pattern="[A-Za-z][A-Za-z0-9]*"
          maxLength={32}
          required
          aria-describedby="id-help"
        />
        <p className="quiet" id="id-help">
          Just the ID, for example abc1de. No @virginia.edu.
        </p>
        {register && (
          <>
            <label htmlFor="full-name">Full name</label>
            <input
              id="full-name"
              ref={nameInput}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                setSuggestions([]);
              }}
              autoComplete="off"
              maxLength={120}
              required
            />
            <p className="quiet">
              Your full name and computing ID stay in the club’s private Sheet.
            </p>
          </>
        )}
        {error && (
          <p className="meeting-error" role="alert">
            {error}
          </p>
        )}
        {suggestions.length > 0 ? (
          <div className="meeting-notice">
            <h2>Is one of these you?</h2>
            <p>
              There’s a similar name on the leaderboard. Choose it to keep your
              past scores.
            </p>
            <div className="meeting-actions">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.id}
                  onClick={() => void submit({ matchId: suggestion.id })}
                >
                  Yes, {suggestion.display}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void submit({ createNew: true })}
              >
                No, I’m new
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" className="meeting-primary">
            {busy
              ? "Checking in…"
              : register
                ? "Sign up and check in"
                : "Check in"}
          </button>
        )}
      </fieldset>
      <Link className="meeting-text" href="/live/">
        See the leaderboard ↗
      </Link>
      <p className="quiet">
        No computing ID? An officer can check you in from the Sheet.
      </p>
    </form>
  );
}
export default function CheckIn() {
  return (
    <MeetingAccess>
      {(meeting, refresh) => (
        <CheckInForm
          key={meeting.meetingId}
          meeting={meeting}
          refresh={refresh}
        />
      )}
    </MeetingAccess>
  );
}
