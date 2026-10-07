import PlayingTile from "@/components/PlayingTile";
import {
  IconStack2,
  IconHandClick,
  IconMessageCircle,
  IconCards,
  IconTrophy,
  IconSparkles,
} from "@tabler/icons-react";
import styles from "./guide.module.css";
import {
  WallPractice,
  CallPractice,
  TurnPractice,
} from "@/components/GuidePractice";
import Section from "@/components/Section";
import WinningHand from "@/components/WinningHand";
import TileSet from "@/components/TileSet";
import BackToTop from "@/components/BackToTop";
import { SPECIAL_HAND_POST } from "@/lib/site";

export const metadata = {
  title: "Mahjong Guide - Mahjong Club @ UVA",
  description:
    "A short guide to tiles, turns, winning hands and club scoring for new mahjong players.",
};

export default function Guide() {
  return (
    <main className={`guide-page ${styles.page}`} id="guide-top">
      <header className={`section-wrap ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <h1>Learn your first hand.</h1>
          <p>
            This is one of many ways to play Mahjong. No need to memorize it: we
            bring the sets and teach as we play.
          </p>
        </div>
      </header>
      <nav className={styles.lessonNav} aria-label="In this guide">
        <a href="#tiles">
          <IconCards aria-hidden="true" />
          <span>
            Tiles<small>Meet the pieces</small>
          </span>
        </a>
        <a href="#hand">
          <IconTrophy aria-hidden="true" />
          <span>
            The goal<small>Five sets and a pair</small>
          </span>
        </a>
        <a href="#turn">
          <IconHandClick aria-hidden="true" />
          <span>
            Your turn<small>Draw and discard</small>
          </span>
        </a>
        <a href="#calls">
          <IconMessageCircle aria-hidden="true" />
          <span>
            Calls<small>Pung, chow, pass</small>
          </span>
        </a>
        <a href="#fuzhou">
          <IconSparkles aria-hidden="true" />
          <span>
            Gold<small>And flowers</small>
          </span>
        </a>
        <a href="#setup">
          <IconStack2 aria-hidden="true" />
          <span>
            Set up<small>Break the wall</small>
          </span>
        </a>
      </nav>

      <Section id="tiles" title="Meet the tiles">
        <TileSet />
        <a className={styles.nextLesson} href="#hand">
          Next: the goal <span aria-hidden="true">→</span>
        </a>
      </Section>

      <Section id="hand" title="The goal: five sets and a pair">
        <WinningHand />
        <p className="quiet guide-note">
          You hold 16 tiles between turns and win with 17. The gold wildcard can
          stand in for the tile you’re missing.
        </p>
        {SPECIAL_HAND_POST && (
          <a
            className="special-hand-link"
            href={SPECIAL_HAND_POST}
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>See other special hands!</strong>
            <span>View on Instagram ↗</span>
          </a>
        )}
        <a className={styles.nextLesson} href="#turn">
          Next: try a turn <span aria-hidden="true">→</span>
        </a>
      </Section>

      <Section id="turn" title="Take a turn">
        <div className={styles.playSurface}>
          <TurnPractice />
        </div>
        <a className={styles.nextLesson} href="#calls">
          Next: learn the calls <span aria-hidden="true">→</span>
        </a>
      </Section>

      <Section id="calls" title="Make your call">
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
                Four matching tiles. Claim from anyone, or declare on your turn.
              </p>
            </div>
          </div>
          <p className={styles.callNote}>
            Call, show your set, then discard. After a kong, draw a replacement
            from the flower side first. Winds and dragons can pung or kong, but
            never chow.
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
        <a className={styles.nextLesson} href="#fuzhou">
          How do wildcards work? <span aria-hidden="true">→</span>
        </a>
      </Section>

      <Section id="fuzhou" title="The gold and the flowers">
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
              replacement from the flower side. Each one adds to your winnings.
            </dd>
          </div>
        </dl>
        <a className={styles.nextLesson} href="#setup">
          Next: set up the wall <span aria-hidden="true">→</span>
        </a>
      </Section>

      <Section id="setup" title="Set up the wall">
        <p className="guide-call-intro">
          On your first night someone will set up for you. Here’s how it works.
        </p>
        <div className={styles.playSurface}>
          <WallPractice />
        </div>
      </Section>

      <BackToTop target="guide-top" />
    </main>
  );
}
