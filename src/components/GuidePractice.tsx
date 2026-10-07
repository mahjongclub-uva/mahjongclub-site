"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconBulb,
  IconArrowRight,
  IconArrowLeft,
} from "@tabler/icons-react";
import PlayingTile, { TileFace, SuitFace } from "@/components/PlayingTile";
import {
  FIRST_CALL,
  FIRST_TURN,
  makeCallScenario,
  makeTurnHand,
  type CallScenario,
  SEATS,
  callFeedback,
  wallSeat,
  type Call,
} from "@/lib/guide-practice";
import styles from "./GuidePractice.module.css";

function Hint({ children }: { children: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting)
        timer = setTimeout(() => setVisible(true), 8000);
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className={styles.hint}>
      <button
        type="button"
        className={styles.helpButton}
        onClick={() => setVisible(true)}
        disabled={visible}
      >
        <IconBulb size={18} aria-hidden="true" /> Hint
      </button>
      <span role="status">{visible ? children : ""}</span>
    </div>
  );
}

export function WallPractice() {
  const [dice, setDice] = useState([3, 4]);
  const [stage, setStage] = useState<
    "ready" | "wall" | "break" | "draw" | "done"
  >("ready");
  const [count, setCount] = useState(1);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [taken, setTaken] = useState(0);
  const [selectedStack, setSelectedStack] = useState(1);
  const focusedStack = useRef<HTMLButtonElement>(null);
  const [feedback, setFeedback] = useState("");
  const nextStack = useRef<HTMLButtonElement>(null);
  const rack = useRef<HTMLDivElement>(null);
  const flightFrom = useRef<DOMRect | null>(null);
  const total = dice[0] + dice[1];
  const selectedSeat = wallSeat(total);
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
            duration: 650,
            delay: i * 90,
            fill: "backwards",
            easing: "cubic-bezier(.16,1,.3,1)",
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
    setDice([
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ]);
    setStage("wall");
    setCount(1);
    setFeedback("");
  }
  function chooseStack(n: number, button: HTMLButtonElement) {
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
      flightFrom.current = button
        .querySelector("span")!
        .getBoundingClientRect();
      setTaken(taken + 1);
      if (taken === 1) {
        setStage("done");
        setFeedback("");
      } else setFeedback("");
    }
  }
  const prompt =
    stage === "ready"
      ? "You’re the dealer. Roll to start!"
      : stage === "wall"
        ? "Whose wall did you land on?"
        : stage === "break"
          ? "Find the break."
          : stage === "draw"
            ? "Grab your tiles."
            : "Wall open. You’re dealt in!";
  return (
    <div
      className={`${styles.lesson} ${styles.wallGame}`}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard";
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer";
      }}
    >
      <p className={styles.gameBadge}>144 tiles · 4 walls · 18 stacks</p>
      <ol className={styles.progress} aria-label="Lesson progress">
        {["Roll", "Find the wall", "Open it", "Take tiles"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? "step" : undefined}
            data-complete={step > i || stage === "done"}
          >
            <span>{step > i || stage === "done" ? "✓" : i + 1}</span>
            <span className={styles.progressLabel}>{label}</span>
          </li>
        ))}
      </ol>
      <div className={styles.gamePrompt}>
        <h3>{prompt}</h3>
        <p>
          {stage === "ready"
            ? "Tap the dice to throw them."
            : stage === "wall"
              ? `You rolled ${total}. Count around the table from your seat, then tap that wall.`
              : stage === "break"
                ? `Step ${total} stacks in from the wall’s right end, then break it open.`
                : stage === "draw"
                  ? "Tap the two stacks just past the gap. That’s four tiles."
                  : "Four tiles in your rack."}
        </p>
      </div>
      <div className={styles.gameBoard} data-closeup={closeUp}>
        <div className={styles.feltMark} aria-hidden="true">
          麻
        </div>
        {!closeUp ? (
          <div className={styles.overhead}>
            {SEATS.map((seat, i) => (
              <button
                type="button"
                key={seat}
                className={`${styles.seat} ${styles[`seat${i}`]}`}
                data-active={stage === "wall" && wallSeat(count) === i}
                disabled={stage !== "wall"}
                aria-label={`${seat}${i === 0 ? " · dealer" : ""}`}
                onClick={() => {
                  if (i === selectedSeat) {
                    setPlaying(false);
                    setStage("break");
                    setFeedback("");
                  } else
                    setFeedback(
                      "Try again. You are 1; right is 2, across is 3, left is 4. Keep counting.",
                    );
                }}
              >
                <span>
                  {seat}
                  {i === 0 ? " · dealer" : ""}
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
              </button>
            ))}
            <div className={styles.tableCenter}>
              <button
                type="button"
                className={styles.diceButton}
                data-ready={stage === "ready"}
                disabled={stage !== "ready"}
                aria-label={
                  stage === "ready"
                    ? "Roll two dice"
                    : `Dice ${dice[0]} and ${dice[1]}, total ${total}`
                }
                onClick={roll}
              >
                <span
                  key={round}
                  className={styles.dice}
                  data-rolled={round > 0}
                  aria-hidden="true"
                >
                  {dice.map((value, i) => (
                    <span key={i}>
                      {["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][value]}
                    </span>
                  ))}
                </span>
                {stage === "ready" && (
                  <span className={styles.rollLabel}>
                    Roll <IconArrowRight size={18} aria-hidden="true" />
                  </span>
                )}
              </button>
              {stage !== "ready" && <strong>Total {total}</strong>}
              {stage === "wall" && (
                <span key={count} className={styles.countLabel} role="status">
                  {count} · {SEATS[wallSeat(count)]}
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
              {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
                <button
                  type="button"
                  key={n}
                  ref={(node) => {
                    if (n === total + taken + 1) nextStack.current = node;
                    if (n === focus) focusedStack.current = node;
                  }}
                  aria-label={`Stack ${n}`}
                  aria-pressed={
                    stage === "break" ? n === selectedStack : undefined
                  }
                  data-near={n >= windowStart && n < windowStart + 5}
                  disabled={
                    stage === "done" || (n > total && n <= total + taken)
                  }
                  data-break={stage !== "break" && n === total}
                  data-next={stage === "draw" && n === total + taken + 1}
                  data-drawn={n > total && n <= total + taken}
                  onClick={(event) => {
                    if (stage === "break") {
                      setSelectedStack(n);
                      setFeedback("");
                    } else chooseStack(n, event.currentTarget);
                  }}
                >
                  <span
                    className={styles.stackTile}
                    aria-hidden="true"
                    style={{ animationDelay: `${(n - 1) * 22}ms` }}
                  />
                  <span>{n}</span>
                </button>
              ))}
            </div>
            {stage === "break" && (
              <div className={styles.breakControls}>
                <div className={styles.countControls}>
                  <button
                    type="button"
                    aria-label="Count left"
                    disabled={selectedStack === 18}
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
                    disabled={selectedStack === 1}
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
                  onClick={() => {
                    if (focusedStack.current)
                      chooseStack(selectedStack, focusedStack.current);
                  }}
                >
                  Break it here
                </button>
              </div>
            )}
            {stage === "draw" && (
              <button
                type="button"
                className={styles.dealNext}
                onClick={() => {
                  if (nextStack.current)
                    chooseStack(total + taken + 1, nextStack.current);
                }}
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
              <span>You · dealer</span>
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
                  <strong>Player on your right is next</strong>Dealing carries
                  on counterclockwise.
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
        {(stage === "wall" || stage === "break") && (
          <Hint key={`${round}-${stage}`}>
            {stage === "wall"
              ? "Start at your seat. Every fourth count brings you back to the same player."
              : "Each stack is two tiles. Start at 1 on the right."}
          </Hint>
        )}
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

export function CallPractice() {
  const [round, setRound] = useState(0);
  const [scenario, setScenario] = useState(FIRST_CALL);
  return (
    <div
      className={styles.lesson}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard";
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer";
      }}
    >
      <p className="eyebrow">Your call · round {round + 1}</p>
      <p>Can you claim this tile?</p>
      <CallRound
        key={round}
        scenario={scenario}
        onNext={() => {
          setScenario(makeCallScenario());
          setRound(round + 1);
        }}
      />
    </div>
  );
}

function CallRound({
  scenario,
  onNext,
}: {
  scenario: CallScenario;
  onNext: () => void;
}) {
  const [choice, setChoice] = useState<Call | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const resolved = choice === "Pass" || choice === scenario.call;
  const claimed = resolved && choice !== "Pass";
  return (
    <>
      <div className={styles.callScene}>
        <div className={styles.callAnnouncement} aria-hidden="true">
          <div
            key={attempt}
            className={styles.callBubble}
            data-call={claimed ? choice : "neutral"}
            data-react={choice !== null}
          >
            <strong lang={claimed ? "zh" : undefined}>
              {claimed
                ? choice === "Pung"
                  ? "碰!"
                  : "吃!"
                : choice === "Pass"
                  ? "→"
                  : choice
                    ? "Hmm…"
                    : "Your move!"}
            </strong>
            <span>
              {claimed
                ? `${choice}!`
                : choice === "Pass"
                  ? "Let it go"
                  : choice
                    ? "Try another call"
                    : "Spot it. Call it."}
            </span>
          </div>
        </div>
        <div>
          <p>{scenario.from} discarded</p>
          <ul className="tile-row" aria-label="Latest discard">
            {!claimed && (
              <PlayingTile suit={scenario.suit} rank={scenario.discard} />
            )}
          </ul>
          {claimed && <span>Claimed ↓</span>}
        </div>
        <div>
          <p>{claimed ? "Your exposed set" : "Your matching tiles"}</p>
          <ul
            className={`tile-row ${claimed ? styles.meld : ""}`}
            aria-label={claimed ? "Exposed set" : "Tiles in your hand"}
          >
            {scenario.ranks.map((rank, i) => (
              <PlayingTile key={i} suit={scenario.suit} rank={rank} />
            ))}
            {claimed && (
              <PlayingTile suit={scenario.suit} rank={scenario.discard} />
            )}
          </ul>
        </div>
      </div>
      <div
        role="group"
        className={styles.callActions}
        aria-label="Choose your call"
      >
        {(["Pung", "Chow", "Pass"] as const).map((call) => (
          <button
            type="button"
            key={call}
            className={styles.callButton}
            data-call={call}
            aria-label={call}
            disabled={resolved}
            aria-pressed={choice === call}
            onClick={() => {
              setChoice(call);
              setAttempt(attempt + 1);
            }}
          >
            <span
              className={styles.callCharacter}
              aria-hidden="true"
              lang={call !== "Pass" ? "zh" : undefined}
            >
              {call === "Pung" ? "碰" : call === "Chow" ? "吃" : "→"}
            </span>
            <strong>{call}</strong>
            <span>
              {call === "Pung"
                ? "Three alike"
                : call === "Chow"
                  ? "Three in a row"
                  : "Let it go"}
            </span>
          </button>
        ))}
      </div>
      {!choice && <Hint>{scenario.hint}</Hint>}
      <p role="status" className={styles.feedback}>
        {choice
          ? callFeedback(scenario, choice)
          : "What can you do with this discard?"}
      </p>
      {claimed && (
        <div className={styles.claimFinish} data-discarded={discarded}>
          {discarded ? (
            <div
              className={styles.claimTile}
              aria-label={`Discarded ${scenario.after.rank} of ${scenario.after.suit}`}
            >
              <TileFace index={String(scenario.after.rank)}>
                <SuitFace
                  suit={scenario.after.suit}
                  rank={scenario.after.rank}
                />
              </TileFace>
            </div>
          ) : (
            <button
              type="button"
              className={styles.claimTile}
              aria-label={`Discard ${scenario.after.rank} of ${scenario.after.suit}`}
              onClick={() => setDiscarded(true)}
            >
              <TileFace index={String(scenario.after.rank)}>
                <SuitFace
                  suit={scenario.after.suit}
                  rank={scenario.after.rank}
                />
              </TileFace>
            </button>
          )}
          <div className={styles.claimInstruction} role="status">
            <strong>{discarded ? "Discard played" : "Tap to discard"}</strong>
            <p>
              {discarded
                ? "Next player’s turn, unless someone calls."
                : "Play this tile to finish your call. No need to draw."}
            </p>
          </div>
        </div>
      )}
      {resolved && (!claimed || discarded) && (
        <button type="button" className={styles.primaryButton} onClick={onNext}>
          Next tile
        </button>
      )}
    </>
  );
}

export function TurnPractice() {
  const [step, setStep] = useState(0);
  const [discardIndex, setDiscardIndex] = useState<number | null>(null);
  const [tiles, setTiles] = useState(FIRST_TURN);
  const discard = discardIndex === null ? null : tiles[discardIndex];
  return (
    <div
      className={`${styles.lesson} ${styles.turnLesson}`}
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.input = "keyboard";
      }}
      onPointerDownCapture={(event) => {
        event.currentTarget.dataset.input = "pointer";
      }}
    >
      <p className={styles.turnStatus} role="status">
        {step === 0
          ? "Your turn. Draw a tile!"
          : step === 1
            ? "Now tap a tile to throw away."
            : "Turn done. Next player’s up."}
        <span>{step === 1 ? "17 tiles" : "16 tiles"} in hand</span>
      </p>
      <div className={styles.turnTable}>
        <div className={styles.turnTop}>
          <div>
            <p>Wall</p>
            <button
              type="button"
              className={styles.turnWall}
              disabled={step !== 0}
              aria-label={step === 0 ? "Draw a tile from the wall" : "Wall"}
              onClick={() => setStep(1)}
            >
              <i className={styles.stackTile} />
              <i className={styles.stackTile} />
              {step === 0 && <i className={styles.stackTile} />}
            </button>
            {step === 0 && <span className={styles.tapCue}>Tap to draw</span>}
          </div>
          <div>
            <p>Discard</p>
            <ul
              className={`tile-row ${styles.discardSlot}`}
              aria-label="Discard pile"
            >
              {discard && (
                <PlayingTile suit={discard.suit} rank={discard.rank} />
              )}
            </ul>
          </div>
        </div>
        <p>
          Your hand <small>· a few tiles shown</small>
        </p>
        <ul
          className={`tile-row ${styles.turnHand} ${step === 1 ? styles.turnDraw : ""}`}
          aria-label="Example tiles in your hand"
        >
          {tiles.map((tile, i) =>
            (step === 0 && i === 2) || i === discardIndex ? null : (
              <li key={i}>
                <button
                  type="button"
                  className={styles.turnChoice}
                  disabled={step !== 1}
                  data-hint={step === 1 && i === 3}
                  aria-label={
                    step === 1
                      ? `Discard ${tile.rank} of ${tile.suit}`
                      : `${tile.rank} of ${tile.suit}`
                  }
                  aria-describedby={
                    step === 1 && i === 3 ? "discard-hint" : undefined
                  }
                  onClick={() => {
                    setDiscardIndex(i);
                    setStep(2);
                  }}
                >
                  <TileFace index={String(tile.rank)}>
                    <SuitFace suit={tile.suit} rank={tile.rank} />
                  </TileFace>
                </button>
              </li>
            ),
          )}
        </ul>
        {step === 1 && (
          <p id="discard-hint" className={styles.discardHint}>
            Tip: which tile doesn’t fit with the others?
          </p>
        )}
      </div>
      {step === 2 && (
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => {
            setDiscardIndex(null);
            setTiles(makeTurnHand());
            setStep(0);
          }}
        >
          Play another turn
        </button>
      )}

      <p className={styles.turnNote}>
        {step === 2
          ? discardIndex === 3
            ? "Run kept. Next player draws, unless someone calls."
            : `Valid discard. Keeping ${tiles[0].rank}–${tiles[1].rank}–${tiles[2].rank} would preserve the run.`
          : "An ordinary turn: draw, then discard."}
      </p>
    </div>
  );
}
