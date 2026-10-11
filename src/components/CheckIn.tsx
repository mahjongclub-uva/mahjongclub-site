"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TileFace, SuitFace } from "@/components/PlayingTile";
import PlayerTile from "@/components/PlayerTile";
import MeetingAccess from "@/components/MeetingAccess";
import ContinueAs from "@/components/ContinueAs";
import {
  cleanComputingId,
  computingIdError,
  postMeeting,
  rememberMeetingPage,
  playerConfirmed,
  rememberPlayer,
  savedPlayer,
  requestError,
  type Meeting,
  type Player,
  MEETING_PATHS,
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
  const [idError, setIdError] = useState("");
  const [fullName, setFullName] = useState("");
  const [register, setRegister] = useState(false);
  const [suggestions, setSuggestions] = useState<Player[]>([]);
  const matchHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (suggestions.length) matchHeading.current?.focus();
  }, [suggestions]);
  const [player, setPlayerState] = useState(() => savedPlayer(meeting));
  const [confirmed, setConfirmed] = useState(() => playerConfirmed());
  const seatedAt = meeting.rooms?.find((room) =>
    room.seats.some((seat) => seat.id === player?.id),
  )?.table;
  function setPlayer(next: Player | null) {
    setPlayerState(next);
    // Checking in, or switching away, is an explicit identity choice.
    setConfirmed(Boolean(next));
    rememberPlayer(meeting, next);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(
    choice: { matchId?: string; createNew?: boolean } = {},
  ) {
    if (busy) return;
    const id = cleanComputingId(computingId);
    const problem = computingIdError(id);
    setIdError(problem || "");
    if (problem) {
      document.getElementById("computing-id")?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const reply = await postMeeting(MEETING_SERVICE_URL, {
        r: register ? "players" : "checkins",
        computingId: id,
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
      rememberMeetingPage(
        meeting.rooms ? MEETING_PATHS.tables : MEETING_PATHS.score,
      );
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

  if (player && !confirmed)
    return (
      <ContinueAs
        player={player}
        yes={() => {
          rememberPlayer(meeting, player);
          setConfirmed(true);
        }}
        no={() => setPlayer(null)}
      />
    );
  if (player) {
    const here = meeting.players || [];
    return (
      <div className="meeting-receipt">
        <span className="meeting-hero-tile">
          <PlayerTile id={player.id} />
        </span>
        <p className="eyebrow" role="status">
          You’re checked in
        </p>
        <h1>
          You’re in,{" "}
          <span className="meeting-accent">
            {player.display.split(" ")[0]}!
          </span>
        </h1>
        <p>
          {seatedAt
            ? `You’re seated at Table ${seatedAt}.`
            : meeting.rooms
              ? "Sit at a table of four. After each game, anyone at the table records who won."
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
                  <PlayerTile id={p.id} />
                  <span>
                    {p.display}
                    {p.id === player.id && <small> (you)</small>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="meeting-actions">
          <Link
            className="meeting-primary"
            href={
              seatedAt
                ? MEETING_PATHS.table(seatedAt)
                : meeting.rooms
                  ? MEETING_PATHS.tables
                  : MEETING_PATHS.score
            }
          >
            {seatedAt
              ? `Return to Table ${seatedAt}`
              : meeting.rooms
                ? "Find a table"
                : "Record a table"}
          </Link>
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
        <Link className="meeting-secondary" href={MEETING_PATHS.score}>
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
          <span aria-hidden="true">2</span>Sit at a table of four
        </li>
        <li>
          <span aria-hidden="true">3</span>
          {meeting.rooms
            ? "Record each game at the table"
            : "One person records the scores"}
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
          <p className="field-hint" id="computing-id-hint">
            The part before @virginia.edu, for example abc2de. No UVA ID? An
            officer can check you in.
          </p>
          <input
            id="computing-id"
            value={computingId}
            onChange={(event) => {
              setComputingId(event.target.value);
              setSuggestions([]);
              setIdError("");
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
            aria-invalid={Boolean(idError)}
            aria-describedby={
              idError
                ? "computing-id-error computing-id-hint"
                : "computing-id-hint"
            }
          />
          {idError && (
            <p className="meeting-error" id="computing-id-error">
              {idError}
            </p>
          )}
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
                Use the name the club already knows you by. Your full name and
                computing ID stay private; the leaderboard shows your first name
                and last initial.
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
