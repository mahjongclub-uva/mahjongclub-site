"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck, IconPlusMinus } from "@tabler/icons-react";
import { z } from "zod";
import MeetingAccess from "@/components/MeetingAccess";
import PlayerTile, { EmptyTile } from "@/components/PlayerTile";
import {
  PENDING_STORAGE,
  DRAFT_STORAGE,
  postMeeting,
  requestError,
  tableError,
  type Meeting,
  type Submission,
  MEETING_PATHS,
  seatedRoom,
} from "@/lib/meeting";
import { draftSchema, pendingSchema } from "@/lib/meetingSchemas";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { clock, signed } from "@/lib/format";

const START = 205;
// The last confirmed save, so a reload shows the receipt instead of an empty form.
const RECEIPT_STORAGE = "club-table-receipt";
const receiptSchema = draftSchema.extend({
  table: z.number().int().positive(),
  savedAt: z.string(),
});
const TABLE_TOTAL = 820;
const STEPS = ["Players", "Final totals", "Review"] as const;

/** What is still wrong with the table, in words, before the server checks it. */
function balance(totals: number[]) {
  const missing = totals.filter((total) => !Number.isFinite(total)).length;
  if (missing)
    return {
      state: "missing",
      text: `${missing} to go`,
    };
  const gap = TABLE_TOTAL - totals.reduce((sum, total) => sum + total, 0);
  if (gap > 0) return { state: "short", text: `${gap} points missing` };
  if (gap < 0) return { state: "over", text: `${-gap} points extra` };
  return { state: "ok", text: "Adds up to 820" };
}

function Steps({ current }: { current: number }) {
  return (
    <ol
      className="score-steps"
      aria-label="Recording a table"
      style={{ "--step": current } as React.CSSProperties}
    >
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === current ? "step" : undefined}
          data-done={index < current}
        >
          <span className="score-step-dot" aria-hidden="true">
            {index < current ? <IconCheck size={14} stroke={3} /> : index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function ScoreForm({
  meeting,
  refresh,
}: {
  meeting: Meeting;
  refresh: () => void;
}) {
  const [ids, setIds] = useState(["", "", "", ""]);
  const [totals, setTotals] = useState(["", "", "", ""]);
  const [phase, setPhase] = useState<"pick" | "score" | "review">("pick");
  const [pending, setPending] = useState<Submission | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState(false);
  const [receipt, setReceipt] = useState<{
    table: number;
    savedAt: string;
  } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const players = meeting.players || [];
  const seatedAt = (id: string) => seatedRoom(meeting.rooms, id)?.table;
  const seats = ids.map((id, i) => ({
    id,
    total: /^-?\d+$/.test(totals[i].trim()) ? Number(totals[i]) : NaN,
  }));
  const validation = tableError(seats, players);
  const sum = seats.reduce(
    (n, s) => n + (Number.isFinite(s.total) ? s.total : 0),
    0,
  );
  const check = balance(seats.map((seat) => seat.total));
  const locked = busy || Boolean(pending) || !ready || restoreFailed;
  const stage = pending ? "review" : phase;
  const name = (id: string) =>
    players.find((p) => p.id === id)?.display || `Player ${id}`;
  function changePhase(next: typeof phase) {
    setPhase(next);
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function setTotal(index: number, value: string) {
    setTotals(totals.map((n, i) => (i === index ? value : n)));
  }
  useEffect(() => {
    async function restore() {
      try {
        const saved = sessionStorage.getItem(PENDING_STORAGE);
        if (saved) {
          const parsed = pendingSchema.parse(JSON.parse(saved));
          setPending(parsed);
          setIds(parsed.seats.map((s) => s.id));
          setTotals(parsed.seats.map((s) => String(s.total)));
          setPhase("review");
          setError("A save wasn’t confirmed. Try it again first.");
        } else {
          const kept = receiptSchema.safeParse(
            JSON.parse(sessionStorage.getItem(RECEIPT_STORAGE) || "null"),
          );
          const draft = sessionStorage.getItem(DRAFT_STORAGE);
          if (kept.success && kept.data.meetingId === meeting.meetingId) {
            setIds(kept.data.ids);
            setTotals(kept.data.totals);
            setReceipt({ table: kept.data.table, savedAt: kept.data.savedAt });
          } else if (draft) {
            const parsed = draftSchema.safeParse(JSON.parse(draft));
            if (parsed.success && parsed.data.meetingId === meeting.meetingId) {
              setIds(parsed.data.ids);
              setTotals(parsed.data.totals);
              if (parsed.data.ids.every(Boolean)) setPhase("score");
            }
          }
        }
      } catch {
        setRestoreFailed(true);
        setError(
          "Couldn’t restore the last save. Ask an officer before saving another table.",
        );
      }
      setReady(true);
    }
    void restore();
  }, [meeting.meetingId]);
  useEffect(() => {
    if (!ready || pending || receipt !== null || restoreFailed) return;
    try {
      sessionStorage.setItem(
        DRAFT_STORAGE,
        JSON.stringify({ meetingId: meeting.meetingId, ids, totals }),
      );
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Report an external storage failure, not derived render state.
      setDraftError(true);
    }
  }, [ready, pending, receipt, restoreFailed, meeting.meetingId, ids, totals]);
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
    try {
      sessionStorage.setItem(PENDING_STORAGE, JSON.stringify(submission));
    } catch {
      setError(
        "This browser can’t keep a retry copy. Turn on storage or ask an officer.",
      );
      return;
    }
    setPending(submission);
    setBusy(true);
    setError("");
    try {
      const reply = await postMeeting(MEETING_SERVICE_URL, submission);
      if (reply.status >= 400) {
        setError(
          reply.message || "Save not confirmed. Try again or ask an officer.",
        );
        if (reply.status === 400) {
          sessionStorage.removeItem(PENDING_STORAGE);
          setPending(null);
        }
        if (reply.status === 423) refresh();
        return;
      }
      if (![200, 201].includes(reply.status) || !reply.table)
        throw new Error("Save not confirmed. Try again.");
      sessionStorage.removeItem(PENDING_STORAGE);
      setPending(null);
      // The time this browser received the confirmation, not a server clock.
      const kept = {
        table: reply.table,
        savedAt: clock(),
      };
      setReceipt(kept);
      try {
        sessionStorage.setItem(
          RECEIPT_STORAGE,
          JSON.stringify({
            meetingId: meeting.meetingId,
            ids,
            totals,
            ...kept,
          }),
        );
      } catch {
        // The receipt still shows until the page reloads.
      }
      sessionStorage.removeItem(DRAFT_STORAGE);
      refresh();
    } catch (failure) {
      setError(requestError(failure) + " Try again; it won’t save twice.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    sessionStorage.removeItem(RECEIPT_STORAGE);
    setReceipt(null);
    setIds(["", "", "", ""]);
    setTotals(["", "", "", ""]);
    setError("");
    setPhase("pick");
    refresh();
  }
  const resultRows = (
    <ul className="score-rows" aria-label="Final totals">
      {ids.map((id, i) =>
        id ? (
          <li
            className="score-row"
            key={id}
            style={{ "--i": i } as React.CSSProperties}
          >
            <PlayerTile id={id} />
            <span className="score-name">
              {name(id)}
              <span
                className="score-net"
                data-sign={Math.sign(seats[i].total - START)}
              >
                {Number.isFinite(seats[i].total)
                  ? signed(seats[i].total - START)
                  : ""}
              </span>
            </span>
            <strong className="score-final">
              {totals[i].replace("-", "−")}
            </strong>
          </li>
        ) : null,
      )}
    </ul>
  );
  if (receipt !== null)
    return (
      <div className="meeting-receipt score-receipt">
        <span className="meeting-check" aria-hidden="true">
          <IconCheck size={34} stroke={3} />
        </span>
        <h1 tabIndex={-1} ref={heading}>
          Table {receipt.table} saved
        </h1>
        <p className="meeting-intro" role="status">
          <span className="sr-only">Saved to the club’s scoresheet at </span>
          {receipt.savedAt}
        </p>
        {resultRows}
        <div className="meeting-actions">
          <Link className="meeting-primary" href={MEETING_PATHS.tonight}>
            See tonight’s standings
          </Link>
          <button type="button" className="meeting-text" onClick={reset}>
            Record another table
          </button>
        </div>
      </div>
    );
  const current = stage === "pick" ? 0 : stage === "score" ? 1 : 2;
  return (
    <div className="score-form" data-stage={stage}>
      <Steps current={current} />
      {stage !== "pick" && (
        <button
          className="meeting-text meeting-back"
          disabled={locked}
          type="button"
          onClick={() => changePhase(stage === "review" ? "score" : "pick")}
        >
          ← {stage === "review" ? "Edit totals" : "Change players"}
        </button>
      )}
      <h1 tabIndex={-1} ref={heading}>
        {stage === "pick"
          ? "Who played?"
          : stage === "score"
            ? "Final totals"
            : "All correct?"}
      </h1>
      {stage !== "review" && (
        <p className="meeting-intro">
          {stage === "pick"
            ? "Tap all four."
            : "Type each total. All four make 820."}
        </p>
      )}
      {stage === "pick" ? (
        <>
          <ol className="meeting-seats" aria-label="Seats at this table">
            {ids.map((id, i) => (
              <li
                key={`${i}-${id}`}
                className={`meeting-seat ${id ? "filled" : ""}`}
              >
                {id ? (
                  <button
                    type="button"
                    className="meeting-seat-button"
                    aria-label={`Remove ${name(id)} from table`}
                    disabled={locked}
                    onClick={() => {
                      setIds(
                        ids.map((value, index) => (index === i ? "" : value)),
                      );
                      setTotals(
                        totals.map((value, index) =>
                          index === i ? "" : value,
                        ),
                      );
                    }}
                  >
                    <PlayerTile id={id} />
                    <span>{name(id)}</span>
                    <small aria-hidden="true">Remove ×</small>
                  </button>
                ) : (
                  <>
                    <EmptyTile glyph={String(i + 1)} />
                    <span>Open seat</span>
                  </>
                )}
              </li>
            ))}
          </ol>
          <div className="meeting-lobby">
            <strong>Checked in tonight</strong>
            <span role="status">{ids.filter(Boolean).length} of 4 picked</span>
            <button
              type="button"
              className="meeting-text"
              onClick={refresh}
              disabled={busy}
            >
              Refresh
            </button>
          </div>
          {meeting.rooms && meeting.rooms.length > 0 && (
            // Tables played in the app are saved there; typing them in here
            // would count them twice.
            <p className="meeting-notice">Only for tables not in the app.</p>
          )}
          {players.length < 4 && (
            <p className="meeting-notice">
              Needs four players checked in.{" "}
              <Link href={MEETING_PATHS.checkin}>Check in</Link>
            </p>
          )}
          <div className="player-chips" role="group" aria-label="Table players">
            {players.map((player) => (
              <button
                type="button"
                key={player.id}
                disabled={
                  locked || (!ids.includes(player.id) && ids.every(Boolean))
                }
                aria-pressed={ids.includes(player.id)}
                onClick={() => {
                  const selected = ids.indexOf(player.id);
                  const slot = selected === -1 ? ids.indexOf("") : selected;
                  if (slot < 0) return;
                  setIds(
                    ids.map((id, i) =>
                      i === slot ? (selected === -1 ? player.id : "") : id,
                    ),
                  );
                  setTotals(totals.map((n, i) => (i === slot ? "" : n)));
                }}
              >
                <PlayerTile id={player.id} />
                <span>
                  {player.display}
                  {seatedAt(player.id) && (
                    <em className="chip-room">
                      at Table {seatedAt(player.id)}
                    </em>
                  )}
                </span>
                <small aria-hidden="true">
                  {ids.includes(player.id) ? <IconCheck size={16} /> : null}
                </small>
              </button>
            ))}
          </div>
          <div className="score-foot">
            <button
              className="meeting-primary"
              type="button"
              disabled={locked || !ids.every(Boolean)}
              onClick={() => changePhase("score")}
            >
              {ids.every(Boolean) ? (
                <>
                  Next <IconArrowRight aria-hidden="true" />
                </>
              ) : (
                `Pick ${4 - ids.filter(Boolean).length} more`
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          {stage === "score" ? (
            <ul className="score-rows" aria-label="Final totals">
              {ids.map((id, i) => {
                const value = totals[i];
                const total = seats[i].total;
                return (
                  <li className="score-row editing" key={id}>
                    <PlayerTile id={id} />
                    <label className="score-name" htmlFor={`total-${i}`}>
                      {name(id)}
                      <span
                        className="score-net"
                        data-sign={Math.sign(total - START)}
                      >
                        {Number.isFinite(total) ? signed(total - START) : "—"}
                      </span>
                    </label>
                    <span className="total-field">
                      <button
                        type="button"
                        className="sign-toggle"
                        aria-label={`Make ${name(id)}’s total ${value.startsWith("-") ? "positive" : "negative"}`}
                        aria-pressed={value.startsWith("-")}
                        disabled={locked}
                        onClick={() =>
                          setTotal(
                            i,
                            value.startsWith("-")
                              ? value.slice(1)
                              : `-${value}`,
                          )
                        }
                      >
                        <IconPlusMinus size={18} aria-hidden="true" />
                      </button>
                      <input
                        id={`total-${i}`}
                        inputMode="numeric"
                        enterKeyHint={i < 3 ? "next" : "done"}
                        autoComplete="off"
                        value={value}
                        disabled={locked}
                        aria-describedby="table-balance"
                        onChange={(event) => {
                          const next = event.target.value.replace(
                            /[^\d-]/g,
                            "",
                          );
                          if (/^-?\d{0,4}$/.test(next)) setTotal(i, next);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            document.getElementById(`total-${i + 1}`)?.focus();
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            resultRows
          )}
          <div className="score-foot">
            <div
              className="score-balance"
              data-state={
                validation && check.state === "ok" ? "invalid" : check.state
              }
              style={
                {
                  "--fill": Math.min(1, Math.max(0, sum / TABLE_TOTAL)),
                } as React.CSSProperties
              }
            >
              <div
                role="progressbar"
                aria-label="Table points"
                aria-valuemin={0}
                aria-valuemax={TABLE_TOTAL}
                aria-valuenow={Math.min(TABLE_TOTAL, Math.max(0, sum))}
                aria-valuetext={`${sum} of ${TABLE_TOTAL} points`}
                className="score-progress-track"
              >
                <span />
              </div>
              <p className="score-sum">
                <strong>{sum}</strong> <span>/ {TABLE_TOTAL}</span>
              </p>
              <p
                id="table-balance"
                role="status"
                className="score-balance-text"
              >
                {check.state !== "ok" ? check.text : validation || check.text}
              </p>
            </div>
            {stage === "score" ? (
              <button
                type="button"
                className="meeting-primary"
                disabled={locked || Boolean(validation)}
                onClick={() => changePhase("review")}
              >
                Review <IconArrowRight aria-hidden="true" />
              </button>
            ) : (
              <button
                className="meeting-primary"
                type="button"
                disabled={
                  busy ||
                  !ready ||
                  restoreFailed ||
                  (!pending && Boolean(validation)) ||
                  Boolean(pending && pending.meetingId !== meeting.meetingId)
                }
                onClick={() => void submit()}
              >
                {busy ? "Saving…" : pending ? "Try again" : "Save table"}
              </button>
            )}
          </div>
        </>
      )}
      {draftError && (
        <p className="quiet" role="status">
          This browser can’t keep a draft. Keep this page open.
        </p>
      )}
      {pending && (
        <p className="meeting-notice">
          Finish this save first. It resends the same table, so nothing doubles.
          {pending.meetingId !== meeting.meetingId &&
            " It’s from an earlier meeting; ask an officer."}
        </p>
      )}
      {error && (
        <p className="meeting-error" role="alert">
          {error}
        </p>
      )}
      {(pending || restoreFailed) && !busy && (
        <details className="meeting-recovery">
          <summary>An officer has checked this save</summary>
          <p>Start over only once an officer confirms whether it saved.</p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(PENDING_STORAGE);
              setPending(null);
              setRestoreFailed(false);
              reset();
            }}
          >
            Officer checked; start a new table
          </button>
        </details>
      )}
    </div>
  );
}
export default function ScoreEntry() {
  return (
    <MeetingAccess>
      {(meeting, refresh) => (
        <ScoreForm
          key={meeting.meetingId}
          meeting={meeting}
          refresh={refresh}
        />
      )}
    </MeetingAccess>
  );
}
