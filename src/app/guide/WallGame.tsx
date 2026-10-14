"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconArrowRight,
  IconArrowLeft,
} from "@tabler/icons-react";
import { SEATS, wallSeat } from "@/lib/guide-practice";
import styles from "./wall.module.css";
import games from "./games.module.css";
import useKeepFocus from "./useKeepFocus";

export default function WallGame() {
  const [dice, setDice] = useState([3, 4]);
  const [dealer, setDealer] = useState(0);
  const [stage, setStage] = useState<
    "ready" | "wall" | "break" | "draw" | "done"
  >("ready");
  const [count, setCount] = useState(1);
  const game = useKeepFocus<HTMLDivElement>(stage);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [taken, setTaken] = useState(0);
  const [selectedStack, setSelectedStack] = useState(1);
  const [feedback, setFeedback] = useState("");
  const rack = useRef<HTMLDivElement>(null);
  const flightFrom = useRef<DOMRect | null>(null);
  const total = dice[0] + dice[1];
  const selectedSeat = wallSeat(total, dealer);
  const dealerName = dealer === 0 ? "You" : SEATS[dealer];
  const next = (dealer + 1) % 4;
  const focus =
    stage === "break" ? selectedStack : Math.min(total + taken + 1, 18);
  const windowStart = Math.max(1, Math.min(focus - 2, 14));
  const closeUp = stage === "break" || stage === "draw" || stage === "done";
  const step =
    stage === "ready" ? 0 : stage === "wall" ? 1 : stage === "break" ? 2 : 3;
  useEffect(() => {
    if (!playing || stage !== "wall" || count >= total) return;
    const timer = setTimeout(() => setCount(count + 1), 650);
    return () => clearTimeout(timer);
  }, [playing, stage, count, total]);
  useLayoutEffect(() => {
    const from = flightFrom.current;
    if (
      rack.current?.closest("[data-input=keyboard]") ||
      !taken ||
      !from ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const tiles = rack.current?.querySelectorAll<HTMLElement>("i");
    const animations = Array.from(tiles ?? [])
      .slice(-2)
      .map((tile, i) => {
        const to = tile.getBoundingClientRect();
        return tile.animate(
          [
            {
              transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) rotate(-6deg)`,
              opacity: 1,
            },
            { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          ],
          {
            duration: 280,
            delay: i * 60,
            fill: "backwards",
            easing: "cubic-bezier(0.23, 1, 0.32, 1)",
          },
        );
      });
    return () => animations.forEach((animation) => animation.cancel());
  }, [taken]);
  function roll() {
    setPlaying(false);
    setTaken(0);
    setSelectedStack(1);
    setRound(round + 1);
    setDealer(Math.floor(Math.random() * 4));
    setDice([
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ]);
    setStage("wall");
    setCount(1);
    setFeedback("");
  }
  function chooseStack(n: number) {
    if (stage === "break") {
      if (n !== total) {
        setFeedback(
          `Not quite. Count ${total} stacks from the right, then open the gap.`,
        );
        return;
      }
      setStage("draw");
      setFeedback("");
    } else if (stage === "draw") {
      if (n !== total + taken + 1) {
        setFeedback("Start just beyond the gap and keep moving left.");
        return;
      }
      flightFrom.current =
        rack.current?.parentElement
          ?.querySelector(`[aria-label="Stack ${n}"] span`)
          ?.getBoundingClientRect() ?? null;
      setTaken(taken + 1);
      if (taken === 1) {
        setStage("done");
        setFeedback("");
      } else setFeedback("");
    }
  }
  const prompt =
    stage === "ready"
      ? "Roll to start!"
      : stage === "wall"
        ? "Whose wall did you land on?"
        : stage === "break"
          ? "Find the break."
          : stage === "draw"
            ? dealer === 0
              ? "Grab your tiles."
              : "Grab the dealer’s tiles."
            : dealer === 0
              ? "Wall open. You’re dealt in!"
              : "Wall open. The dealer’s dealt in!";
  return (
    <div
      ref={game}
      className={styles.lesson}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard";
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer";
      }}
    >
      <div className={games.top}>
        <span className={games.chip}>
          {stage === "done" ? "Dealt in" : `Step ${step + 1} of 4`}
        </span>
        <ol className={games.bar} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              data-state={
                i < step || stage === "done" ? "done" : i === step ? "now" : ""
              }
            />
          ))}
        </ol>
      </div>
      <div className={styles.gamePrompt}>
        <h3>{prompt}</h3>
        <p>
          {stage === "ready"
            ? "The dice pick a dealer, who rolls."
            : stage === "wall"
              ? `${dealerName} ${dealer === 0 ? "deal" : "deals"} and rolled ${total}. Count seats from the dealer.`
              : stage === "break"
                ? `Count ${total} stacks from the right end.`
                : stage === "draw"
                  ? "The dealer takes the two stacks past the gap."
                  : `Four tiles in ${dealer === 0 ? "your" : "the dealer’s"} rack.`}
        </p>
      </div>
      <div className={styles.gameBoard} data-closeup={closeUp}>
        {!closeUp ? (
          <div className={styles.overhead}>
            {SEATS.map((seat, i) => {
              const isDealer = stage !== "ready" && i === dealer;
              const inside = (
                <>
                  <span data-dealer={isDealer}>
                    {seat}
                    {isDealer ? " · deals" : ""}
                  </span>
                  <span
                    key={round}
                    className={styles.miniWall}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 18 }, (_, n) => (
                      <i key={n} style={{ animationDelay: `${n * 20}ms` }} />
                    ))}
                  </span>
                </>
              );
              const className = `${styles.seat} ${styles[`seat${i}`]}`;
              if (stage !== "wall")
                return (
                  <span key={seat} className={className}>
                    {inside}
                  </span>
                );
              return (
                <button
                  type="button"
                  key={seat}
                  className={className}
                  data-active={wallSeat(count, dealer) === i}
                  aria-label={`${seat}${isDealer ? " · dealer" : ""}`}
                  onClick={() => {
                    if (i === selectedSeat) {
                      setPlaying(false);
                      setStage("break");
                      setFeedback("");
                    } else
                      setFeedback(
                        "Try again. The dealer is 1, then count counterclockwise, one seat per number.",
                      );
                  }}
                >
                  {inside}
                </button>
              );
            })}
            <div className={styles.tableCenter}>
              {stage === "ready" ? (
                <button
                  type="button"
                  className={styles.diceButton}
                  data-ready="true"
                  aria-label="Roll two dice"
                  onClick={roll}
                >
                  <Dice key={round} dice={dice} rolled={round > 0} />
                  <span className={styles.rollLabel}>
                    Roll <IconArrowRight size={18} aria-hidden="true" />
                  </span>
                </button>
              ) : (
                <span
                  className={styles.diceButton}
                  role="img"
                  aria-label={`Dice ${dice[0]} and ${dice[1]}, total ${total}`}
                >
                  <Dice key={round} dice={dice} rolled={round > 0} />
                </span>
              )}
              {stage !== "ready" && <strong>Total {total}</strong>}
              {stage === "wall" && (
                <span key={count} className={styles.countLabel} role="status">
                  {count} · {SEATS[wallSeat(count, dealer)]}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.wallCloseup} data-stage={stage}>
            <div className={styles.wallCaption}>
              <span>
                {selectedSeat === 0
                  ? "Your wall"
                  : `${SEATS[selectedSeat]}'s wall`}
              </span>
              <div
                role="group"
                className={styles.rollReminder}
                aria-label={`Rolled ${total}: ${dice[0]} plus ${dice[1]}`}
              >
                <span>
                  Rolled<strong>{total}</strong>
                </span>
                <span>
                  {dice[0]} + {dice[1]}
                </span>
              </div>
            </div>
            <p className={styles.direction}>← Count this way</p>
            <div className={styles.wallOverview} aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
                <i
                  key={n}
                  data-selected={n === focus}
                  data-break={stage !== "break" && n === total}
                  data-drawn={n > total && n <= total + taken}
                />
              ))}
            </div>
            <div
              role="group"
              className={styles.stacks}
              aria-label="18 stacks, numbered from the owner's right"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((n) =>
                stage === "done" ? (
                  <span
                    key={n}
                    className={styles.stackDone}
                    data-near={n >= windowStart && n < windowStart + 5}
                    data-break={n === total}
                    data-drawn={n > total && n <= total + taken}
                  >
                    <span className={styles.stackTile} aria-hidden="true" />
                    <span>{n}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    key={n}
                    aria-label={`Stack ${n}`}
                    aria-pressed={
                      stage === "break" ? n === selectedStack : undefined
                    }
                    data-near={n >= windowStart && n < windowStart + 5}
                    disabled={n > total && n <= total + taken}
                    data-break={stage !== "break" && n === total}
                    data-next={stage === "draw" && n === total + taken + 1}
                    data-drawn={n > total && n <= total + taken}
                    onClick={() => {
                      if (stage === "break") {
                        setSelectedStack(n);
                        setFeedback("");
                      } else chooseStack(n);
                    }}
                  >
                    <span
                      className={styles.stackTile}
                      aria-hidden="true"
                      style={{ animationDelay: `${(n - 1) * 22}ms` }}
                    />
                    <span>{n}</span>
                  </button>
                ),
              )}
            </div>
            {stage === "break" && (
              <div className={styles.breakControls}>
                <div className={styles.countControls}>
                  <button
                    type="button"
                    aria-label="Count left"
                    hidden={selectedStack === 18}
                    onClick={() => {
                      setSelectedStack(selectedStack + 1);
                      setFeedback("");
                    }}
                  >
                    <IconArrowLeft size={20} aria-hidden="true" />
                  </button>
                  <span role="status">Stack {selectedStack}</span>
                  <button
                    type="button"
                    aria-label="Count right"
                    hidden={selectedStack === 1}
                    onClick={() => {
                      setSelectedStack(selectedStack - 1);
                      setFeedback("");
                    }}
                  >
                    <IconArrowRight size={20} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.dealNext}
                  onClick={() => chooseStack(selectedStack)}
                >
                  Break it here
                </button>
              </div>
            )}
            {stage === "draw" && (
              <button
                type="button"
                className={styles.dealNext}
                onClick={() => chooseStack(total + taken + 1)}
              >
                <IconArrowRight size={20} aria-hidden="true" />
                Grab stack {taken + 1} of 2
              </button>
            )}
            <div
              ref={rack}
              role="group"
              className={styles.rack}
              aria-label={`Dealer’s hand: ${taken * 2} of 4 tiles dealt`}
            >
              <span>{dealerName} · dealer</span>
              <div>
                {Array.from({ length: 4 }, (_, n) => (
                  <span
                    key={n}
                    className={styles.rackSlot}
                    data-filled={n < taken * 2}
                  >
                    {n < taken * 2 && (
                      <i
                        className={styles.stackTile}
                        style={{ animationDelay: `${(n % 2) * 90}ms` }}
                      />
                    )}
                  </span>
                ))}
              </div>
              <span>{taken} / 2 stacks</span>
            </div>
            {stage === "done" && (
              <div className={styles.nextPlayer} role="status">
                <IconArrowRight size={22} aria-hidden="true" />
                <span>
                  <strong>
                    {next === 0 ? "You’re next" : `${SEATS[next]} is next`}
                  </strong>
                  Dealing carries on counterclockwise.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.gameControls}>
        {stage === "wall" && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                if (count === total) {
                  setCount(1);
                  setPlaying(true);
                } else setPlaying(!playing);
              }}
            >
              {playing && count < total ? (
                <IconPlayerPause size={18} aria-hidden="true" />
              ) : (
                <IconPlayerPlay size={18} aria-hidden="true" />
              )}
              {count === total
                ? "Watch again"
                : playing
                  ? "Pause"
                  : "Count it for me"}
            </button>
          </div>
        )}
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
        {stage !== "ready" && (
          <button
            type="button"
            className={stage === "done" ? styles.primaryButton : styles.replay}
            onClick={roll}
          >
            <IconRefresh size={18} aria-hidden="true" />
            {stage === "done" ? "Play again" : "Start over"}
          </button>
        )}
      </div>
      <details className={styles.rules}>
        <summary>How we set up at the club</summary>
        <p>
          With 144 tiles, build four walls of 18 stacks, two tiles high. Before
          the first game, everyone rolls; whoever rolls highest becomes the
          dealer and rolls again to choose the break. Afterward, the previous
          winner rolls. This lesson uses one two-dice total to choose both the
          wall and the break. Table rules can vary.
        </p>
      </details>
    </div>
  );
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Two dice drawn with pips, like the club's own. */
function Dice({ dice, rolled }: { dice: number[]; rolled: boolean }) {
  return (
    <span className={styles.dice} data-rolled={rolled} aria-hidden="true">
      {dice.map((value, i) => (
        <span key={i}>
          {Array.from({ length: 9 }, (_, n) => (
            <i key={n} data-on={PIPS[value].includes(n)} />
          ))}
        </span>
      ))}
    </span>
  );
}
