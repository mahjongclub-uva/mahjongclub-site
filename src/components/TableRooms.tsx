"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArmchair,
  IconArrowBackUp,
  IconArrowRight,
  IconChevronRight,
  IconCheck,
  IconCrown,
  IconEraser,
  IconFlame,
  IconFlag,
  IconHistory,
  IconPencil,
  IconPlayerPlay,
  IconTrophy,
} from "@tabler/icons-react";
import MeetingAccess from "@/components/MeetingAccess";
import { useConfirmedPlayer } from "@/components/ContinueAs";
import IdStickers from "@/components/IdStickers";
import Sheet from "@/components/Sheet";
import PlayerTile, { EmptyTile } from "@/components/PlayerTile";
import { BACKS } from "@/lib/avatar";
import {
  cleanComputingId,
  computingIdError,
  actionLanded,
  getRooms,
  keepRooms,
  MAX_TABLES,
  MEETING_PATHS,
  postMeeting,
  requestError,
  WINDS,
  type Meeting,
  type Player,
  type Room,
  seatedRoom,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";
import { clock, minus, signed } from "@/lib/format";

const START = 205;
// Unsaved game entry, restored only if the table has not changed since.
const GAME_DRAFT = "club-game-draft";

/** A phone that didn't check in names its player by computing ID, never by picking from a list. */
function WhoAreYou({ choose }: { choose: (player: Player) => void }) {
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
      <fieldset disabled={busy}>
        <legend className="sr-only">Your player</legend>
        <label htmlFor="tables-computing-id">
          <span className="sr-only">UVA </span>Computing ID
        </label>
        <IdStickers
          id="tables-computing-id"
          value={computingId}
          onChange={setComputingId}
          invalid={Boolean(error)}
          describedBy={
            error
              ? "tables-computing-id-error tables-computing-id-hint"
              : "tables-computing-id-hint"
          }
        />
        <p className="field-hint" id="tables-computing-id-hint">
          No ID? Ask an officer.
          <span className="sr-only">
            {" "}
            Your computing ID is the part before @virginia.edu.
          </span>
        </p>
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
      <Link className="meeting-text" href={MEETING_PATHS.checkin}>
        New to the club? Check in first
      </Link>
    </form>
  );
}

type Ended = NonNullable<Room["ended"]>;

/** The final totals of a session this player was part of. */
function EndedReceipt({
  ended,
  room,
  you,
}: {
  ended: Ended;
  room: number;
  you: string;
}) {
  return (
    <section className="result-card" aria-label="Your last table">
      <p className="result-head">
        <strong>Table {room} ended</strong>
        <span>
          {ended.by === "Scoring closed"
            ? "Scoring closed"
            : `Ended by ${ended.by}`}{" "}
          at {clock(ended.at)} · {ended.games}{" "}
          {ended.games === 1 ? "game" : "games"}
        </span>
      </p>
      <ul>
        {ended.totals.map((seat) => (
          <li key={seat.id} data-you={seat.id === you || undefined}>
            <span>
              {seat.display}
              {seat.id === you && <small> (you)</small>}
            </span>
            <span className="delta" data-sign={Math.sign(seat.total - START)}>
              {signed(seat.total - START)}
            </span>
            <strong>{minus(seat.total)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

const WIND_GLYPHS = ["東", "南", "西", "北"];

/** The winner's moment: a sticker and a small burst of tiles from their seat. */
function Cheer({ you }: { you: boolean }) {
  return (
    <span className="seat-cheer" aria-hidden="true">
      <b>{you ? "You won!" : "Winner!"}</b>
      <span className="seat-burst">
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (i / 10) * 2 * Math.PI;
          const reach = 46 + (i % 3) * 14;
          return (
            <i
              key={i}
              style={
                {
                  "--x": `${Math.round(Math.cos(angle) * reach)}px`,
                  "--y": `${Math.round(Math.sin(angle) * reach)}px`,
                  "--spin": `${i % 2 ? 160 : -160}deg`,
                  "--c": Object.values(BACKS)[i % 5],
                } as React.CSSProperties
              }
            />
          );
        })}
      </span>
    </span>
  );
}

/**
 * The physical table as a square of seats, East at the bottom and the winds
 * going counter-clockwise as at a mahjong table. Every phone draws the same
 * picture, so a wind names one real chair for the whole group; an open chair
 * shows its wind, a taken one its player's tile.
 */
function TableSquare({
  room,
  table,
  you,
  canSit,
  busy,
  sit,
  tapOwn,
  pick,
  cheer,
}: {
  room: Room | undefined;
  table: number;
  you: string;
  canSit: boolean;
  busy: boolean;
  sit?: (wind: number) => void;
  tapOwn?: () => void;
  // In the game sheet, any occupied tile is chosen as the winner.
  pick?: { winner: string; choose: (id: string) => void };
  // The winner of a game that was just saved, while their moment lasts.
  cheer?: string;
}) {
  const latest = room?.hands.at(-1);
  const games = room?.hands.length ?? 0;
  const totalOf = (id: string) =>
    room?.totals.find((item) => item.id === id)?.total ?? START;
  // The crown goes to whoever is ahead; nobody wears it while all are level.
  const scores = room?.seats.map((seat) => totalOf(seat.id)) ?? [];
  const top = Math.max(...scores);
  const crowned =
    games > 0 && scores.some((score) => score !== top) ? top : null;
  // How many games in a row the latest winner has taken.
  let streak = 0;
  for (const hand of [...(room?.hands ?? [])].reverse()) {
    if (hand.winner !== latest?.winner) break;
    streak++;
  }
  return (
    <div
      className="table-square"
      role="group"
      aria-label={pick ? "Who won?" : `Seats at Table ${table}`}
    >
      <div className="table-top" aria-hidden="true">
        <span>Game</span>
        <strong>{games + 1}</strong>
      </div>
      {WINDS.map((wind, i) => {
        const seat = room?.seats.find((item) => item.wind === i);
        const total = seat ? totalOf(seat.id) : 0;
        const own = seat?.id === you;
        const leads = !pick && seat && crowned !== null && total === crowned;
        const lastWin = !pick && seat && latest?.winner === seat.id;
        const hot = lastWin && streak >= 2;
        // The glow belongs to the winner's moment, so it fades with the cheer.
        const cheering = (!pick && seat && cheer === seat.id) || undefined;
        const standing = `${leads ? ", leading" : ""}${hot ? `, ${streak} wins in a row` : ""}`;
        const body = (
          <>
            <span className="seat-tile" data-glow={cheering}>
              {seat ? (
                <PlayerTile id={seat.id} />
              ) : (
                <EmptyTile glyph={WIND_GLYPHS[i]} />
              )}
              {leads && (
                <span className="seat-crown" aria-hidden="true">
                  <IconCrown />
                </span>
              )}
              {hot && (
                <span className="seat-streak" aria-hidden="true">
                  <IconFlame />×{streak}
                </span>
              )}
            </span>
            {cheering && <Cheer you={own} />}
            <span className="seat-name">
              {seat ? seat.display : canSit && !pick ? "Sit here" : "Open"}
              {own && <small> you</small>}
            </span>
            {seat && games > 0 && !pick && (
              // Keyed by the latest game, so a new game settles in.
              <span className="seat-total" key={latest?.id}>
                {minus(total)}
              </span>
            )}
          </>
        );
        const label = `${wind}: ${seat ? seat.display : "open seat"}${standing}`;
        if (pick && seat)
          return (
            <button
              type="button"
              className="seat"
              data-wind={wind}
              data-cheer={cheering}
              key={wind}
              aria-pressed={pick.winner === seat.id}
              aria-label={`${seat.display} won`}
              onClick={() =>
                pick.choose(pick.winner === seat.id ? "" : seat.id)
              }
            >
              {body}
            </button>
          );
        if (!pick && !seat && canSit)
          return (
            <button
              type="button"
              className="seat"
              data-wind={wind}
              data-empty
              key={wind}
              disabled={busy}
              aria-label={`Sit here, ${wind} seat`}
              onClick={() => sit?.(i)}
            >
              {body}
            </button>
          );
        if (!pick && own)
          return (
            <button
              type="button"
              className="seat"
              data-wind={wind}
              data-cheer={cheering}
              data-you
              key={wind}
              disabled={busy}
              aria-label={`Your seat, ${wind}${standing}. ${games ? "End the table to change groups." : "Tap to leave."}`}
              onClick={tapOwn}
            >
              {body}
            </button>
          );
        return (
          <div
            className="seat"
            data-wind={wind}
            data-cheer={cheering}
            data-empty={!seat || undefined}
            key={wind}
            aria-label={label}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}

type Draft = {
  meetingId: string;
  table: number;
  session: number;
  lastHandId: string | null;
  winner: string;
  each: string;
  handId: string;
};

/** Each seat's change and where it leaves them. Without `change`, the
 * change is the whole table's net so far. */
function ChangeRows({
  room,
  change,
  winner,
  ranked = false,
}: {
  room: Room;
  change?: (id: string) => number;
  winner?: string;
  // Sort by total and number the places, as at the end of a table.
  ranked?: boolean;
}) {
  const total = (id: string) =>
    room.totals.find((item) => item.id === id)?.total ?? START;
  const delta = (id: string) => (change ? change(id) : total(id) - START);
  const after = (id: string) => total(id) + (change ? change(id) : 0);
  const seats = ranked
    ? [...room.seats].sort((a, b) => after(b.id) - after(a.id))
    : room.seats;
  // Equal totals share a place.
  const place = (id: string) =>
    seats.findIndex((seat) => after(seat.id) === after(id)) + 1;
  return (
    <ul className="change-rows" data-ranked={ranked || undefined}>
      {seats.map((seat) => (
        <li key={seat.id} data-winner={seat.id === winner || undefined}>
          {ranked && (
            <span
              className="change-place"
              aria-label={`Place ${place(seat.id)}`}
            >
              {place(seat.id)}
            </span>
          )}
          <PlayerTile id={seat.id} />
          <span>{seat.display}</span>
          <span className="delta" data-sign={Math.sign(delta(seat.id))}>
            {signed(delta(seat.id))}
          </span>
          <strong>{minus(after(seat.id))}</strong>
        </li>
      ))}
    </ul>
  );
}

/** A player's moment, up top: their tile, a cheer, and what they gained. */
function WinCard({
  id,
  title,
  gain,
  children,
}: {
  id: string;
  title: string;
  gain: number;
  children?: string;
}) {
  return (
    <div className="confirm-win">
      <PlayerTile id={id} />
      <p>
        <strong>{title}</strong>
        <span>
          <b className="delta" data-sign="1">
            +{gain}
          </b>
          {children}
        </span>
      </p>
    </div>
  );
}

/** What a seated player does at the table: one screen, tasks in sheets. */
function SeatedTable({
  meeting,
  room,
  player,
  busy,
  offline,
  error,
  act,
}: {
  meeting: Meeting;
  room: Room;
  player: Player;
  busy: boolean;
  offline: boolean;
  error: string;
  act: (action: string, extra?: Record<string, unknown>) => Promise<boolean>;
}) {
  const last = room.hands.at(-1)?.id ?? null;
  // One draft per table session and game; anything else is discarded with a note.
  const [kept] = useState<Draft | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(GAME_DRAFT) || "null");
    } catch {
      return null; // No draft to restore.
    }
  });
  const thisTable =
    kept?.meetingId === meeting.meetingId && kept.table === room.table;
  const current =
    thisTable && kept.session === room.session && kept.lastHandId === last;
  const [draft, setDraft] = useState<Draft>(() => ({
    meetingId: meeting.meetingId!,
    table: room.table,
    session: room.session,
    lastHandId: last,
    winner: current ? kept.winner : "",
    each: current ? kept.each : "",
    handId: current ? kept.handId : "",
  }));
  const [stale, setStale] = useState(() =>
    Boolean(thisTable && kept.winner && !current),
  );
  const clearDraft = () =>
    setDraft({ ...draft, winner: "", each: "", handId: "" });
  const [layer, setLayer] = useState<null | "game" | "games" | "end">(null);
  const [step, setStep] = useState<"entry" | "review">("entry");
  useEffect(() => {
    try {
      if (draft.winner || draft.each)
        localStorage.setItem(GAME_DRAFT, JSON.stringify(draft));
      else localStorage.removeItem(GAME_DRAFT);
    } catch {
      /* The entry stays on screen; it just won't survive a reload. */
    }
  }, [draft]);
  const name = (id: string) =>
    room.seats.find((seat) => seat.id === id)?.display || `Player ${id}`;
  const amount = /^\d{1,4}$/.test(draft.each) ? Number(draft.each) : 0;
  const ready = room.seats.length === 4;
  const winnerSeated = room.seats.some((seat) => seat.id === draft.winner);
  const games = room.hands.length;
  const entering = Boolean(draft.winner || draft.each);
  // Whoever is clearly ahead when the table ends; nobody on a tie.
  const standings = room.totals
    .filter((item) => room.seats.some((seat) => seat.id === item.id))
    .sort((a, b) => b.total - a.total);
  const topOfTable =
    standings[0] &&
    standings[0].total > START &&
    standings[0].total !== standings[1]?.total
      ? standings[0]
      : undefined;
  const gain = (winner: string, each: number) => (id: string) =>
    id === winner ? 3 * each : -each;
  const set = (patch: Partial<Draft>) => {
    setStale(false);
    setDraft({
      ...draft,
      ...patch,
      lastHandId: entering ? draft.lastHandId : last,
    });
  };
  // After a refused save, the person has seen what changed; a deliberate
  // second save is then judged against the table now on screen.
  const reanchor = useRef(false);
  async function saveGame() {
    // Judged against the table as it was when this entry began, with the
    // game ID fixed at Review so every retry is recognised as the same game.
    const done = await act("hand", {
      winner: draft.winner,
      each: amount,
      handId: draft.handId,
      lastHandId: reanchor.current ? last : draft.lastHandId,
    });
    reanchor.current = !done;
    if (done) {
      setStale(false);
      setStep("entry");
      setLayer(null);
      clearDraft();
    }
  }
  const latest = room.hands.at(-1);
  const errorLine = error && (
    <p className="meeting-error" role="alert">
      {error}
    </p>
  );
  return (
    <>
      {latest ? (
        <p className="table-latest" role="status">
          <span key={latest.id}>
            Game {games}: <b>{name(latest.winner)}</b> won {3 * latest.each}
          </span>
        </p>
      ) : (
        <p className="table-latest">
          <span>
            {ready
              ? "All four seats are taken. Record each game as you finish it."
              : `Waiting for ${4 - room.seats.length} more ${4 - room.seats.length === 1 ? "player" : "players"}. Tap your tile to leave.`}
          </span>
        </p>
      )}
      {stale && (
        <p className="quiet" role="status">
          Another phone saved a game while you were away, so your unsaved entry
          was cleared.
        </p>
      )}
      <div className="table-actions">
        <button
          type="button"
          className="meeting-primary"
          disabled={!ready}
          onClick={() => {
            setStep(winnerSeated && amount ? "review" : "entry");
            setLayer("game");
          }}
        >
          {entering ? "Finish recording" : "Record results"}
        </button>
        <div className="table-links">
          {games > 0 && (
            <button
              type="button"
              className="meeting-chip"
              onClick={() => setLayer("games")}
            >
              <IconHistory size={20} aria-hidden="true" />
              History
            </button>
          )}
          {(games > 0 || ready) && (
            <button
              type="button"
              className="meeting-chip"
              onClick={() => setLayer("end")}
            >
              <IconFlag size={20} aria-hidden="true" />
              End table
            </button>
          )}
        </div>
        {games > 0 && (
          <Link className="table-standings" href={MEETING_PATHS.tonight}>
            <IconTrophy aria-hidden="true" />
            Tonight’s standings
            <IconChevronRight aria-hidden="true" />
          </Link>
        )}
      </div>

      {layer === "game" && (
        <Sheet
          title={step === "review" ? "Confirm" : `Game ${games + 1}`}
          close={() => setLayer(null)}
        >
          {step === "entry" ? (
            <>
              <TableSquare
                room={room}
                table={room.table}
                you={player.id}
                canSit={false}
                busy={busy}
                pick={{
                  winner: draft.winner,
                  choose: (winner) => set({ winner }),
                }}
              />
              <label htmlFor="hand-each">Each other player pays</label>
              <input
                id="hand-each"
                className="hand-each"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                value={draft.each}
                onChange={(event) =>
                  set({
                    each: event.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
              />
              <details className="meeting-more">
                <summary>What counts?</summary>
                <p>
                  Include flowers and gold. The winner gains three times this.
                </p>
              </details>
              <div className="calculator-footer">
                <button
                  type="button"
                  className="meeting-primary"
                  disabled={!winnerSeated || !amount}
                  onClick={() => {
                    if (!draft.handId) set({ handId: crypto.randomUUID() });
                    setStep("review");
                  }}
                >
                  {!winnerSeated
                    ? "Tap the winner"
                    : !amount
                      ? "Enter what each pays"
                      : "Review game"}
                </button>
                {entering && (
                  <button
                    type="button"
                    className="meeting-chip"
                    onClick={clearDraft}
                  >
                    <IconEraser aria-hidden="true" /> Clear
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <WinCard
                id={draft.winner}
                title={
                  draft.winner === player.id
                    ? "You win!"
                    : `${name(draft.winner)} wins!`
                }
                gain={3 * amount}
              />
              <ChangeRows
                room={room}
                change={gain(draft.winner, amount)}
                winner={draft.winner}
              />
              {errorLine}
              <div className="calculator-footer">
                <button
                  type="button"
                  className="meeting-primary"
                  disabled={busy || offline}
                  onClick={() => void saveGame()}
                >
                  {busy
                    ? "Saving game…"
                    : offline
                      ? "Waiting for connection"
                      : "Save results"}
                </button>
                <button
                  type="button"
                  className="meeting-chip"
                  disabled={busy}
                  onClick={() => setStep("entry")}
                >
                  <IconPencil aria-hidden="true" /> Edit
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}

      {layer === "games" && (
        <Sheet title="History" close={() => setLayer(null)}>
          <ol className="game-rows" reversed>
            {[...room.hands].reverse().map((hand, i) => (
              <li key={hand.id}>
                <span className="game-number">Game {games - i}</span>
                <PlayerTile id={hand.winner} />
                <span className="game-winner">
                  {hand.winner === player.id ? "You" : name(hand.winner)}
                  <small>won {hand.each} from each</small>
                </span>
                <strong className="delta" data-sign="1">
                  +{3 * hand.each}
                </strong>
              </li>
            ))}
          </ol>
          {errorLine}
          <div className="calculator-footer">
            <button
              type="button"
              className="meeting-chip"
              disabled={busy || offline}
              onClick={() => void act("undo")}
            >
              <IconArrowBackUp size={18} aria-hidden="true" /> Undo game {games}
            </button>
          </div>
        </Sheet>
      )}

      {layer === "end" && (
        <Sheet title={`End Table ${room.table}?`} close={() => setLayer(null)}>
          {entering && (
            <div className="end-unsaved" role="status">
              <p>A game on this phone isn’t saved yet.</p>
              <div>
                <button
                  type="button"
                  className="meeting-chip"
                  onClick={() => setLayer("game")}
                >
                  <IconPencil aria-hidden="true" /> Finish it
                </button>
                <button
                  type="button"
                  className="meeting-chip"
                  onClick={() => {
                    clearDraft();
                    setStep("entry");
                  }}
                >
                  <IconEraser aria-hidden="true" /> Clear it
                </button>
              </div>
            </div>
          )}
          {games > 0 ? (
            <>
              {topOfTable && (
                <WinCard
                  id={topOfTable.id}
                  title={
                    topOfTable.id === player.id
                      ? "You top the table!"
                      : `${name(topOfTable.id)} tops the table!`
                  }
                  gain={topOfTable.total - START}
                >
                  {` after ${games} ${games === 1 ? "game" : "games"}`}
                </WinCard>
              )}
              <ChangeRows room={room} ranked />
            </>
          ) : (
            <p className="quiet end-note">No games yet, so nothing is saved.</p>
          )}
          {errorLine}
          <div className="calculator-footer">
            <button
              type="button"
              className="meeting-primary"
              disabled={busy || offline || entering}
              onClick={async () => {
                if (
                  await act("end", {
                    table: room.table,
                    session: room.session,
                    lastHandId: last,
                  })
                )
                  setLayer(null);
              }}
            >
              {busy ? "Ending…" : "End table"}
            </button>
            <button
              type="button"
              className="meeting-chip"
              disabled={busy}
              onClick={() => setLayer(null)}
            >
              <IconPlayerPlay aria-hidden="true" /> Keep playing
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Lobby({
  rooms,
  mine,
  ended,
  you,
}: {
  rooms: Room[];
  mine: Room | undefined;
  ended: Room | undefined;
  you: string;
}) {
  const open = rooms.filter((room) => room.seats.length);
  const taken = new Set(open.map((room) => room.table));
  const next = Array.from({ length: MAX_TABLES }, (_, i) => i + 1).find(
    (table) => !taken.has(table),
  );
  return (
    <>
      <h1>Tables tonight</h1>
      {mine ? (
        <div className="room-return">
          <p>You’re seated at Table {mine.table}.</p>
          <Link
            className="meeting-primary"
            href={MEETING_PATHS.table(mine.table)}
          >
            Return to Table {mine.table}
          </Link>
        </div>
      ) : (
        ended?.ended && (
          <EndedReceipt ended={ended.ended} room={ended.table} you={you} />
        )
      )}
      {open.length > 0 ? (
        <ul className="room-list" aria-label="Tables in play">
          {open.map((room, i) => {
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
                  <span className="room-status" data-open={!full}>
                    {full
                      ? `Playing · ${room.hands.length} ${room.hands.length === 1 ? "game" : "games"}`
                      : `${4 - room.seats.length} ${room.seats.length === 3 ? "seat" : "seats"} open`}
                  </span>
                </div>
                <ul className="room-seats">
                  {WINDS.map((wind, w) => {
                    const seat = room.seats.find((item) => item.wind === w);
                    return (
                      <li key={wind} data-empty={!seat}>
                        <span className="seat-tile">
                          {seat ? (
                            <PlayerTile id={seat.id} />
                          ) : (
                            <EmptyTile glyph={WIND_GLYPHS[w]} />
                          )}
                        </span>
                        <span>
                          <span className="sr-only">{wind}: </span>
                          {seat?.display || (
                            <span className="sr-only">open</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {/* A card only acts when there's something to do there: your
                    own table, or a free seat while you aren't seated. The
                    link stretches over the card; see .room-go. */}
                {mine?.table === room.table ? (
                  <Link
                    className="meeting-chip room-go"
                    href={MEETING_PATHS.table(room.table)}
                  >
                    Your table <IconArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  !full &&
                  !mine && (
                    <Link
                      className="meeting-chip room-go"
                      data-sit
                      href={MEETING_PATHS.table(room.table)}
                    >
                      <IconArmchair aria-hidden="true" /> Sit here
                      <span className="sr-only"> at Table {room.table}</span>
                    </Link>
                  )
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="meeting-notice">
          No tables yet. Open the first one and the others can join you.
        </p>
      )}
      {next && !mine && (
        <Link className="meeting-primary" href={MEETING_PATHS.table(next)}>
          Open Table {next}
        </Link>
      )}
      <Link className="meeting-text lobby-fallback" href={MEETING_PATHS.score}>
        Played without a table? Enter final totals
      </Link>
    </>
  );
}

function Tables({
  meeting,
  refresh,
  table,
}: {
  meeting: Meeting;
  refresh: () => void;
  table?: number;
}) {
  const { player, setPlayer, prompt } = useConfirmedPlayer(meeting);
  const [rooms, setRooms] = useState<Room[]>(meeting.rooms || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [seen, setSeen] = useState({ session: "", games: 0 });
  const [cheer, setCheer] = useState<string>();
  useEffect(() => {
    if (!cheer) return;
    const timer = setTimeout(() => setCheer(undefined), 2600);
    return () => clearTimeout(timer);
  }, [cheer]);
  const inFlight = useRef(false);
  // A failed refresh (including the 10 s timeout) is shown instead of a
  // table that silently stops changing, and blocks uncertain score writes.
  const [roomsAt, setRoomsAt] = useState(() => Date.now());
  const [roomsFailed, setRoomsFailed] = useState(false);
  const take = (state: { rooms: Room[] }) => {
    keepRooms(state.rooms);
    setRooms(state.rooms);
    setRoomsAt(Date.now());
    setRoomsFailed(false);
    const seated = seatedRoom(state.rooms, player?.id);
    if (pendingLeave.current && seated) {
      pendingLeave.current = false;
      leaveOwn(seated);
    }
  };
  // Bumped when an action starts and when it finishes, so a refresh that
  // overlapped one is dropped instead of putting older seats back.
  const actions = useRef(0);
  const reload = usePoll(
    async (signal) => {
      const started = actions.current;
      try {
        const next = await getRooms(MEETING_SERVICE_URL, signal);
        if (!signal.aborted && started === actions.current) take(next);
      } catch {
        if (!signal.aborted && started === actions.current)
          setRoomsFailed(true);
      }
    },
    8000,
    [],
  );
  const mine = seatedRoom(rooms, player?.id);
  // The latest ended session this player was part of, while they are unseated.
  const ended =
    player && !mine
      ? rooms
          .filter((room) =>
            room.ended?.totals.some((seat) => seat.id === player.id),
          )
          .sort((a, b) => b.ended!.at - a.ended!.at)[0]
      : undefined;

  // Once games are saved, the group changes by ending the table.
  function leaveOwn(room = mine) {
    if (room?.hands.length)
      setError(
        "Games are saved at this table. End the table to change groups.",
      );
    else void act("leave");
  }
  // The menu's Leave arrives as #leave, sometimes before the rooms load.
  const pendingLeave = useRef(false);
  const leaveFromMenu = useEffectEvent(() => {
    if (mine) leaveOwn();
    else pendingLeave.current = true;
  });
  useEffect(() => {
    const check = () => {
      if (window.location.hash !== "#leave") return;
      history.replaceState(null, "", window.location.pathname);
      leaveFromMenu();
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    // A ref, not state: a second tap before the re-render must not send again.
    if (inFlight.current || !player) return false;
    inFlight.current = true;
    actions.current++;
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
        if (fresh) take(fresh);
        const room = fresh?.rooms.find((item) => item.table === mine.table);
        const newest = room?.hands.at(-1);
        const sent = extra as { winner?: string; each?: number };
        if (action === "hand" && newest && newest.id !== lastHandId) {
          const seat = room!.seats.find((item) => item.id === newest.winner);
          const what = `${seat?.display ?? "Someone"} won · ${newest.each} each`;
          if (newest.winner === sent.winner && newest.each === sent.each) {
            // The same game from another phone: treat it as done.
            setNotice(`Another phone already saved this game: ${what}.`);
            return true;
          }
          setError(
            `Another phone just saved a game (${what}). Save yours only if it was a different game.`,
          );
          return false;
        }
        setError(
          action === "undo"
            ? "Another phone just changed this table. Check the games below before undoing."
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
      if (reply.rooms) take({ rooms: reply.rooms });
      if (action === "end") window.scrollTo({ top: 0 });
      return true;
    } catch (failure) {
      // The request may have landed before the connection dropped. Check
      // before offering a retry, so a saved game is never entered twice.
      const fresh = await getRooms(MEETING_SERVICE_URL).catch(() => null);
      if (fresh) take(fresh);
      const outcome =
        fresh &&
        actionLanded(
          action,
          { ...extra, playerId: player.id, lastHandId },
          mine,
          fresh.rooms,
        );
      if (outcome === "landed") return true;
      setError(
        requestError(failure) +
          (outcome === "missing"
            ? " Nothing was saved; try again."
            : outcome === "unsure"
              ? " This table was ended meanwhile. Check Tonight’s standings before saving again."
              : " Check the connection before trying again."),
      );
      return false;
    } finally {
      actions.current++;
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (!player) return <WhoAreYou choose={setPlayer} />;
  if (prompt) return prompt;
  const room = table ? rooms.find((item) => item.table === table) : undefined;
  const here = table !== undefined && mine?.table === table;
  // A game saved at this table, by any phone, cheers its winner. Compared
  // with the last render rather than an id, so Undo never cheers.
  const session = room ? `${room.table}-${room.session}` : "";
  const games = room?.hands.length ?? 0;
  if (seen.session !== session || seen.games !== games) {
    setSeen({ session, games });
    if (seen.session === session && games > seen.games)
      setCheer(room!.hands.at(-1)!.winner);
  }
  // You can take a seat when you're not seated, or move within your own
  // table until its first game is saved.
  const canSit =
    table !== undefined && (!mine || (here && mine.hands.length === 0));
  return (
    <div className="tables-page">
      {roomsFailed && (
        <p className="room-stale" role="status">
          <span>
            Reconnecting… Last updated {clock(roomsAt)}. Saving waits until the
            connection is back.
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
      {table === undefined ? (
        <Lobby rooms={rooms} mine={mine} ended={ended} you={player.id} />
      ) : (
        <div className="room-view">
          {!mine && ended?.ended && (
            <>
              <EndedReceipt
                ended={ended.ended}
                room={ended.table}
                you={player.id}
              />
              <Link
                className="meeting-primary ended-next"
                href={MEETING_PATHS.tonight}
              >
                See tonight’s standings
              </Link>
            </>
          )}
          {mine && !here && (
            <p className="meeting-notice">
              You’re seated at Table {mine.table}.{" "}
              <Link href={MEETING_PATHS.table(mine.table)}>
                Return to Table {mine.table}
              </Link>
            </p>
          )}
          <h1 className="meeting-title" tabIndex={-1}>
            Table {table}
          </h1>
          {!here && (
            <p className="meeting-intro">
              {(room?.seats.length ?? 0) >= 4
                ? "This table is full."
                : mine
                  ? "You can sit here after your own table ends."
                  : "Tap the wind tile where you’re sitting."}
            </p>
          )}
          <TableSquare
            room={room}
            table={table}
            you={player.id}
            canSit={canSit}
            busy={busy || roomsFailed}
            cheer={cheer}
            sit={(wind) => void act("join", { table, seat: wind })}
            tapOwn={() => leaveOwn()}
          />
          {here && (
            <SeatedTable
              key={`${mine!.table}-${mine!.session}`}
              meeting={meeting}
              room={mine!}
              player={player}
              busy={busy}
              offline={roomsFailed}
              error={error}
              act={act}
            />
          )}
          {!mine && (
            <Link
              className={ended?.ended ? "meeting-chip" : "meeting-text"}
              href={MEETING_PATHS.tables}
            >
              Find another table
            </Link>
          )}
        </div>
      )}
      {error && (
        <p className="meeting-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function TableRooms({ table }: { table?: number }) {
  return (
    <MeetingAccess>
      {(meeting, refresh) =>
        meeting.rooms ? (
          <Tables
            key={meeting.meetingId}
            meeting={meeting}
            refresh={refresh}
            table={table}
          />
        ) : (
          <div className="meeting-closed">
            <h1>Tables aren’t set up yet.</h1>
            <p>Record your table’s final totals instead.</p>
            <Link className="meeting-secondary" href={MEETING_PATHS.score}>
              Record a table
            </Link>
          </div>
        )
      }
    </MeetingAccess>
  );
}
