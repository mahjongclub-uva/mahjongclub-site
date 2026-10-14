"use client";

import { useEffect, useState } from "react";
import {
  makeTurnScript,
  pieceName,
  seeded,
  sortHand,
  type Piece,
  type TurnScript,
} from "@/lib/guide-practice";
import GameTile from "./GameTile";
import ThrowRow from "./ThrowRow";
import useKeepFocus from "./useKeepFocus";
import styles from "./games.module.css";

type Phase = "draw" | "bonus" | "again" | "throw" | "next" | "win" | "won";
const KIND: Record<string, string> = {
  flower: "A flower",
  season: "A season",
  wind: "A wind",
  dragon: "A dragon",
};

/** Three turns: draw and throw, a bonus tile set aside, then a self-drawn win. */
export default function TurnGame() {
  const [script, setScript] = useState(() => makeTurnScript(seeded(3)));
  const [round, setRound] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A fresh hand once the page runs; the static HTML keeps the seeded one.
    setScript(makeTurnScript());
  }, []);
  return (
    <Turns
      key={round}
      script={script}
      onAgain={() => {
        setScript(makeTurnScript());
        setRound(round + 1);
      }}
    />
  );
}

function Turns({
  script,
  onAgain,
}: {
  script: TurnScript;
  onAgain: () => void;
}) {
  const { kept, partial, odd, bonus, win } = script;
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>("draw");
  const [aside, setAside] = useState<Piece[]>([]);
  const [pile, setPile] = useState<Piece[]>([]);
  const [nudge, setNudge] = useState("");
  const ref = useKeepFocus<HTMLDivElement>(`${turn}-${phase}-${aside.length}`);
  // What's on the felt, just drawn: turn 2 draws its bonus tiles first.
  const drawn =
    turn === 0
      ? partial[1]
      : turn === 1
        ? (bonus[aside.length] ?? odd[1])
        : win;
  const loose = [...partial, turn === 0 ? odd[0] : turn === 1 ? odd[1] : win];
  // Fourteen tiles in sets stay put; these are the other two.
  const inHand =
    turn === 0 && phase === "draw"
      ? [partial[0], odd[0]]
      : phase === "won"
        ? [...partial, win]
        : partial;
  const rack = sortHand([
    ...kept,
    ...(phase === "throw" || phase === "win" ? [] : inHand),
  ]);
  const heading =
    phase === "draw"
      ? "Your turn. Draw a tile."
      : phase === "bonus"
        ? `${KIND[drawn.suit]}! Set it aside.`
        : phase === "again"
          ? "Draw again from the flower side."
          : phase === "throw"
            ? "Throw the tile you don’t need."
            : phase === "next"
              ? "Next player’s turn."
              : phase === "win"
                ? "That finishes your hand. Call it!"
                : "胡! You win.";

  function draw() {
    setNudge("");
    if (turn === 1 && aside.length < bonus.length) setPhase("bonus");
    else setPhase(turn === 2 ? "win" : "throw");
  }
  function throwTile(i: number) {
    const tile = loose[i];
    if (phase === "win") {
      setNudge("Your hand is done. Call win instead.");
      return;
    }
    const lone = odd[turn];
    if (tile !== lone) {
      const other = tile === partial[0] ? partial[1] : partial[0];
      setNudge(`Keep it: with your ${pieceName(other)} it could make a run.`);
      return;
    }
    setNudge("");
    setPile([...pile, tile]);
    setPhase("next");
  }

  return (
    <div className={styles.game} ref={ref}>
      <div className={styles.top}>
        <span className={styles.chip}>
          {phase === "won" ? "Hand won" : `Turn ${turn + 1} of 3`}
        </span>
        <ol className={styles.bar} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              data-state={
                i < turn || phase === "won" ? "done" : i === turn ? "now" : ""
              }
            />
          ))}
        </ol>
      </div>
      <h3 aria-live="polite">{heading}</h3>
      <div className={`${styles.felt} ${styles.turnFelt}`}>
        <Stack
          label="Wall"
          count={3}
          action={phase === "draw" ? "Draw a tile from the wall" : undefined}
          onClick={draw}
        />
        <div className={styles.middle}>
          {(phase === "bonus" || phase === "throw" || phase === "win") && (
            <span
              key={`${turn}-${aside.length}`}
              className={styles.drawn}
              data-bonus={phase === "bonus"}
              role={phase === "bonus" ? undefined : "img"}
              aria-label={
                phase === "bonus" ? undefined : `You drew ${pieceName(drawn)}`
              }
            >
              {phase === "bonus" ? (
                <button
                  type="button"
                  className={styles.drawnButton}
                  aria-label={`Set ${pieceName(drawn)} aside`}
                  onClick={() => {
                    setAside([...aside, drawn]);
                    setPhase("again");
                  }}
                >
                  <GameTile piece={drawn} />
                </button>
              ) : (
                <GameTile piece={drawn} />
              )}
              <span className={styles.drawnTag}>You drew</span>
            </span>
          )}
          {phase === "won" && (
            <span className={styles.stamp} lang="zh-Hant" aria-hidden="true">
              胡
            </span>
          )}
        </div>
        <Stack
          label="Flower side"
          count={1}
          action={
            phase === "again"
              ? "Draw a replacement from the flower side"
              : undefined
          }
          onClick={draw}
        />
        {pile.length > 0 && phase !== "won" && (
          <ul className={styles.pile} aria-label="Your discards">
            {pile.map((piece, i) => (
              <li key={i}>
                <span className="sr-only">{pieceName(piece)}</span>
                <GameTile piece={piece} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {aside.length > 0 && (
        <ul className={styles.aside} aria-label="Set aside">
          <li className={styles.asideLabel} aria-hidden="true">
            Set aside
          </li>
          {aside.map((piece, i) => (
            <li key={i}>
              <span className="sr-only">{pieceName(piece)}</span>
              <GameTile piece={piece} />
            </li>
          ))}
        </ul>
      )}
      <ul
        className={styles.hand}
        data-full={rack.length > 16}
        aria-label="Your hand"
      >
        {rack.map((piece, i) => (
          <li key={i}>
            <span className="sr-only">{pieceName(piece)}</span>
            <GameTile piece={piece} />
          </li>
        ))}
      </ul>
      {(phase === "throw" || phase === "win") && (
        <ThrowRow
          tiles={loose}
          fresh={loose.indexOf(drawn)}
          onThrow={throwTile}
        />
      )}
      <p className={styles.nudge} role="status">
        {nudge}
      </p>
      {phase === "next" && (
        <>
          <p className={styles.note}>
            {pieceName(pile[pile.length - 1])} had nothing near it, so it goes.
          </p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setTurn(turn + 1);
              setPhase("draw");
            }}
          >
            Next turn
          </button>
        </>
      )}
      {phase === "win" && (
        <button
          type="button"
          className={`${styles.primary} ${styles.winButton}`}
          onClick={() => {
            setNudge("");
            setPhase("won");
          }}
        >
          <span lang="zh-Hant" aria-hidden="true">
            胡
          </span>{" "}
          Win
        </button>
      )}
      {phase === "won" && (
        <>
          <p className={styles.note}>
            You drew the last tile yourself: five sets and a pair.
          </p>
          <button type="button" className={styles.primary} onClick={onAgain}>
            Play again
          </button>
        </>
      )}
    </div>
  );
}

/** A stack of face-down tiles; a button only when it's time to draw from it. */
function Stack({
  label,
  count,
  action,
  onClick,
}: {
  label: string;
  count: number;
  action?: string;
  onClick: () => void;
}) {
  const backs = (
    <span className={styles.backs} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
  return action ? (
    <button
      type="button"
      className={styles.stack}
      data-ready="true"
      aria-label={action}
      onClick={onClick}
    >
      {backs}
      <span>{label}</span>
    </button>
  ) : (
    <span className={styles.stack}>
      {backs}
      <span>{label}</span>
    </span>
  );
}
