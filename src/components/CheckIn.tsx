"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { IconDice5Filled } from "@tabler/icons-react";
import PlayerTile, { AvatarTile, TileName } from "@/components/PlayerTile";
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
  savedPlayer,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { tileNames } from "@/lib/format";
import {
  BACKS,
  PARTS,
  parseTile,
  tileCode,
  type Avatar,
  type Face,
} from "@/lib/avatar";
import {
  addTonightTiles,
  chooseTile,
  chosenTile,
  madeHere,
  serviceTile,
  subscribeTiles,
  tilesVersion,
} from "@/lib/tiles";
import type { Meeting as ScheduledMeeting } from "@/lib/schema";

// What a screen reader hears for a face whose id isn't a word.
const SAY: Partial<Record<Face, string>> = {
  zhong: "red dragon",
  fa: "green dragon",
};

/** Sends the tile this phone made, so the rest of the meeting sees it. Fire
 * and forget: a service without tiles answers 404 and nothing changes. */
function shareTile(id: string) {
  const tile = madeHere(id);
  if (!tile || tile === serviceTile(id)) return;
  postMeeting(MEETING_SERVICE_URL, { r: "tile", playerId: id, tile })
    .then((reply) => {
      if (reply.status === 200) addTonightTiles({ [id]: tile });
    })
    .catch(() => {});
}

/** The player's tile, a dice for a random one, and behind "Change your
 * tile" a rack of every face and a row of backs, so a player who just wants
 * a table never waits on it. Kept on this phone until the player moves on;
 * `children` (the greeting) sits between the tile and the rack. */
function TileMaker({ id, children }: { id: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [said, setSaid] = useState("");
  useSyncExternalStore(subscribeTiles, tilesVersion, () => -1);
  const tile = parseTile(chosenTile(id), id);
  // Shared on the way out, whichever way the player leaves "You're in".
  useEffect(() => {
    shareTile(id);
    return () => shareTile(id);
  }, [id]);
  const pick = (next: Avatar) => {
    chooseTile(id, tileCode(next));
    setBump((n) => n + 1);
    setSaid(`${SAY[next.face] ?? next.face} on ${next.back}`);
  };
  const roll = () => {
    const any = <T,>(list: readonly T[], not: T): T => {
      const others = list.filter((item) => item !== not);
      return others[Math.floor(Math.random() * others.length)];
    };
    pick({
      face: any(PARTS.face, tile.face),
      back: any(PARTS.back, tile.back),
    });
  };
  return (
    <>
      <div className="tile-maker">
        <span
          className="meeting-hero-tile"
          data-bump={bump ? bump % 2 : undefined}
        >
          <PlayerTile id={id} />
          <button
            type="button"
            className="tile-maker-dice"
            aria-label="Random tile"
            onClick={roll}
          >
            <IconDice5Filled aria-hidden="true" />
          </button>
        </span>
        <p className="sr-only" role="status">
          {said}
        </p>
      </div>
      {children}
      <button
        type="button"
        className="meeting-chip tile-rack-toggle"
        aria-expanded={open}
        aria-controls="tile-rack"
        onClick={() => setOpen((was) => !was)}
      >
        {open ? "Done" : "Change your tile"}
      </button>
      {open && (
        <div className="tile-rack" id="tile-rack">
          <fieldset>
            <legend>Picture</legend>
            <div className="tile-rack-faces">
              {PARTS.face.map((face) => (
                <label key={face}>
                  <input
                    type="radio"
                    name="tile-face"
                    className="sr-only"
                    checked={tile.face === face}
                    onChange={() => pick({ ...tile, face })}
                  />
                  <AvatarTile tile={{ ...tile, face }} />
                  <span className="sr-only">{SAY[face] ?? face}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Back</legend>
            <div className="tile-rack-backs">
              {PARTS.back.map((back) => (
                <label key={back}>
                  <input
                    type="radio"
                    name="tile-back"
                    className="sr-only"
                    checked={tile.back === back}
                    onChange={() => pick({ ...tile, back })}
                  />
                  <span
                    className="tile-rack-swatch"
                    style={{ background: BACKS[back] }}
                  />
                  <span className="sr-only">{back}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </>
  );
}

// Whole tiles in one character, so every face that turns up is a real tile.
const FACES = ["東", "南", "西", "北", "中", "發", "白"];
type Outcome = "won" | "lost" | null;
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The "…" after "Checking in": three small tiles that turn up random faces
 * while the reply is on its way. Checked in, they land as a pung, 中 中 中;
 * refused, they turn face down and shake. A face that changes remounts its
 * tile, which replays the flip-in.
 */
function WaitTiles({ outcome }: { outcome: Outcome }) {
  const [faces, setFaces] = useState<{ face: string; n: number }[]>(() =>
    [0, 1, 2].map((n) => ({ face: "", n })),
  );
  useEffect(() => {
    // With reduced motion they wait face down rather than changing faces.
    if (outcome || still()) return;
    let turn = 0;
    const timer = setInterval(() => {
      const i = turn++ % 3;
      setFaces((shown) =>
        shown.map((tile, j) =>
          j === i
            ? {
                face: FACES[Math.floor(Math.random() * FACES.length)],
                n: tile.n + 3,
              }
            : tile,
        ),
      );
    }, 180);
    return () => clearInterval(timer);
  }, [outcome]);
  return (
    <span
      className="wait-tiles"
      data-outcome={outcome ?? undefined}
      aria-hidden="true"
    >
      {faces.map((tile, i) => {
        const face =
          outcome === "won" ? "中" : outcome === "lost" ? "" : tile.face;
        return (
          <span
            className="wait-tile"
            data-down={face ? undefined : true}
            key={outcome ? outcome + i : tile.n}
            style={{ "--i": i } as React.CSSProperties}
          >
            {face}
          </span>
        );
      })}
    </span>
  );
}

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
  // Which button is waiting: the form's, or the suggestion that was tapped.
  const [pending, setPending] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
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
    setPending(choice.matchId ?? (choice.createNew ? "new" : "form"));
    setError("");
    // A refusal turns the tiles down and shakes them before it explains.
    const refuse = async (message: string) => {
      setOutcome("lost");
      if (!still()) await pause(400);
      setError(message);
    };
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
        await refuse(reply.message || "Ask an officer to check you in.");
        if (reply.status === 423) refresh();
        return;
      }
      if (!reply.player) throw new Error("Didn’t go through. Try again.");
      // The pung, and one short buzz where phones allow it.
      setOutcome("won");
      navigator.vibrate?.(10);
      await pause(700);
      setPlayer(reply.player, reply.meetingId);
      setComputingId("");
      setFullName("");
      setSuggestions([]);
      refresh();
    } catch (failure) {
      await refuse(requestError(failure));
    } finally {
      setBusy(false);
      setOutcome(null);
    }
  }

  // The waiting button keeps its words and colour, with the tiles as its "…".
  const isWaiting = (key: string) => busy && pending === key;
  const waiting = (key: string, idle: string) =>
    isWaiting(key) ? (
      <>
        {outcome === "won" ? "You’re in!" : "Checking in"}
        <WaitTiles outcome={outcome} />
      </>
    ) : (
      idle
    );

  if (prompt) return prompt;
  if (player) {
    const here = meeting.players || [];
    const names = tileNames(here);
    const next = playerNext(meeting, player.id);
    return (
      <div className="meeting-receipt">
        <p className="sr-only" role="status">
          You’re checked in.
        </p>
        <TileMaker id={player.id}>
          <h1>
            You’re in,{" "}
            <span className="meeting-accent">
              {player.display.split(" ")[0]}!
            </span>
          </h1>
        </TileMaker>
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
                    {p.id === player.id ? (
                      <>
                        You<span className="sr-only">, {p.display}</span>
                      </>
                    ) : (
                      <TileName name={names.get(p.id)!} full={p.display} />
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
        <h1>Check-in closed</h1>
        <p>Missed it? Ask an officer.</p>
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
          <span className="meeting-accent">Welcome!</span>
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
                Edit<span className="sr-only"> computing ID</span>
              </button>
            </div>
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
            <p className="sr-only" id="computing-id-hint">
              Your computing ID is the part before @virginia.edu.
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
            <div className="meeting-actions">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  className="meeting-secondary"
                  key={suggestion.id}
                  data-waiting={isWaiting(suggestion.id) || undefined}
                  onClick={() => void submit({ matchId: suggestion.id })}
                >
                  {waiting(
                    suggestion.id,
                    suggestions.length === 1
                      ? "Yes, that’s me"
                      : suggestion.display,
                  )}
                </button>
              ))}
              <button
                type="button"
                className="meeting-text"
                data-waiting={isWaiting("new") || undefined}
                onClick={() => void submit({ createNew: true })}
              >
                {waiting("new", "No, I’m new")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            className="meeting-primary"
            data-waiting={isWaiting("form") || undefined}
          >
            {waiting("form", register ? "Join the club" : "Let’s play")}
          </button>
        )}
      </fieldset>
      {/* Always mounted, so screen readers announce each change. */}
      <p className="sr-only" role="status">
        {busy ? (outcome === "won" ? "You’re in" : "Checking in") : ""}
      </p>
    </form>
  );
}
export default function CheckIn({
  schedule,
}: {
  schedule: ScheduledMeeting[];
}) {
  return (
    <MeetingAccess schedule={schedule}>
      {(meeting, refresh) => (
        <CheckInForm
          // The calendar's stand-in and the real reply share a date, so an ID
          // typed while the service wakes up survives its reply.
          key={savedPlayer(meeting) ? meeting.meetingId : meeting.date}
          meeting={meeting}
          refresh={refresh}
        />
      )}
    </MeetingAccess>
  );
}
