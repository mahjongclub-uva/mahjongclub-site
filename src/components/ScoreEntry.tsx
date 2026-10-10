"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconCards,
  IconCheck,
  IconMinus,
  IconPlus,
  IconPlusMinus,
} from "@tabler/icons-react";
import { z } from "zod";
import MeetingAccess from "@/components/MeetingAccess";
import {
  CARD_VALUES,
  PENDING_STORAGE,
  DRAFT_STORAGE,
  draftSchema,
  pendingSchema,
  postMeeting,
  requestError,
  tableError,
  rememberMeetingPage,
  type Meeting,
  type Submission,
  MEETING_PATHS,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";

const START = 205;
// The last confirmed save, so a reload shows the receipt instead of an empty form.
const RECEIPT_STORAGE = "club-table-receipt";
const receiptSchema = draftSchema.extend({
  table: z.number().int().positive(),
  savedAt: z.string(),
});
const TABLE_TOTAL = 820;
const STEPS = ["Players", "Final totals", "Review"] as const;

const cardLabel = (card: number) =>
  card === 50 ? "J / Q / K" : card === 1 ? "A" : String(card);

/** A signed net such as "+45" or "−20", with a real minus sign. */
function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "±0";
}

/** What is still wrong with the table, in words, before the server checks it. */
function balance(totals: number[]) {
  const missing = totals.filter((total) => !Number.isFinite(total)).length;
  if (missing)
    return {
      state: "missing",
      text: `${missing} ${missing === 1 ? "player still needs" : "players still need"} a final total`,
    };
  const gap = TABLE_TOTAL - totals.reduce((sum, total) => sum + total, 0);
  if (gap > 0) return { state: "short", text: `${gap} points missing` };
  if (gap < 0) return { state: "over", text: `${-gap} points extra` };
  return { state: "ok", text: "Balanced, ready to review" };
}

function CardCalculator({
  name,
  counts: initial,
  replacing,
  apply,
  close,
}: {
  name: string;
  counts: Record<number, number>;
  replacing: string;
  apply: (total: number, counts: Record<number, number>) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [counts, setCounts] = useState(initial);
  const count = (card: number) => counts[card] || 0;
  const total = CARD_VALUES.reduce((sum, card) => sum + card * count(card), 0);
  const cards = CARD_VALUES.reduce((sum, card) => sum + count(card), 0);
  const set = (card: number, next: number) =>
    setCounts({ ...counts, [card]: Math.max(0, Math.min(99, next)) });
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="meeting-calculator"
      aria-labelledby="calculator-name"
      onCancel={close}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          close();
      }}
    >
      <div className="calculator-head">
        <div>
          <p className="eyebrow">Count the cards</p>
          <h2 id="calculator-name">{name}</h2>
        </div>
        <button
          className="meeting-text"
          type="button"
          onClick={close}
          aria-label="Close calculator"
        >
          ×
        </button>
      </div>
      <p className="quiet">
        Set how many of each card {name.split(" ")[0]} is holding.
      </p>
      <ul className="card-counter" aria-label="Cards held">
        {CARD_VALUES.map((card) => (
          <li key={card} data-counted={count(card) > 0}>
            <span className="card-face" aria-hidden="true">
              {cardLabel(card)}
            </span>
            <span className="card-worth">
              {card === 1 ? "1 pt" : `${card} pts`}
            </span>
            <span className="card-stepper">
              <button
                type="button"
                aria-label={`One fewer ${cardLabel(card)}`}
                disabled={!count(card)}
                onClick={() => set(card, count(card) - 1)}
              >
                <IconMinus size={18} aria-hidden="true" />
              </button>
              <input
                aria-label={`How many ${cardLabel(card)} cards`}
                inputMode="numeric"
                pattern="[0-9]*"
                value={count(card) || ""}
                placeholder="0"
                onChange={(event) =>
                  set(card, Number(event.target.value.replace(/\D/g, "")) || 0)
                }
              />
              <button
                type="button"
                aria-label={`One more ${cardLabel(card)}`}
                onClick={() => set(card, count(card) + 1)}
              >
                <IconPlus size={18} aria-hidden="true" />
              </button>
            </span>
            <output className="card-subtotal" key={count(card)}>
              {count(card) ? card * count(card) : ""}
            </output>
          </li>
        ))}
      </ul>
      <div className="calculator-footer">
        <p className="calculator-sum" role="status">
          <span>
            {cards} {cards === 1 ? "card" : "cards"}
          </span>
          <strong key={total}>{total}</strong>
          <span>points</span>
        </p>
        {replacing && cards > 0 && (
          <p className="quiet">This replaces the total of {replacing}.</p>
        )}
        <div className="meeting-quiet-actions">
          <button
            className="meeting-text"
            type="button"
            disabled={!cards}
            onClick={() => setCounts({})}
          >
            Clear cards
          </button>
        </div>
        <button
          type="button"
          className="meeting-primary"
          disabled={!cards}
          onClick={() => apply(total, counts)}
        >
          {cards ? `Use ${total} for ${name.split(" ")[0]}` : "Add some cards"}
        </button>
      </div>
    </dialog>
  );
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
  // Keyed by player, so swapping who sits in a seat never inherits their cards.
  const [cardCounts, setCardCounts] = useState<
    Record<string, Record<number, number>>
  >({});
  const [phase, setPhase] = useState<"pick" | "score" | "review">("pick");
  const [active, setActive] = useState<number | null>(null);
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
  const calculatorTrigger = useRef<HTMLButtonElement | null>(null);
  function closeCalculator() {
    setActive(null);
    requestAnimationFrame(() => calculatorTrigger.current?.focus());
  }
  const players = meeting.players || [];
  const seatedAt = (id: string) =>
    meeting.rooms?.find((room) => room.seats.some((seat) => seat.id === id))
      ?.table;
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
  const avatar = (display: string) => (
    <span className="meeting-avatar" aria-hidden="true">
      {display[0]}
    </span>
  );
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
          setError(
            "There is an unconfirmed save. Retry it before recording another table.",
          );
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
          "Could not restore the previous save. Ask an officer to check before submitting another table.",
        );
      }
      rememberMeetingPage(MEETING_PATHS.score);
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
        "Your browser could not keep a safe retry receipt. Enable browser storage or ask an officer to record this table.",
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
          reply.message ||
            "Could not confirm the save. Retry this table or ask an officer.",
        );
        if (reply.status === 400) {
          sessionStorage.removeItem(PENDING_STORAGE);
          setPending(null);
        }
        if (reply.status === 423) refresh();
        return;
      }
      if (![200, 201].includes(reply.status) || !reply.table)
        throw new Error("Could not confirm the save. Retry this table.");
      sessionStorage.removeItem(PENDING_STORAGE);
      setPending(null);
      // The time this browser received the confirmation, not a server clock.
      const kept = {
        table: reply.table,
        savedAt: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
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
      setError(
        requestError(failure) +
          " Retry this same table; its submission ID is kept.",
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    sessionStorage.removeItem(RECEIPT_STORAGE);
    setReceipt(null);
    setIds(["", "", "", ""]);
    setTotals(["", "", "", ""]);
    setCardCounts({});
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
            {avatar(name(id))}
            <span className="score-name">
              {name(id)}
              <span
                className="score-net"
                data-sign={Math.sign(seats[i].total - START)}
              >
                {Number.isFinite(seats[i].total)
                  ? `${signed(seats[i].total - START)} this table`
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
        <p className="eyebrow">
          Scoresheet Table {receipt.table} · saved at {receipt.savedAt}
        </p>
        <h1 tabIndex={-1} ref={heading}>
          Table recorded.
        </h1>
        <p className="meeting-intro" role="status">
          All four final totals are in the club’s scoresheet.
        </p>
        {resultRows}
        <div className="meeting-actions">
          <Link className="meeting-primary" href={MEETING_PATHS.standings}>
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
          ? "Who played at this table?"
          : stage === "score"
            ? "Final card totals."
            : "One last look."}
      </h1>
      <p className="meeting-intro">
        {stage === "pick"
          ? "Tap the four people who played. Only players checked in tonight are listed."
          : stage === "score"
            ? "After your last game, type each player’s final total, or count their cards. All four add up to 820."
            : "Check these numbers with your table before you save."}
      </p>
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
                    {avatar(name(id))}
                    <span>{name(id)}</span>
                    <small aria-hidden="true">Remove ×</small>
                  </button>
                ) : (
                  <>
                    <span className="meeting-avatar empty" aria-hidden="true">
                      {i + 1}
                    </span>
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
            <p className="meeting-notice">
              Playing at a table on{" "}
              <Link href={MEETING_PATHS.tables}>Tables</Link>? Its hands are
              already saved there. Use this form only for tables played without
              one.
            </p>
          )}
          {players.length < 4 && (
            <p className="meeting-notice">
              Four players need to check in first.{" "}
              <Link href={MEETING_PATHS.checkin}>Check in a player</Link>.
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
                {avatar(player.display)}
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
              {ids.every(Boolean)
                ? "Enter final totals →"
                : `Pick ${4 - ids.filter(Boolean).length} more`}
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
                    {avatar(name(id))}
                    <label className="score-name" htmlFor={`total-${i}`}>
                      {name(id)}
                      <span
                        className="score-net"
                        data-sign={Math.sign(total - START)}
                      >
                        {Number.isFinite(total)
                          ? `${signed(total - START)} this table`
                          : "Final total?"}
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
                      <button
                        type="button"
                        className="count-cards"
                        aria-label={`Count cards for ${name(id)}`}
                        disabled={locked}
                        onClick={(event) => {
                          calculatorTrigger.current = event.currentTarget;
                          setActive(i);
                        }}
                      >
                        <IconCards size={20} aria-hidden="true" />
                      </button>
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
                {check.state !== "ok"
                  ? check.text
                  : validation ||
                    (stage === "review"
                      ? "Balanced, ready to save"
                      : check.text)}
              </p>
            </div>
            {stage === "score" ? (
              <button
                type="button"
                className="meeting-primary"
                disabled={locked || Boolean(validation)}
                onClick={() => changePhase("review")}
              >
                Review →
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
                {busy
                  ? "Saving table…"
                  : pending
                    ? "Retry this save"
                    : "Save table"}
              </button>
            )}
          </div>
        </>
      )}
      {draftError && (
        <p className="quiet" role="status">
          Your browser cannot keep this draft. Keep this page open while
          entering scores.
        </p>
      )}
      {pending && (
        <p className="meeting-notice">
          Finish the unconfirmed save first. The same table will be sent again
          to prevent a duplicate.
          {pending.meetingId !== meeting.meetingId &&
            " This save belongs to a previous meeting; ask an officer to check it."}
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
          <p>
            Only start over after an officer confirms whether this table was
            recorded.
          </p>
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
      {active !== null && (
        <CardCalculator
          key={ids[active]}
          name={name(ids[active])}
          counts={cardCounts[ids[active]] || {}}
          replacing={totals[active]}
          close={closeCalculator}
          apply={(total, counts) => {
            setTotal(active, String(total));
            setCardCounts({ ...cardCounts, [ids[active]]: counts });
            closeCalculator();
          }}
        />
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
