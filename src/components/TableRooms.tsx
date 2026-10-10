"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowBackUp, IconCheck } from "@tabler/icons-react";
import MeetingAccess from "@/components/MeetingAccess";
import ContinueAs from "@/components/ContinueAs";
import Sheet from "@/components/Sheet";
import { CharacterFace, TileFace } from "@/components/PlayingTile";
import { BLUE } from "@/components/TileArtwork";
import {
  cleanComputingId,
  computingIdError,
  getRooms,
  MAX_TABLES,
  MEETING_PATHS,
  playerConfirmed,
  postMeeting,
  rememberMeetingPage,
  rememberPlayer,
  requestError,
  savedPlayer,
  WINDS,
  type Meeting,
  type Player,
  type ResultTable,
  type Room,
} from "@/lib/meeting";
import { tonightStandings, tonightTables } from "@/lib/live";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { usePoll } from "@/lib/usePoll";

const START = 205;
// Unsaved game entry, restored only if the table has not changed since.
const GAME_DRAFT = "club-game-draft";

function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "±0";
}
const minus = (value: number) => String(value).replace("-", "−");
const clock = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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
        you in if you haven’t yet, and brings you back to your table.
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
          {ended.sheetTable && ` · scoresheet Table ${ended.sheetTable}`}
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

/** A seat's wind as the club's own tile artwork, as on the guide. */
function WindTile({ wind }: { wind: number }) {
  return (
    <TileFace index={WINDS[wind][0]} indexColour={BLUE}>
      <CharacterFace bottom={WIND_GLYPHS[wind]} ink={BLUE} />
    </TileFace>
  );
}

/**
 * The physical table as a square of wind tiles, East at the bottom and the
 * winds going counter-clockwise as at a mahjong table. Every phone draws the
 * same picture, so a wind names one real chair for the whole group.
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
}) {
  const latest = room?.hands.at(-1);
  const games = room?.hands.length ?? 0;
  return (
    <div
      className="table-square"
      role="group"
      aria-label={pick ? "Who won?" : `Seats at Table ${table}`}
    >
      <div className="table-top" aria-hidden="true">
        <strong>{table}</strong>
        <span>
          {games ? `${games} ${games === 1 ? "game" : "games"}` : "Table"}
        </span>
      </div>
      {WINDS.map((wind, i) => {
        const seat = room?.seats.find((item) => item.wind === i);
        const total = seat
          ? (room!.totals.find((item) => item.id === seat.id)?.total ?? START)
          : 0;
        const change =
          seat && latest
            ? seat.id === latest.winner
              ? 3 * latest.each
              : -latest.each
            : null;
        const own = seat?.id === you;
        const body = (
          <>
            <span className="seat-tile">
              <WindTile wind={i} />
            </span>
            <span className="seat-name">
              {seat ? seat.display : canSit && !pick ? "Take seat" : "Open"}
              {own && <small> you</small>}
            </span>
            {seat && games > 0 && !pick && (
              <span className="seat-total">
                {minus(total)}
                {change !== null && (
                  <small className="delta" data-sign={Math.sign(change)}>
                    {" "}
                    {signed(change)}
                  </small>
                )}
              </span>
            )}
          </>
        );
        const label = `${wind}: ${seat ? seat.display : "open seat"}`;
        if (pick && seat)
          return (
            <button
              type="button"
              className="seat"
              data-wind={wind}
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
              aria-label={`Take the ${wind} seat`}
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
              data-you
              key={wind}
              disabled={busy}
              aria-label={`Your seat, ${wind}. ${games ? "End the table to change groups." : "Tap to leave."}`}
              onClick={tapOwn}
            >
              {body}
            </button>
          );
        return (
          <div
            className="seat"
            data-wind={wind}
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

/** Tonight's standings, opened over the table and closed back to it. */
function StandingsSheet({
  tables,
  you,
  close,
}: {
  tables: ResultTable[];
  you: string;
  close: () => void;
}) {
  const rows = tonightStandings(tables);
  return (
    <Sheet title="Tonight" close={close}>
      <p className="quiet">
        Each player’s net tonight. Games at tables still playing are included
        and stay provisional until an officer publishes them.
      </p>
      {rows.length ? (
        <ol className="live-list" aria-label="Tonight’s standings">
          {rows.map((row) => (
            <li key={row.id} data-you={row.id === you || undefined}>
              <span className="live-rank">{row.rank}</span>
              <span className="score-name">
                {row.display}
                {row.id === you && " (you)"}
                <small>
                  {row.tables} {row.tables === 1 ? "table" : "tables"} tonight
                </small>
              </span>
              <strong className={`live-points${row.net < 0 ? " down" : ""}`}>
                {signed(row.net)}
              </strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="meeting-notice">No games saved yet tonight.</p>
      )}
      <div className="calculator-footer">
        <button type="button" className="meeting-primary" onClick={close}>
          Back to the table
        </button>
        <Link className="meeting-text" href={MEETING_PATHS.standings}>
          Tonight and semester standings
        </Link>
      </div>
    </Sheet>
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

/** Plain ruled rows of each player's change, for review and End table. */
function ChangeRows({
  room,
  change,
}: {
  room: Room;
  change: (id: string) => number;
}) {
  const total = (id: string) =>
    room.totals.find((item) => item.id === id)?.total ?? START;
  return (
    <ul className="change-rows">
      {room.seats.map((seat) => (
        <li key={seat.id}>
          <span>{seat.display}</span>
          <span className="delta" data-sign={Math.sign(change(seat.id))}>
            {signed(change(seat.id))}
          </span>
          <strong>{minus(total(seat.id) + change(seat.id))}</strong>
        </li>
      ))}
    </ul>
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
  tonight,
  act,
  standings,
}: {
  meeting: Meeting;
  room: Room;
  player: Player;
  busy: boolean;
  offline: boolean;
  error: string;
  tonight: number | null;
  act: (action: string, extra?: Record<string, unknown>) => Promise<boolean>;
  standings: () => void;
}) {
  const last = room.hands.at(-1)?.id ?? null;
  // One draft per table session and game; anything else is discarded with a note.
  const [draft, setDraft] = useState<Draft>(() => {
    const fresh = {
      meetingId: meeting.meetingId!,
      table: room.table,
      session: room.session,
      lastHandId: last,
      winner: "",
      each: "",
      handId: "",
    };
    try {
      const kept = JSON.parse(localStorage.getItem(GAME_DRAFT) || "null");
      if (
        kept?.meetingId === fresh.meetingId &&
        kept.table === fresh.table &&
        kept.session === fresh.session &&
        kept.lastHandId === fresh.lastHandId
      )
        return {
          ...fresh,
          winner: kept.winner,
          each: kept.each,
          handId: kept.handId,
        };
    } catch {
      /* No draft to restore. */
    }
    return fresh;
  });
  const [stale, setStale] = useState(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(GAME_DRAFT) || "null");
      return Boolean(
        kept?.winner &&
        kept.meetingId === meeting.meetingId &&
        kept.table === room.table &&
        (kept.session !== room.session || kept.lastHandId !== last),
      );
    } catch {
      return false;
    }
  });
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
      setDraft({ ...draft, winner: "", each: "", handId: "" });
    }
  }
  const latest = room.hands.at(-1);
  const mineNow = latest ? gain(latest.winner, latest.each)(player.id) : 0;
  return (
    <>
      {latest ? (
        <p className="table-latest" role="status">
          <span>
            Game {games}: {name(latest.winner)} won, {latest.each} from each
          </span>
          <span>
            You{" "}
            <b className="delta" data-sign={Math.sign(mineNow)}>
              {signed(mineNow)}
            </b>{" "}
            this game
            {tonight !== null && (
              <>
                {" · "}
                <b className="delta" data-sign={Math.sign(tonight)}>
                  {signed(tonight)}
                </b>{" "}
                tonight
              </>
            )}
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
          {entering ? `Continue game ${games + 1}` : `Record game ${games + 1}`}
        </button>
        <div className="table-links">
          {games > 0 && (
            <button
              type="button"
              className="meeting-text"
              onClick={() => setLayer("games")}
            >
              Games ({games})
            </button>
          )}
          <button type="button" className="meeting-text" onClick={standings}>
            Standings
          </button>
          {(games > 0 || ready) && (
            <button
              type="button"
              className="meeting-text"
              onClick={() => setLayer("end")}
            >
              End table
            </button>
          )}
        </div>
      </div>

      {layer === "game" && (
        <Sheet
          title={step === "review" ? "Check, then save" : `Game ${games + 1}`}
          close={() => setLayer(null)}
        >
          {step === "entry" ? (
            <>
              <p className="quiet">Tap the winner’s tile.</p>
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
                aria-describedby="hand-each-hint"
                onChange={(event) =>
                  set({
                    each: event.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
              />
              <p className="quiet" id="hand-each-hint">
                Include flowers and gold. The winner gains three times this.
              </p>
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
                    className="meeting-text"
                    onClick={() =>
                      setDraft({ ...draft, winner: "", each: "", handId: "" })
                    }
                  >
                    Clear entry
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="quiet">
                {name(draft.winner)} won. Each other player pays {amount}.
              </p>
              <ChangeRows room={room} change={gain(draft.winner, amount)} />
              {error && (
                <p className="meeting-error" role="alert">
                  {error}
                </p>
              )}
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
                      : "Save game"}
                </button>
                <button
                  type="button"
                  className="meeting-text"
                  disabled={busy}
                  onClick={() => setStep("entry")}
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}

      {layer === "games" && (
        <Sheet title="Games at this table" close={() => setLayer(null)}>
          <ol className="change-rows" reversed>
            {room.hands
              .map((hand, i) => ({ hand, number: i + 1 }))
              .reverse()
              .map(({ hand, number }) => (
                <li key={hand.id}>
                  <span>Game {number}</span>
                  <span>{name(hand.winner)} won</span>
                  <strong>{hand.each} each</strong>
                </li>
              ))}
          </ol>
          {error && (
            <p className="meeting-error" role="alert">
              {error}
            </p>
          )}
          <div className="calculator-footer">
            <button
              type="button"
              className="meeting-secondary"
              disabled={busy || offline}
              onClick={() => void act("undo")}
            >
              <IconArrowBackUp size={18} aria-hidden="true" /> Undo game {games}
            </button>
          </div>
        </Sheet>
      )}

      {layer === "end" && (
        <Sheet title="End this table?" close={() => setLayer(null)}>
          <p className="quiet">
            {games
              ? `It ends for all four players. ${games} ${games === 1 ? "game goes" : "games go"} to the club’s scoresheet as one table with these totals, then every seat is freed. Table ${room.table} stays open for the next group.`
              : "It ends for all four players. No games were saved, so nothing goes to the scoresheet."}
          </p>
          {games > 0 && <ChangeRows room={room} change={() => 0} />}
          {entering && (
            <p className="meeting-notice">
              Someone’s game entry on this phone isn’t saved yet. Save or clear
              it first.
            </p>
          )}
          {error && (
            <p className="meeting-error" role="alert">
              {error}
            </p>
          )}
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
              className="meeting-text"
              disabled={busy}
              onClick={() => setLayer(null)}
            >
              Keep playing
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
      <h1>Tables tonight.</h1>
      <p className="meeting-intro">
        Sit with three others. Anyone at the table records each game: who won
        and what each other player pays.
      </p>
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
                  <span>
                    {room.seats.length}/4 · {full ? "Playing" : "Seats open"}
                  </span>
                </div>
                <ul className="room-seats">
                  {WINDS.map((wind, w) => {
                    const seat = room.seats.find((item) => item.wind === w);
                    return (
                      <li key={wind} data-empty={!seat}>
                        <span className="seat-tile" aria-hidden="true">
                          <WindTile wind={w} />
                        </span>
                        <span>
                          <span className="sr-only">{wind}: </span>
                          {seat?.display || "Open"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  className="meeting-text"
                  href={MEETING_PATHS.table(room.table)}
                >
                  {mine?.table === room.table
                    ? "Your table"
                    : full || mine
                      ? `View Table ${room.table}`
                      : `Sit at Table ${room.table}`}
                </Link>
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
  const [player, setPlayer] = useState(() => savedPlayer(meeting));
  const [confirmed, setConfirmed] = useState(() => playerConfirmed());
  const [rooms, setRooms] = useState<Room[]>(meeting.rooms || []);
  const [results, setResults] = useState<ResultTable[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sheet, setSheet] = useState(false);
  const inFlight = useRef(false);
  // A failed refresh (including the 10 s timeout) is shown instead of a
  // table that silently stops changing, and blocks uncertain score writes.
  const [roomsAt, setRoomsAt] = useState(() => Date.now());
  const [roomsFailed, setRoomsFailed] = useState(false);
  const take = (state: { rooms: Room[]; results: ResultTable[] | null }) => {
    setRooms(state.rooms);
    if (state.results) setResults(state.results);
    setRoomsAt(Date.now());
    setRoomsFailed(false);
  };
  const reload = usePoll(
    async (signal) => {
      try {
        const next = await getRooms(MEETING_SERVICE_URL, signal);
        if (!signal.aborted) take(next);
      } catch {
        if (!signal.aborted) setRoomsFailed(true);
      }
    },
    8000,
    [],
  );
  useEffect(
    () =>
      rememberMeetingPage(
        table ? MEETING_PATHS.table(table) : MEETING_PATHS.tables,
      ),
    [table],
  );
  const mine = player
    ? rooms.find((room) => room.seats.some((seat) => seat.id === player.id))
    : undefined;
  // The latest ended session this player was part of, while they are unseated.
  const ended =
    player && !mine
      ? rooms
          .filter((room) =>
            room.ended?.totals.some((seat) => seat.id === player.id),
          )
          .sort((a, b) => b.ended!.at - a.ended!.at)[0]
      : undefined;

  async function act(action: string, extra: Record<string, unknown> = {}) {
    // A ref, not state: a second tap before the re-render must not send again.
    if (inFlight.current || !player) return false;
    inFlight.current = true;
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
      if (reply.rooms)
        take({ rooms: reply.rooms, results: reply.results ?? null });
      if (action === "end") window.scrollTo({ top: 0 });
      return true;
    } catch (failure) {
      // The request may have landed before the connection dropped. Check
      // before offering a retry, so a saved game is never entered twice.
      const fresh = await getRooms(MEETING_SERVICE_URL).catch(() => null);
      if (fresh) take(fresh);
      const id = (extra as { handId?: string }).handId;
      if (
        action === "hand" &&
        fresh?.rooms.some((room) => room.hands.some((hand) => hand.id === id))
      )
        return true;
      setError(
        requestError(failure) +
          (fresh
            ? " Nothing was saved; try again."
            : " Check the connection before trying again."),
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (!player)
    return (
      <WhoAreYou
        meeting={meeting}
        choose={(next) => {
          setPlayer(next);
          setConfirmed(true);
        }}
      />
    );
  if (!confirmed)
    return (
      <ContinueAs
        player={player}
        yes={() => {
          rememberPlayer(meeting, player);
          setConfirmed(true);
        }}
        no={() => {
          rememberPlayer(meeting, null);
          setPlayer(null);
        }}
      />
    );
  const room = table ? rooms.find((item) => item.table === table) : undefined;
  const here = table !== undefined && mine?.table === table;
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
          <Link
            className="meeting-text meeting-back"
            href={MEETING_PATHS.tables}
          >
            ← All tables
          </Link>
          {!mine && ended?.ended && (
            <EndedReceipt
              ended={ended.ended}
              room={ended.table}
              you={player.id}
            />
          )}
          {mine && !here && (
            <p className="meeting-notice">
              You’re seated at Table {mine.table}.{" "}
              <Link href={MEETING_PATHS.table(mine.table)}>
                Return to Table {mine.table}
              </Link>
            </p>
          )}
          <h1 tabIndex={-1}>Table {table}.</h1>
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
            sit={(wind) => void act("join", { table, seat: wind })}
            tapOwn={() => {
              if (mine?.hands.length)
                setError(
                  "Games are saved at this table. End the table to change groups.",
                );
              else void act("leave");
            }}
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
              tonight={
                tonightStandings(tonightTables(results, rooms)).find(
                  (row) => row.id === player.id,
                )?.net ?? null
              }
              act={act}
              standings={() => setSheet(true)}
            />
          )}
          {!mine && (
            <Link
              className={ended?.ended ? "meeting-primary" : "meeting-text"}
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
      {sheet && (
        <StandingsSheet
          tables={tonightTables(results, rooms)}
          you={player.id}
          close={() => setSheet(false)}
        />
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
