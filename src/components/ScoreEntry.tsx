"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MeetingAccess from "@/components/MeetingAccess";
import {
  CARD_VALUES,
  PENDING_STORAGE,
  cardTotal,
  pendingSchema,
  postMeeting,
  requestError,
  tableError,
  type Meeting,
  type Submission,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";

function CardCalculator({
  seat,
  apply,
}: {
  seat: number;
  apply: (total: string) => void;
}) {
  const [cards, setCards] = useState<number[]>([]);
  const counts = CARD_VALUES.map(
    (value) => cards.filter((card) => card === value).length,
  );
  const total = cardTotal(counts);
  return (
    <details className="card-calculator">
      <summary>Count player {seat}’s cards</summary>
      <p className="quiet">
        Tap once for each card. Face cards are 50; ace is 1.
      </p>
      <div className="card-keypad">
        {CARD_VALUES.map((value, index) => (
          <button
            key={value}
            type="button"
            aria-label={`${value === 50 ? "Face card" : value === 1 ? "Ace" : value}, ${value} points`}
            disabled={total + value > 820}
            onClick={() => setCards((previous) => [...previous, value])}
          >
            <strong>
              {value === 50 ? "J / Q / K" : value === 1 ? "A" : value}
            </strong>
            <small>
              {counts[index] ? `× ${counts[index]}` : `${value} pts`}
            </small>
          </button>
        ))}
      </div>
      <p role="status">
        Card total: <strong>{total}</strong>
      </p>
      <div className="meeting-actions">
        <button
          type="button"
          disabled={!cards.length}
          onClick={() => setCards((previous) => previous.slice(0, -1))}
        >
          Undo last card
        </button>
        <button
          type="button"
          disabled={!cards.length}
          onClick={() => setCards([])}
        >
          Clear cards
        </button>
        <button type="button" onClick={() => apply(String(total))}>
          Use {total} as ending total
        </button>
      </div>
    </details>
  );
}

function ScoreForm({
  code,
  meeting,
  refresh,
}: {
  code: string;
  meeting: Meeting;
  refresh: () => void;
}) {
  const [ids, setIds] = useState(["", "", "", ""]);
  const [totals, setTotals] = useState(["", "", "", ""]);
  const [pending, setPending] = useState<Submission | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<number | null>(null);
  const players = meeting.players || [];
  const seats = ids.map((id, index) => ({
    id,
    total: totals[index].trim() === "" ? NaN : Number(totals[index]),
  }));
  const validation = tableError(seats, players);
  const sum = seats.reduce(
    (value, seat) => value + (Number.isFinite(seat.total) ? seat.total : 0),
    0,
  );

  useEffect(() => {
    async function restore() {
      try {
        const saved = sessionStorage.getItem(PENDING_STORAGE);
        if (saved) {
          const parsed = pendingSchema.parse(JSON.parse(saved));
          setPending(parsed);
          setIds(parsed.seats.map((seat) => seat.id));
          setTotals(parsed.seats.map((seat) => String(seat.total)));
          setError(
            "There is an unconfirmed save. Retry it before recording another table.",
          );
        }
      } catch {
        setRestoreFailed(true);
        setError(
          "Could not restore the previous save. Ask an officer to check the Sheet before submitting another table.",
        );
      }
      setReady(true);
    }
    void restore();
  }, []);

  async function submit() {
    if (busy || !ready || restoreFailed) return;
    if (!pending && validation) {
      setError(validation);
      return;
    }
    const submission: Submission = pending || {
      r: "results",
      meetingId: meeting.meetingId!,
      submissionId: crypto.randomUUID(),
      seats,
    };
    if (submission.meetingId !== meeting.meetingId) {
      setError(
        "This unconfirmed save belongs to another meeting. Ask an officer to check its table in the Sheet.",
      );
      return;
    }
    try {
      sessionStorage.setItem(PENDING_STORAGE, JSON.stringify(submission));
    } catch {
      setError(
        "Your browser could not keep a safe retry receipt. Enable browser storage or ask an officer to record this table.",
      );
      return;
    }
    setPending(submission);
    setBusy(true);
    setError("");
    try {
      const reply = await postMeeting(MEETING_SERVICE_URL, code, submission);
      if (reply.status >= 400) {
        setError(
          reply.message ||
            "Could not confirm the save. Retry this table or ask an officer.",
        );
        if (reply.status === 400) {
          sessionStorage.removeItem(PENDING_STORAGE);
          setPending(null);
        }
        if ([401, 423].includes(reply.status)) refresh();
        return;
      }
      if (![200, 201].includes(reply.status) || !reply.table)
        throw new Error("Could not confirm the save. Retry this table.");
      sessionStorage.removeItem(PENDING_STORAGE);
      setPending(null);
      setReceipt(reply.table);
    } catch (failure) {
      setError(
        requestError(failure) +
          " Retry this same table; its submission ID is kept.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (receipt !== null)
    return (
      <div className="meeting-receipt" role="status">
        <p className="eyebrow">Recorded</p>
        <h2>Table {receipt} is saved.</h2>
        <p>All four results are in tonight’s score sheet.</p>
        <div className="meeting-actions">
          <button
            type="button"
            className="meeting-primary"
            onClick={() => {
              setReceipt(null);
              setIds(["", "", "", ""]);
              setTotals(["", "", "", ""]);
              setError("");
              refresh();
            }}
          >
            Record another table
          </button>
          <Link href="/leaderboard/">Official leaderboard</Link>
        </div>
      </div>
    );
  return (
    <form
      className="meeting-form score-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="meeting-lobby">
        <span>{players.length} players checked in</span>
        <button type="button" onClick={refresh} disabled={busy}>
          Refresh players
        </button>
      </div>
      {players.length < 4 && !pending && (
        <p className="meeting-notice">
          Four players need to check in before you can record a table.{" "}
          <Link href="/checkin/">Check in a player</Link>.
        </p>
      )}
      {pending && (
        <div className="meeting-notice">
          <strong>Finish the unconfirmed save first.</strong>
          <p>
            The same table and submission ID will be sent again. Its players and
            totals are locked to prevent a duplicate.
          </p>
          {pending.meetingId !== meeting.meetingId && (
            <p>
              This save belongs to a previous meeting. Ask an officer to check
              the Sheet.
            </p>
          )}
        </div>
      )}
      <fieldset disabled={busy || Boolean(pending) || !ready || restoreFailed}>
        <legend className="sr-only">Four player results</legend>
        <h2>Who played this table?</h2>
        <p className="quiet">
          Pick four players. Tap a selected name to remove it.
        </p>
        <div className="player-chips" role="group" aria-label="Table players">
          {players.map((player) => (
            <button
              type="button"
              key={player.id}
              aria-pressed={ids.includes(player.id)}
              disabled={!ids.includes(player.id) && ids.every(Boolean)}
              onClick={() => {
                const selected = ids.indexOf(player.id);
                const slot = selected === -1 ? ids.indexOf("") : selected;
                if (slot === -1) return;
                setIds((previous) =>
                  previous.map((id, i) =>
                    i === slot ? (selected === -1 ? player.id : "") : id,
                  ),
                );
                setTotals((previous) =>
                  previous.map((total, i) => (i === slot ? "" : total)),
                );
              }}
            >
              {player.display}
            </button>
          ))}
        </div>
        <p className="quiet" role="status">
          {ids.filter(Boolean).length} of 4 selected
        </p>
        <div className="score-seats">
          {ids.map((id, index) =>
            id ? (
              <div className="score-seat" key={id}>
                <h2>
                  {players.find((player) => player.id === id)?.display ||
                    `Player ${id}`}
                </h2>
                <label htmlFor={`total-${index}`}>Ending card total</label>
                <div className="score-total">
                  <input
                    id={`total-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={820}
                    step={1}
                    required
                    value={totals[index]}
                    onChange={(event) =>
                      setTotals((previous) =>
                        previous.map((value, i) =>
                          i === index ? event.target.value : value,
                        ),
                      )
                    }
                  />
                  <span>
                    Net{" "}
                    <strong>
                      {totals[index].trim() &&
                      Number.isFinite(seats[index].total)
                        ? `${seats[index].total >= 205 ? "+" : ""}${seats[index].total - 205}`
                        : "?"}
                    </strong>
                  </span>
                </div>
                <CardCalculator
                  seat={index + 1}
                  apply={(value) =>
                    setTotals((previous) =>
                      previous.map((total, i) => (i === index ? value : total)),
                    )
                  }
                />
              </div>
            ) : null,
          )}
        </div>
      </fieldset>
      <div className="score-summary" role="status">
        <span>Table total</span>
        <strong>
          {sum} <small>/ 820</small>
        </strong>
        <p>{validation || "Balanced. This table is ready to save."}</p>
      </div>
      {error && (
        <p className="meeting-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="meeting-primary"
        type="submit"
        disabled={
          busy ||
          !ready ||
          restoreFailed ||
          (!pending && Boolean(validation)) ||
          Boolean(pending && pending.meetingId !== meeting.meetingId)
        }
      >
        {busy ? "Saving table…" : pending ? "Retry this save" : "Save table"}
      </button>
      {(pending || restoreFailed) && !busy && (
        <details className="meeting-recovery">
          <summary>An officer has checked this save</summary>
          <p>
            Only start over after an officer confirms in the Sheet whether this
            table was recorded. Starting over gives the next submission a new
            ID.
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(PENDING_STORAGE);
              setPending(null);
              setRestoreFailed(false);
              setIds(["", "", "", ""]);
              setTotals(["", "", "", ""]);
              setError("");
            }}
          >
            Officer checked; start a new table
          </button>
        </details>
      )}
      <p className="quiet">
        Record each table once. For corrections after saving, ask an officer.
      </p>
      <p>
        <Link href="/checkin/">Check in someone else</Link>
      </p>
    </form>
  );
}
export default function ScoreEntry() {
  return (
    <MeetingAccess>
      {(code, meeting, refresh) => (
        <ScoreForm
          key={meeting.meetingId}
          code={code}
          meeting={meeting}
          refresh={refresh}
        />
      )}
    </MeetingAccess>
  );
}
