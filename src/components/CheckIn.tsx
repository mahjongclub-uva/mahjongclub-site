"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PlayerTile from "@/components/PlayerTile";
import MeetingAccess from "@/components/MeetingAccess";
import { useConfirmedPlayer } from "@/components/ContinueAs";
import IdStickers, { IdBadge } from "@/components/IdStickers";
import {
  cleanComputingId,
  computingIdError,
  postMeeting,
  requestError,
  type Meeting,
  type Player,
  MEETING_PATHS,
  playerNext,
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
  const { player, setPlayer, prompt } = useConfirmedPlayer(meeting);
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

  if (prompt) return prompt;
  if (player) {
    const here = meeting.players || [];
    const next = playerNext(meeting, player.id);
    return (
      <div className="meeting-receipt">
        <span className="meeting-hero-tile">
          <PlayerTile id={player.id} />
        </span>
        <p className="sr-only" role="status">
          You’re checked in.
        </p>
        <h1>
          You’re in,{" "}
          <span className="meeting-accent">
            {player.display.split(" ")[0]}!
          </span>
        </h1>
        <Link className="meeting-primary" href={next.href}>
          {next.label}
        </Link>
        {here.length > 0 && (
          <section className="meeting-here" aria-labelledby="here-tonight">
            <h2 id="here-tonight">{here.length} here tonight</h2>
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
                    {p.id === player.id && (
                      <span className="sr-only"> (you)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
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
      {register ? (
        <h1>
          Hi! What’s your <span className="meeting-accent">name?</span>
        </h1>
      ) : (
        <h1>
          Who’s <span className="meeting-accent">playing?</span>
        </h1>
      )}
      <fieldset disabled={busy}>
        <legend className="sr-only">Player check-in</legend>
        {register ? (
          <div>
            <p className="sr-only" role="status">
              First time? Add your name.
            </p>
            <div className="id-chosen">
              <IdBadge value={computingId} />
              <span className="sr-only">Computing ID {computingId}</span>
              <button
                type="button"
                className="meeting-chip"
                onClick={() => {
                  setRegister(false);
                  setSuggestions([]);
                  setError("");
                  requestAnimationFrame(() =>
                    document.getElementById("computing-id")?.focus(),
                  );
                }}
              >
                Change ID
              </button>
            </div>
            <label htmlFor="full-name">Full name · officers only</label>
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
          </div>
        ) : (
          <div>
            <label htmlFor="computing-id">
              <span className="sr-only">UVA </span>Computing ID
            </label>
            <IdStickers
              id="computing-id"
              value={computingId}
              onChange={(value) => {
                setComputingId(value);
                setSuggestions([]);
                setIdError("");
              }}
              invalid={Boolean(idError)}
              describedBy={
                idError
                  ? "computing-id-error computing-id-hint"
                  : "computing-id-hint"
              }
            />
            <p className="field-hint" id="computing-id-hint">
              No ID? Ask an officer.
              <span className="sr-only">
                {" "}
                Your computing ID is the part before @virginia.edu.
              </span>
            </p>
            {idError && (
              <p className="meeting-error" id="computing-id-error">
                {idError}
              </p>
            )}
          </div>
        )}
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
            {busy
              ? "Checking in…"
              : register
                ? "Join & check in"
                : "Let’s play"}
          </button>
        )}
      </fieldset>
      {busy && suggestions.length > 0 && (
        <p className="quiet" role="status">
          Checking you in…
        </p>
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
