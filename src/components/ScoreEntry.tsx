"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";

function CardCalculator({
  name,
  initial,
  apply,
  close,
}: {
  name: string;
  initial: string;
  apply: (total: string) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initial || "0");
  const [base, setBase] = useState(Number(initial || 0));
  const [cards, setCards] = useState<number[]>([]);
  const total = value.trim() === "" ? NaN : Number(value);
  const valid = Number.isSafeInteger(total) && total >= 0 && total <= 820;
  const count = (card: number) => cards.filter((n) => n === card).length;
  const tap = (next: number[]) => {
    setCards(next);
    setValue(String(base + next.reduce((a, b) => a + b, 0)));
  };
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
          <p className="eyebrow">Count your cards</p>
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
      <p className="quiet">Enter points, or tap the cards you’re holding.</p>
      <label htmlFor="card-total">Card total</label>
      <input
        id="card-total"
        type="number"
        inputMode="numeric"
        min={0}
        max={820}
        step={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setBase(Number(e.target.value));
          setCards([]);
        }}
      />
      <div className="card-keypad">
        {CARD_VALUES.map((card) => (
          <button
            type="button"
            key={card}
            data-counted={count(card) > 0}
            disabled={!valid || total + card > 820}
            aria-label={`${card === 50 ? "Face card" : card === 1 ? "Ace" : card}, ${card} points`}
            onClick={() => tap([...cards, card])}
          >
            <strong>
              {card === 50 ? "J / Q / K" : card === 1 ? "A" : card}
            </strong>
            <small
              key={count(card)}
              className={count(card) ? "card-count" : undefined}
            >
              {count(card) ? `× ${count(card)}` : `${card} pts`}
            </small>
          </button>
        ))}
      </div>
      <div className="meeting-quiet-actions">
        <button
          className="meeting-text"
          type="button"
          disabled={!cards.length}
          onClick={() => tap(cards.slice(0, -1))}
        >
          Undo last card
        </button>
        <button
          className="meeting-text"
          type="button"
          onClick={() => {
            setCards([]);
            setBase(0);
            setValue("0");
          }}
        >
          Clear cards
        </button>
      </div>
      {!valid && (
        <p className="meeting-error" role="alert">
          Enter a whole number from 0 to 820.
        </p>
      )}
      <button
        type="button"
        className="meeting-primary"
        disabled={!valid}
        onClick={() => apply(value)}
      >
        Use {valid ? total : "these"} points
      </button>
      <p className="quiet">
        Everyone starts with 205 points. Together, your cards must add up to
        820.
      </p>
    </dialog>
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
  const [active, setActive] = useState<number | null>(null);
  const [pending, setPending] = useState<Submission | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState(false);
  const [receipt, setReceipt] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const players = meeting.players || [];
  const seats = ids.map((id, i) => ({
    id,
    total: totals[i].trim() === "" ? NaN : Number(totals[i]),
  }));
  const validation = tableError(seats, players);
  const sum = seats.reduce(
    (n, s) => n + (Number.isFinite(s.total) ? s.total : 0),
    0,
  );
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
          const draft = sessionStorage.getItem(DRAFT_STORAGE);
          if (draft) {
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
      rememberMeetingPage("/score/");
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
      setReceipt(reply.table);
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
    setReceipt(null);
    setIds(["", "", "", ""]);
    setTotals(["", "", "", ""]);
    setError("");
    setPhase("pick");
    refresh();
  }
  const scoreRows = (
    <div className="score-rows">
      {ids.map((id, i) =>
        id ? (
          <div className="score-row" key={id}>
            {avatar(name(id))}
            <span className="score-name">
              {name(id)}
              <small>
                {totals[i].trim() && Number.isFinite(seats[i].total)
                  ? `${seats[i].total >= 205 ? "+" : ""}${seats[i].total - 205} this table`
                  : "Add their card total"}
              </small>
            </span>
            {stage === "score" && receipt === null ? (
              <button
                type="button"
                className="total-button"
                disabled={locked}
                aria-label={`Count cards for ${name(id)}`}
                onClick={() => setActive(i)}
              >
                {totals[i] || "Add +"}
              </button>
            ) : (
              <strong>{totals[i]}</strong>
            )}
          </div>
        ) : null,
      )}
    </div>
  );
  if (receipt !== null)
    return (
      <div className="meeting-receipt">
        <span className="meeting-check" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Table {receipt} saved</p>
        <h1 tabIndex={-1} ref={heading}>
          Table recorded.
        </h1>
        <p className="meeting-intro" role="status">
          Everyone’s final totals are saved.
        </p>
        {scoreRows}
        <div className="meeting-actions">
          <button type="button" className="meeting-primary" onClick={reset}>
            Record another table
          </button>
          <Link className="meeting-text" href="/live/">
            See the leaderboard
          </Link>
        </div>
      </div>
    );
  return (
    <div className="score-form">
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
      <p className="eyebrow">
        {stage === "pick"
          ? "Pick your players"
          : stage === "score"
            ? "Count your cards"
            : "Ready to record"}
      </p>
      <h1 tabIndex={-1} ref={heading}>
        {stage === "pick"
          ? "Who played at this table?"
          : stage === "score"
            ? "Cards on the table."
            : "One last look."}
      </h1>
      {stage !== "pick" && (
        <p className="meeting-intro">
          {stage === "score"
            ? "Enter final card totals after your last game."
            : "Check these totals with your table."}
        </p>
      )}
      {stage === "pick" ? (
        <>
          <div className="meeting-seats">
            {ids.map((id, i) => (
              <div
                key={`${i}-${id}`}
                className={`meeting-seat ${id ? "filled" : ""}`}
              >
                {avatar(id ? name(id) : String(i + 1))}
                <span>{id ? name(id) : "Open seat"}</span>
              </div>
            ))}
          </div>
          <div className="meeting-lobby">
            <strong>Tonight’s players</strong>
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
          {players.length < 4 && (
            <p className="meeting-notice">
              Four players need to check in first.{" "}
              <Link href="/checkin/">Check in a player</Link>.
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
                <span>{player.display}</span>
                <small aria-hidden="true">
                  {ids.includes(player.id) ? "✓" : ""}
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
              Count cards →
            </button>
          </div>
        </>
      ) : (
        <>
          {scoreRows}
          <div className="score-foot">
            <div className="score-progress" data-balanced={!validation}>
              <div
                role="progressbar"
                aria-label="Table points"
                aria-valuemin={0}
                aria-valuemax={820}
                aria-valuenow={Math.min(820, Math.max(0, sum))}
                aria-valuetext={`${sum} of 820 points${sum > 820 ? ", over total" : ""}`}
                className="score-progress-track"
              >
                <span
                  style={{
                    transform: `scaleX(${Math.min(1, Math.max(0, sum / 820))})`,
                  }}
                />
              </div>
            </div>
            <div className="score-summary" data-balanced={!validation}>
              <span>Table total</span>
              <strong>
                {sum} <small>/ 820</small>
              </strong>
              <p role="status">{validation || "✓ Balanced. Ready to save."}</p>
            </div>
            {stage === "score" ? (
              <button
                type="button"
                className="meeting-primary"
                disabled={locked || Boolean(validation)}
                onClick={() => changePhase("review")}
              >
                Check scores →
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
          initial={totals[active]}
          close={() => setActive(null)}
          apply={(value) => {
            setTotals(totals.map((n, i) => (i === active ? value : n)));
            setActive(null);
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
