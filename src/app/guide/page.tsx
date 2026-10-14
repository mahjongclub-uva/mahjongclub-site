import PlayingTile from "@/components/PlayingTile";
import { IconBrandInstagram } from "@tabler/icons-react";
import styles from "./guide.module.css";
import {
  WallPractice,
  CallPractice,
  TurnPractice,
} from "@/components/GuidePractice";
import Lesson from "./Lesson";
import LessonRack from "./LessonRack";
import WinningHand from "@/components/WinningHand";
import TileSet from "@/components/TileSet";
import { SPECIAL_HAND_POST } from "@/lib/site";

export const metadata = {
  title: "Mahjong Guide - Mahjong Club @ UVA",
  description:
    "A short guide to tiles, turns, winning hands and club scoring for new mahjong players.",
};

export default function Guide() {
  return (
    <main className={`guide-page ${styles.page}`}>
      <div className="section-wrap">
        <header className={styles.hero}>
          <h1>Learn your first hand</h1>
          <p className={styles.qualifier}>We teach as we play.</p>
        </header>
        <LessonRack />

        <Lesson
          id="tiles"
          number={1}
          title="Meet the tiles"
          qualifier="144 in a set"
        >
          <TileSet />
        </Lesson>

        <Lesson
          id="hand"
          number={2}
          title="The goal"
          qualifier="five sets and a pair"
        >
          <WinningHand />
          <ul className={styles.chips} aria-label="Counting to a win">
            <li>16 in hand</li>
            <li>17 to win</li>
            <li>
              <span lang="zh-Hans">金</span> fills a gap
            </li>
          </ul>
          {SPECIAL_HAND_POST && (
            <a
              className={styles.softButton}
              href={SPECIAL_HAND_POST}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconBrandInstagram aria-hidden="true" />
              Other special hands
            </a>
          )}
        </Lesson>

        <Lesson
          id="setup"
          number={3}
          title="Set up the wall"
          qualifier="we’ll do it for you at first"
        >
          <div className={styles.playSurface}>
            <WallPractice />
          </div>
        </Lesson>

        <Lesson
          id="fuzhou"
          number={4}
          title="Gold and flowers"
          qualifier="the Fuzhou twist"
        >
          <figure className={styles.goldExample}>
            <div className={styles.goldTiles}>
              <ul className="tile-row" aria-label="Two eight-dot tiles">
                <PlayingTile suit="dots" rank={8} />
                <PlayingTile suit="dots" rank={8} />
              </ul>
              <span className={styles.goldPlus} aria-hidden="true">
                +
              </span>
              <div className={styles.goldTile}>
                <ul
                  className="tile-row"
                  aria-label="Five bamboo, the gold in this example"
                >
                  <PlayingTile suit="bamboo" rank={5} />
                </ul>
                <span>Gold</span>
              </div>
            </div>
            <figcaption>
              <strong>Gold fills the gap.</strong>
              <p>
                If five bamboo is gold, it can stand in for the third eight-dot
                tile in your hand.
              </p>
            </figcaption>
          </figure>
          <dl className="call-guide">
            <div>
              <dt>
                The gold
                <span className="call-character" lang="zh-Hans">
                  金
                </span>
              </dt>
              <dd>
                After the deal, flip the first tile on the flower side of the
                wall. That tile is the gold, the wildcard for this hand: it can
                stand in for any tile you need.
              </dd>
            </div>
            <div>
              <dt>
                Flowers
                <span className="call-character" lang="zh-Hans">
                  花
                </span>
              </dt>
              <dd>
                Draw a flower or season? Set it face-up beside you and draw a
                replacement from the flower side. Each one adds to your
                winnings.
              </dd>
            </div>
          </dl>
        </Lesson>

        <Lesson
          id="turn"
          number={5}
          title="Take a turn"
          qualifier="draw, then discard"
        >
          <div className={styles.playSurface}>
            <TurnPractice />
          </div>
        </Lesson>

        <Lesson
          id="calls"
          number={6}
          title="Make your call"
          qualifier="claim a discard"
        >
          <div className={styles.callRules}>
            <div className={styles.callExamples}>
              <div>
                <h3>Pung</h3>
                <ul
                  className="tile-row"
                  aria-label="Pung example: three eight-dot tiles"
                >
                  {[0, 1, 2].map((n) => (
                    <PlayingTile key={n} suit="dots" rank={8} />
                  ))}
                </ul>
                <p>Three matching tiles. Claim from anyone.</p>
              </div>
              <div>
                <h3>Chow</h3>
                <ul
                  className="tile-row"
                  aria-label="Chow example: five, six, seven bamboo"
                >
                  {[5, 6, 7].map((n) => (
                    <PlayingTile key={n} suit="bamboo" rank={n} />
                  ))}
                </ul>
                <p>Three in sequence, one suit. Claim from your left.</p>
              </div>
              <div>
                <h3>Kong</h3>
                <ul
                  className="tile-row"
                  aria-label="Kong example: four three-character tiles"
                >
                  {[0, 1, 2, 3].map((n) => (
                    <PlayingTile key={n} suit="characters" rank={3} />
                  ))}
                </ul>
                <p>
                  Four matching tiles. Claim from anyone, or declare on your
                  turn.
                </p>
              </div>
            </div>
            <p className={styles.callNote}>
              Call, show your set, then discard. After a kong, draw a
              replacement from the flower side first. Winds and dragons can pung
              or kong, but never chow.
            </p>
            <p className={styles.callNote}>
              You may also hear pong or peng for pung, chi for chow, and kang or
              gang for kong.{" "}
              <a href="https://www.mahjongtime.com/chinese-official-mahjong-rules-2.html">
                Call terminology
              </a>
              .
            </p>
          </div>
          <div className={styles.playSurface}>
            <CallPractice />
          </div>
        </Lesson>
      </div>
    </main>
  );
}
