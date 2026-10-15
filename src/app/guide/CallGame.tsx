"use client";

import { useEffect, useState } from "react";
import {
  CALLS,
  SEATS,
  callNudge,
  makeCallRounds,
  pieceName,
  seeded,
  type Call,
  type CallRound,
  type Piece,
} from "@/lib/guide-practice";
import GameTile from "./GameTile";
import ThrowRow from "./ThrowRow";
import useKeepFocus from "./useKeepFocus";
import styles from "./games.module.css";

const HAN: Record<Call, string> = {
  Win: "胡",
  Pung: "碰",
  Chow: "吃",
  Pass: "→",
};
const SIDE = ["you", "right", "top", "left"];

/** Four discards, one of each call, in a random order. */
export default function CallGame() {
  const [rounds, setRounds] = useState(() => makeCallRounds(seeded(7)));
  const [n, setN] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [step, setStep] = useState("");
  const ref = useKeepFocus<HTMLDivElement>(`${n}-${step}`);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fresh rounds once the page runs; the static HTML keeps the seeded ones.
    setRounds(makeCallRounds());
  }, []);
  const done = n === rounds.length;
  return (
    <div className={styles.game} ref={ref}>
      <div className={styles.top}>
        <span className={styles.chip}>
          {done ? "All done" : `Round ${n + 1} of ${rounds.length}`}
        </span>
        <ol className={styles.bar} aria-hidden="true">
          {rounds.map((_, i) => (
            <li key={i} data-state={i < n ? "done" : i === n ? "now" : ""} />
          ))}
        </ol>
      </div>
      {done ? (
        <div className={styles.end}>
          <span className={styles.stamp} lang="zh-Hant" aria-hidden="true">
            好
          </span>
          <h3>Every call, done.</h3>
          <p>
            {firstTry} of {rounds.length} on the first try.
          </p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setRounds(makeCallRounds());
              setN(0);
              setFirstTry(0);
            }}
          >
            Play again
          </button>
        </div>
      ) : (
        <Round
          key={`${n}-${rounds[n].discard.suit}${rounds[n].discard.rank}`}
          round={rounds[n]}
          last={n === rounds.length - 1}
          onStep={setStep}
          onNext={(clean) => {
            if (clean) setFirstTry(firstTry + 1);
            setN(n + 1);
          }}
        />
      )}
    </div>
  );
}

function Round({
  round,
  last,
  onStep,
  onNext,
}: {
  round: CallRound;
  last: boolean;
  onStep: (step: string) => void;
  onNext: (firstTry: boolean) => void;
}) {
  const [picked, setPicked] = useState<Call | null>(null);
  const [misses, setMisses] = useState(0);
  const solved = picked === round.answer;
  const lost = solved && round.answer === "Chow" && !!round.rival;
  const claimed = solved && round.answer !== "Pass" && !lost;
  const name = pieceName(round.discard);
  const meld = claimed
    ? [...round.uses.map((i) => round.hand[i]), round.discard]
    : [];
  // After a pung or chow you throw one of your loose tiles.
  const [thrown, setThrown] = useState<Piece | null>(null);
  const mustThrow = claimed && round.answer !== "Win";
  const throwing = mustThrow && !thrown;
  useEffect(() => onStep(`${solved}-${!!thrown}`), [solved, thrown, onStep]);
  const choices = round.loose.map((i) => round.hand[i]);
  return (
    <>
      <h3 className={styles.prompt}>
        {SEATS[round.from]} throws {name}.
      </h3>
      <div className={`${styles.felt} ${styles.table}`}>
        {[2, 3, 1, 0].map((seat) => (
          <span
            key={seat}
            className={styles.seat}
            data-side={SIDE[seat]}
            data-lit={seat === round.from}
          >
            {SEATS[seat]}
            {seat === round.from && " · threw"}
            {solved && seat === round.rival && (
              <span className={styles.bubble}>
                <b lang="zh-Hant">碰</b> Pung!
              </span>
            )}
          </span>
        ))}
        {thrown ? (
          <span
            key="thrown"
            className={`${styles.discard} ${styles.thrown}`}
            role="img"
            aria-label={`You threw ${pieceName(thrown)}`}
          >
            <GameTile piece={thrown} />
          </span>
        ) : (
          <span
            className={styles.discard}
            data-go={
              claimed ? "you" : lost ? SIDE[round.rival!] : solved ? "away" : ""
            }
            role="img"
            aria-label={`${SEATS[round.from]} discarded ${name}`}
          >
            <GameTile piece={round.discard} />
          </span>
        )}
        {meld.length > 0 && (
          <span
            className={styles.meld}
            role="img"
            aria-label={`Your set: ${meld.map(pieceName).join(", ")}`}
          >
            {meld.map((piece, i) => (
              <span key={i}>
                <GameTile piece={piece} />
              </span>
            ))}
          </span>
        )}
        {solved && round.answer === "Win" && (
          <span className={styles.stamp} lang="zh-Hant" aria-hidden="true">
            胡
          </span>
        )}
      </div>
      <ul className={styles.hand} aria-label="Your hand">
        {round.hand.map((piece, i) =>
          (claimed && round.uses.includes(i)) ||
          (throwing && round.loose.includes(i)) ||
          (thrown === piece && round.loose.includes(i)) ? null : (
            <li key={i} data-uses={solved && round.uses.includes(i)}>
              <span className="sr-only">{pieceName(piece)}</span>
              <GameTile piece={piece} />
            </li>
          ),
        )}
      </ul>
      {solved ? (
        <div className={styles.verdict} role="status">
          <strong>
            {round.answer === "Pass"
              ? "Right to pass."
              : lost
                ? `${SEATS[round.rival!]} calls pung and takes it.`
                : round.answer === "Win"
                  ? "胡! You win."
                  : `${round.answer}!`}
          </strong>
          <span>{round.why}</span>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Your call"
          className={styles.calls}
          data-misses={misses}
        >
          {CALLS.map((call) => (
            <button
              type="button"
              key={call}
              className={styles.call}
              data-call={call}
              aria-pressed={picked === call}
              onClick={(event) => {
                setPicked(call);
                if (call === round.answer) return;
                setMisses(misses + 1);
                if (
                  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                )
                  event.currentTarget.animate(
                    [
                      { transform: "translateX(0)" },
                      { transform: "translateX(-5px)" },
                      { transform: "translateX(5px)" },
                      { transform: "translateX(0)" },
                    ],
                    { duration: 200, easing: "ease-out" },
                  );
              }}
            >
              <span
                className={styles.han}
                aria-hidden="true"
                lang={call === "Pass" ? undefined : "zh-Hant"}
              >
                {HAN[call]}
              </span>
              {call}
            </button>
          ))}
        </div>
      )}
      {throwing && (
        <>
          <p className={styles.ask}>Now throw a tile.</p>
          <ThrowRow tiles={choices} onThrow={(i) => setThrown(choices[i])} />
        </>
      )}
      <p className={styles.nudge} role="status">
        {picked && !solved ? callNudge(round, picked) : ""}
      </p>
      {thrown && (
        <p className={styles.note} role="status">
          You threw {pieceName(thrown)}. Next player&rsquo;s turn.
        </p>
      )}
      {solved && !throwing && (
        <button
          type="button"
          className={styles.primary}
          onClick={() => onNext(misses === 0)}
        >
          {last ? "See how you did" : "Next round"}
        </button>
      )}
    </>
  );
}
