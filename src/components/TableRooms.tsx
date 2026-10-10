"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowBackUp, IconCheck } from "@tabler/icons-react";
import MeetingAccess from "@/components/MeetingAccess";
import {
  cleanComputingId,
  computingIdError,
  getRooms,
  lastResult,
  postMeeting,
  rememberMeetingPage,
  rememberPlayer,
  rememberResult,
  forgetResult,
  requestError,
  savedPlayer,
  type Meeting,
  type Player,
  type Room,
  type SavedResult,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";

// Matches MAX_TABLES in apps-script/Club.gs.
const MAX_TABLES = 12;
const START = 205;

function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "±0";
}

/** A saved tally. The scoresheet number is the sheet's own "Table N" block,
 * which is what an officer looks for; it rarely matches the physical table. */
function ResultCard({
  result,
  title,
  you,
}: {
  result: SavedResult;
  title: string;
  you?: string;
}) {
  return (
    <section className="result-card" aria-label={title}>
      <p className="result-head">
        <strong>{title}</strong>
        <span>
          Scoresheet Table {result.table} ·{" "}
          {new Date(result.at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </p>
      <ul>
        {result.totals.map((seat) => (
          <li key={seat.id} data-you={seat.id === you || undefined}>
            <span>
              {seat.display}
              {seat.id === you && <small> (you)</small>}
            </span>
            <span
              className="score-net"
              data-sign={Math.sign(seat.total - START)}
            >
              {signed(seat.total - START)}
            </span>
            <strong>{String(seat.total).replace("-", "−")}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A phone that didn't check in names its player by computing ID, never by picking from a list. */
function WhoAreYou({
  meeting,
  choose,
}: {
  meeting: Meeting;
  choose: (player: Player) => void;
}) {
  const [computingId, setComputingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    const id = cleanComputingId(computingId);
    const problem = computingIdError(id);
    if (problem) {
      setError(problem);
      document.getElementById("tables-computing-id")?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const reply = await postMeeting(MEETING_SERVICE_URL, {
        r: "checkins",
        computingId: id,
      });
      if (reply.status === 404) {
        setError("That ID isn’t in the club yet. Check in first to join.");
        return;
      }
      if (reply.status >= 400 || !reply.player) {
        setError(reply.message || "Ask an officer to check your attendance.");
        return;
      }
      rememberPlayer(meeting, reply.player);
      choose(reply.player);
    } catch (failure) {
      setError(requestError(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="meeting-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h1>Who’s playing on this phone?</h1>
      <p className="meeting-intro">
        Enter your computing ID so the table knows it’s you. This also checks
        you in if you haven’t yet.
      </p>
      <fieldset disabled={busy}>
        <legend className="sr-only">Your player</legend>
        <label htmlFor="tables-computing-id">UVA computing ID</label>
        <p className="field-hint" id="tables-computing-id-hint">
          The part before @virginia.edu, for example abc2de.
        </p>
        <input
          id="tables-computing-id"
          value={computingId}
          onChange={(event) => setComputingId(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? "tables-computing-id-error tables-computing-id-hint"
              : "tables-computing-id-hint"
          }
        />
        {error && (
          <p
            className="meeting-error"
            id="tables-computing-id-error"
            role="alert"
          >
            {error}
          </p>
        )}
        <button type="submit" className="meeting-primary">
          {busy ? "Finding you…" : "Continue"}
        </button>
      </fieldset>
      <Link className="meeting-text" href="/checkin/">
        New to the club? Check in first
      </Link>
    </form>
  );
}

function Lobby({
  rooms,
  busy,
  join,
  last,
  you,
}: {
  rooms: Room[];
  busy: boolean;
  join: (table: number) => void;
  last: SavedResult | null;
  you: string;
}) {
  const taken = new Set(rooms.map((room) => room.table));
  const next = Array.from({ length: MAX_TABLES }, (_, i) => i + 1).find(
    (table) => !taken.has(table),
  );
  return (
    <>
      {last && <ResultCard result={last} you={you} title="Your last result" />}
      <h1>Pick a table.</h1>
      <p className="meeting-intro">
        Sit down with three others. After each hand, anyone at the table records
        who won. No cards to count.
      </p>
      {rooms.length > 0 ? (
        <ul className="room-list" aria-label="Open tables">
          {rooms.map((room, i) => {
            const full = room.seats.length >= 4;
            return (
              <li
                key={room.table}
                className="room-card"
                data-full={full}
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="room-head">
                  <strong>Table {room.table}</strong>
                  <span>
                    {room.seats.length}/4 · {full ? "Playing" : "Open seat"}
                  </span>
                </div>
                <ul className="room-seats">
                  {[0, 1, 2, 3].map((seat) => (
                    <li key={seat} data-empty={!room.seats[seat]}>
                      {room.seats[seat]?.display || "Open seat"}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="meeting-secondary"
                  disabled={full || busy}
                  onClick={() => join(room.table)}
                >
                  {full ? "Full" : `Join Table ${room.table}`}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="meeting-notice">
          No tables yet. Open the first one and the others can join you.
        </p>
      )}
      {next && (
        <button
          type="button"
          className="meeting-primary"
          disabled={busy}
          onClick={() => join(next)}
        >
          Open Table {next}
        </button>
      )}
    </>
  );
}

function RoomView({
  room,
  player,
  busy,
  act,
}: {
  room: Room;
  player: Player;
  busy: boolean;
  act: (action: string, extra?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [winner, setWinner] = useState("");
  const [each, setEach] = useState("");
  // Pins the hands the person saw, so a hand landing mid-confirm is refused
  // rather than saved unseen.
  const [confirm, setConfirm] = useState<{
    action: "finish" | "leave" | "free";
    seat?: string;
    lastHandId: string | null;
  } | null>(null);
  const ask = (action: "finish" | "leave" | "free", seat?: string) =>
    setConfirm({ action, seat, lastHandId: room.hands.at(-1)?.id ?? null });
  // One id per hand being entered, so a retried save is recognised as the same hand.
  const handId = useRef("");
  // The newest hand when this entry began. Saving against it means a hand
  // another phone records meanwhile is caught, even after this screen refreshes.
  const seenAt = useRef<string | null | undefined>(undefined);
  const begin = () => {
    if (seenAt.current === undefined)
      seenAt.current = room.hands.at(-1)?.id ?? null;
  };
  const name = (id: string) =>
    room.seats.find((seat) => seat.id === id)?.display || `Player ${id}`;
  const amount = /^\d{1,4}$/.test(each) ? Number(each) : 0;
  const ready = room.seats.length === 4;
  const winnerSeated = room.seats.some((seat) => seat.id === winner);
  const hands = room.hands.length;
  async function saveHand() {
    if (!handId.current) handId.current = crypto.randomUUID();
    begin();
    const done = await act("hand", {
      winner,
      each: amount,
      handId: handId.current,
      lastHandId: seenAt.current,
    });
    // Either way the next save is judged against what is on screen now.
    seenAt.current = undefined;
    if (done) {
      handId.current = "";
      setWinner("");
      setEach("");
    }
  }
  return (
    <div className="room-view">
      <p className="eyebrow">
        Table {room.table} · {hands} {hands === 1 ? "hand" : "hands"} so far
      </p>
      <h1 tabIndex={-1}>Table {room.table}.</h1>
      {room.saved && (
        <ResultCard
          result={room.saved}
          you={player.id}
          title={
            hands
              ? "Last saved at this table"
              : `Saved. A fresh tally starts at ${START}.`
          }
        />
      )}
      <ul className="score-rows room-scores" aria-label="Scores at this table">
        {room.seats.map((seat, i) => {
          const total =
            room.totals.find((item) => item.id === seat.id)?.total ?? START;
          return (
            <li
              className="score-row"
              key={seat.id}
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="meeting-avatar" aria-hidden="true">
                {seat.display[0]}
              </span>
              <span className="score-name">
                <span>
                  {seat.display}
                  {seat.id === player.id && <small> (you)</small>}
                </span>
                <span
                  className="score-net"
                  data-sign={Math.sign(total - START)}
                  key={total}
                >
                  {signed(total - START)} this table
                </span>
              </span>
              <strong className="score-final" key={total}>
                {String(total).replace("-", "−")}
              </strong>
            </li>
          );
        })}
        {Array.from({ length: 4 - room.seats.length }, (_, i) => (
          <li className="score-row room-open-seat" key={`open-${i}`}>
            <span className="meeting-avatar empty" aria-hidden="true">
              ?
            </span>
            <span className="score-name">Open seat</span>
          </li>
        ))}
      </ul>

      {confirm ? (
        <section className="room-confirm" aria-labelledby="room-confirm-title">
          <h2 id="room-confirm-title">
            {confirm.action === "finish"
              ? "Save this table?"
              : confirm.action === "free"
                ? `Free ${name(confirm.seat!)}’s seat?`
                : hands
                  ? "Leave and save?"
                  : "Leave this table?"}
          </h2>
          <p>
            {confirm.action === "finish"
              ? `These totals go into the club’s scoresheet as one table. Everyone stays seated and a fresh tally starts at ${START}.`
              : `${hands ? "This saves the scores above as one table, then opens " : "This opens "}${confirm.action === "free" ? `${name(confirm.seat!)}’s seat` : "your seat"} for someone else.`}
          </p>
          <div className="meeting-actions">
            <button
              type="button"
              className="meeting-primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act(confirm.action, {
                    seat: confirm.seat,
                    lastHandId: confirm.lastHandId,
                  })
                )
                  setConfirm(null);
              }}
            >
              {busy
                ? "Saving…"
                : confirm.action === "finish"
                  ? "Save to the scoresheet"
                  : confirm.action === "free"
                    ? hands
                      ? "Save and free the seat"
                      : "Free the seat"
                    : hands
                      ? "Save and leave"
                      : "Leave table"}
            </button>
            <button
              type="button"
              className="meeting-text"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Keep playing
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="hand-form" aria-labelledby="hand-title">
            <h2 id="hand-title">Who won this hand?</h2>
            {!ready && (
              <p className="meeting-notice" role="status">
                Waiting for {4 - room.seats.length} more{" "}
                {4 - room.seats.length === 1 ? "player" : "players"}. Hands can
                be recorded once four are seated.
              </p>
            )}
            <div className="winner-grid" role="group" aria-label="Winner">
              {room.seats.map((seat) => (
                <button
                  type="button"
                  key={seat.id}
                  aria-pressed={winner === seat.id}
                  disabled={!ready || busy}
                  onClick={() => {
                    begin();
                    setWinner(winner === seat.id ? "" : seat.id);
                  }}
                >
                  <span className="meeting-avatar" aria-hidden="true">
                    {seat.display[0]}
                  </span>
                  <span>{seat.display}</span>
                  {winner === seat.id && (
                    <IconCheck size={18} stroke={3} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            <label htmlFor="hand-each">Each player pays</label>
            <input
              id="hand-each"
              className="hand-each"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="done"
              value={each}
              disabled={!ready || busy}
              aria-describedby="hand-preview"
              onChange={(event) =>
                setEach(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />
            <p className="quiet">
              Include flowers and gold. The other three each pay this amount.
            </p>
            <p id="hand-preview" className="hand-preview" role="status">
              {winnerSeated && amount
                ? `${name(winner)} ${signed(3 * amount)} · everyone else ${signed(-amount)}`
                : winnerSeated
                  ? "Now enter what each player pays."
                  : "Tap the winner, then enter what each player pays."}
            </p>
            <button
              type="button"
              className="meeting-primary"
              disabled={!ready || busy || !winnerSeated || !amount}
              onClick={() => void saveHand()}
            >
              {busy ? "Saving hand…" : "Save hand"}
            </button>
          </section>

          {hands > 0 && (
            <section className="hand-log" aria-labelledby="hand-log-title">
              <h2 id="hand-log-title">This table</h2>
              <ol reversed>
                {room.hands
                  .map((hand, i) => ({ hand, number: i + 1 }))
                  .reverse()
                  .slice(0, 6)
                  .map(({ hand, number }) => (
                    <li key={hand.id}>
                      <span>Hand {number}</span>
                      <strong>{name(hand.winner)}</strong>
                      <span>won · {hand.each} each</span>
                    </li>
                  ))}
              </ol>
              <button
                type="button"
                className="meeting-text"
                disabled={busy}
                onClick={() => void act("undo")}
              >
                <IconArrowBackUp size={18} aria-hidden="true" /> Undo hand{" "}
                {hands}
              </button>
            </section>
          )}

          <div className="room-actions">
            <button
              type="button"
              className="meeting-secondary"
              disabled={busy || !hands || !ready}
              onClick={() => ask("finish")}
            >
              End table and save
            </button>
            <button
              type="button"
              className="meeting-text"
              disabled={busy}
              onClick={() => ask("leave")}
            >
              Leave table
            </button>
          </div>
          <details className="room-free">
            <summary>Someone left without tapping Leave?</summary>
            <p className="quiet">
              Free their seat so a sub can join. Any scores so far are saved
              first.
            </p>
            <div className="meeting-quiet-actions">
              {room.seats
                .filter((seat) => seat.id !== player.id)
                .map((seat) => (
                  <button
                    type="button"
                    className="meeting-text"
                    key={seat.id}
                    disabled={busy}
                    onClick={() => ask("free", seat.id)}
                  >
                    Free {seat.display}’s seat
                  </button>
                ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function Tables({
  meeting,
  refresh,
}: {
  meeting: Meeting;
  refresh: () => void;
}) {
  const [player, setPlayer] = useState(() => savedPlayer(meeting));
  const [rooms, setRooms] = useState<Room[]>(meeting.rooms || []);
  const [busy, setBusy] = useState(false);
  // An error is shown only while the table's last save is the one it was
  // raised against; a save confirmed by a later refresh supersedes it.
  const [failure, setFailure] = useState({ text: "", at: 0 as number | null });
  const [notice, setNotice] = useState("");
  const [last, setLast] = useState(() =>
    player ? lastResult(meeting, player.id) : null,
  );
  // A failed refresh (including the 10 s timeout) is shown instead of a
  // table that silently stops changing.
  const [roomsAt, setRoomsAt] = useState(() => Date.now());
  const [roomsFailed, setRoomsFailed] = useState(false);
  const reload = usePoll(
    async (signal) => {
      try {
        const next = await getRooms(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        setRooms(next);
        setRoomsAt(Date.now());
        setRoomsFailed(false);
      } catch {
        if (!signal.aborted) setRoomsFailed(true);
      }
    },
    8000,
    [],
  );

  useEffect(() => rememberMeetingPage("/tables/"), []);
  const mine = player
    ? rooms.find((room) => room.seats.some((seat) => seat.id === player.id))
    : undefined;
  const savedAt = mine?.saved?.at ?? null;
  const setError = (text: string) => setFailure({ text, at: savedAt });
  const error = failure.at === savedAt ? failure.text : "";

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (busy || !player) return false;
    const lastHandId =
      "lastHandId" in extra
        ? (extra.lastHandId as string | null)
        : (mine?.hands.at(-1)?.id ?? null);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const reply = await postMeeting(MEETING_SERVICE_URL, {
        r: "rooms",
        action,
        meetingId: meeting.meetingId,
        playerId: player.id,
        ...extra,
        lastHandId,
      });
      if (reply.status === 409 && mine) {
        const fresh = await getRooms(MEETING_SERVICE_URL).catch(() => null);
        const room = fresh?.find((item) => item.table === mine.table);
        if (fresh) {
          setRooms(fresh);
          setRoomsAt(Date.now());
          setRoomsFailed(false);
        }
        const newest = room?.hands.at(-1);
        const sent = extra as { winner?: string; each?: number };
        if (action === "hand" && newest && newest.id !== lastHandId) {
          const seat = room!.seats.find((item) => item.id === newest.winner);
          const what = `${seat?.display ?? "Someone"} won · ${newest.each} each`;
          if (newest.winner === sent.winner && newest.each === sent.each) {
            // The same hand from another phone: treat it as done.
            setNotice(`Another phone already recorded this hand: ${what}.`);
            return true;
          }
          setError(
            `Another phone just recorded a hand (${what}). Save yours only if it was a different hand.`,
          );
          return false;
        }
        setError(
          action === "undo"
            ? "Another phone just changed this table. Check the hands below before undoing."
            : reply.message ||
                "Your table just changed. Check the latest scores.",
        );
        return false;
      }
      if (reply.status >= 400) {
        setError(reply.message || "Could not update the table. Retry.");
        if (reply.status === 409) reload();
        if (reply.status === 423) refresh();
        return false;
      }
      if (reply.rooms) {
        setRooms(reply.rooms);
        setRoomsAt(Date.now());
        setRoomsFailed(false);
      }
      if (reply.saved && mine) {
        // The server's copy is right even when this retry followed a lost
        // confirmation; the local rebuild is only a fallback.
        const result = reply.rooms?.find((room) => room.table === mine.table)
          ?.saved ?? {
          table: reply.saved,
          at: Date.now(),
          hands: mine.hands.length,
          totals: mine.seats.map((seat) => ({
            ...seat,
            total:
              mine.totals.find((item) => item.id === seat.id)?.total ?? START,
          })),
        };
        rememberResult(meeting, player.id, result);
        setLast(result);
        window.scrollTo({ top: 0 });
      }
      return true;
    } catch (failure) {
      setError(requestError(failure));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!player) return <WhoAreYou meeting={meeting} choose={setPlayer} />;
  return (
    <div className="tables-page">
      {roomsFailed && (
        <p className="room-stale" role="status">
          <span>
            Connection delayed. Last updated{" "}
            {new Date(roomsAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            .
          </span>
          <button type="button" className="meeting-text" onClick={reload}>
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p className="room-saved" role="status">
          <IconCheck size={20} stroke={3} aria-hidden="true" />
          {notice}
        </p>
      )}
      {mine ? (
        <RoomView
          // A fresh tally (after a save) starts with an empty hand form.
          key={mine.hands.length ? "tally" : "fresh"}
          room={mine}
          player={player}
          busy={busy}
          act={act}
        />
      ) : (
        <Lobby
          rooms={rooms}
          busy={busy}
          join={(table) => void act("join", { table })}
          last={last}
          you={player.id}
        />
      )}
      {error && (
        <p className="meeting-error" role="alert">
          {error}
        </p>
      )}
      <p className="quiet tables-footer">
        Playing as {player.display}{" "}
        <button
          type="button"
          className="meeting-text"
          disabled={busy || Boolean(mine)}
          onClick={() => {
            rememberPlayer(meeting, null);
            forgetResult();
            setLast(null);
            setPlayer(null);
          }}
        >
          Not you?
        </button>
      </p>
      {!mine && (
        <Link className="meeting-text" href="/score/">
          Played without a table? Enter final totals
        </Link>
      )}
    </div>
  );
}

export default function TableRooms() {
  return (
    <MeetingAccess>
      {(meeting, refresh) =>
        meeting.rooms ? (
          <Tables key={meeting.meetingId} meeting={meeting} refresh={refresh} />
        ) : (
          <div className="meeting-closed">
            <h1>Tables aren’t set up yet.</h1>
            <p>Record your table’s final totals instead.</p>
            <Link className="meeting-secondary" href="/score/">
              Record a table
            </Link>
          </div>
        )
      }
    </MeetingAccess>
  );
}
