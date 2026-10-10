"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import { TileFace, SuitFace } from "@/components/PlayingTile";
import MeetingAccess from "@/components/MeetingAccess";
import {
  postMeeting,
  rememberMeetingPage,
  rememberPlayer,
  savedPlayer,
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
  const matchHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (suggestions.length) matchHeading.current?.focus();
  }, [suggestions]);
  const [player, setPlayerState] = useState(() => savedPlayer(meeting));
  function setPlayer(next: Player | null) {
    setPlayerState(next);
    rememberPlayer(meeting, next);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      rememberMeetingPage(meeting.rooms ? "/tables/" : "/score/");
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

  if (player) {
    const here = meeting.players || [];
    return (
      <div className="meeting-receipt">
        <span className="meeting-check" aria-hidden="true">
          <IconCheck size={34} stroke={3} />
        </span>
        <p className="eyebrow" role="status">
          You’re checked in
        </p>
        <h1>You’re in, {player.display.split(" ")[0]}.</h1>
        <p>
          {meeting.rooms
            ? "Join a table of four. After each hand, anyone at the table records who won."
            : "Find a table of four. After your last game, one person records the table’s final totals."}
        </p>
        {here.length > 0 && (
          <section className="meeting-here" aria-label="Here tonight">
            <h2>
              Here tonight <span>{here.length}</span>
            </h2>
            <ul>
              {here.map((p, i) => (
                <li
                  key={p.id}
                  data-you={p.id === player.id || undefined}
                  style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                >
                  {p.display}
                  {p.id === player.id && <small> (you)</small>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="meeting-actions">
          <Link
            className="meeting-primary"
            href={meeting.rooms ? "/tables/" : "/score/"}
          >
            {meeting.rooms ? "Find a table" : "Record a table"}
          </Link>
          <div className="meeting-quiet-actions">
            <Link className="meeting-text" href="/live/">
              Leaderboard
            </Link>
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
  }
  if (!meeting.checkinsOpen)
    return (
      <div className="meeting-closed">
        <h1>Check-in has closed</h1>
        <p>
          Scores are still open for players already checked in. If you missed
          check-in, ask an officer.
        </p>
        <Link className="meeting-secondary" href="/score/">
          Record a table
        </Link>
      </div>
    );
  return (
    <form
      className="meeting-form"
      data-register={register}
      data-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        if (!suggestions.length) void submit();
      }}
    >
      <h1>Grab a seat.</h1>
      <ol className="meeting-howto" aria-label="How tonight works">
        <li>
          <span aria-hidden="true">1</span>Check in
        </li>
        <li>
          <span aria-hidden="true">2</span>Play at a table of four
        </li>
        <li>
          <span aria-hidden="true">3</span>One person records the scores
        </li>
      </ol>
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
      <fieldset disabled={busy}>
        <legend className="sr-only">Player check-in</legend>
        <div>
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
          />
          {register && (
            <>
              <p className="quiet" role="status">
                First time? Add your name.
              </p>
              <label htmlFor="full-name">Full name</label>
              <input
                id="full-name"
                autoFocus
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setSuggestions([]);
                }}
                autoComplete="name"
                maxLength={120}
                required
              />
              <p className="quiet">
                Use the name the club already knows you by. Your name and ID
                stay private.
              </p>
            </>
          )}
        </div>
        {error && (
          <p className="meeting-error" role="alert">
            {error}
          </p>
        )}
        {suggestions.length > 0 ? (
          <div className="meeting-matches">
            <h2 ref={matchHeading} tabIndex={-1}>
              {suggestions.length === 1
                ? `Are you ${suggestions[0].display}?`
                : "Is one of these you?"}
            </h2>
            <p className="quiet">Keep your past scores.</p>
            <div className="meeting-actions">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  className="meeting-secondary"
                  key={suggestion.id}
                  onClick={() => void submit({ matchId: suggestion.id })}
                >
                  {suggestions.length === 1
                    ? "Yes, that’s me"
                    : suggestion.display}
                </button>
              ))}
              <button
                type="button"
                className="meeting-text"
                onClick={() => void submit({ createNew: true })}
              >
                No, I’m new
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" className="meeting-primary">
            {busy ? "Checking in…" : register ? "Join & check in" : "Check in"}
          </button>
        )}
      </fieldset>
      {busy && suggestions.length > 0 && (
        <p className="quiet" role="status">
          Checking you in…
        </p>
      )}
      {register && (
        <button
          className="meeting-text"
          type="button"
          disabled={busy}
          onClick={() => {
            setRegister(false);
            setSuggestions([]);
            setError("");
            requestAnimationFrame(() =>
              document.getElementById("computing-id")?.focus(),
            );
          }}
        >
          Use a different ID
        </button>
      )}
      <p className="quiet">No UVA ID? Ask an officer.</p>
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
