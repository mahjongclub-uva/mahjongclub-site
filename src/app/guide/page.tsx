import { IconArrowUp } from "@tabler/icons-react";
import Section from "@/components/Section";
import WinningHand from "@/components/WinningHand";
import TileSet from "@/components/TileSet";

export const metadata = {
  title: "Mahjong Guide - Mahjong Club @ UVA",
  description:
    "A short guide to tiles, turns, winning hands and club scoring for new mahjong players.",
};

export default function Guide() {
  return (
    <main className="guide-page" id="guide-top">
      <header className="page-head guide-head">
        <div className="section-wrap">
          <p className="eyebrow">Mahjong guide</p>
          <h1 className="page-title">Learn your first hand</h1>
          <p className="page-intro">
            No need to memorize this before you join us. Get to know a few
            tiles, try a hand, and ask questions as you go.
          </p>
          <nav className="guide-index" aria-label="In this guide">
            <ol>
              <li>
                <a href="#tiles">
                  <span>01</span> Meet the tiles
                </a>
              </li>
              <li>
                <a href="#hand">
                  <span>02</span> Build a hand
                </a>
              </li>
              <li>
                <a href="#calls">
                  <span>03</span> Learn the calls
                </a>
              </li>
              <li>
                <a href="#turn">
                  <span>04</span> Take a turn
                </a>
              </li>
              <li>
                <a href="#first-table">
                  <span>05</span> Join a table
                </a>
              </li>
            </ol>
          </nav>
        </div>
      </header>

      <Section id="tiles" title="Meet the tiles">
        <TileSet />
        <dl className="tile-key">
          <div>
            <dt>Three suits</dt>
            <dd>Characters, bamboo and dots are numbered one through nine.</dd>
          </div>
          <div>
            <dt>Honor tiles</dt>
            <dd>The four winds and three dragons do not form sequences.</dd>
          </div>
          <div>
            <dt>The gold</dt>
            <dd>
              Our Fuzhou-style game uses a wildcard that can stand in for
              another tile.
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="hand" title="Build a winning hand">
        <WinningHand />
        <div className="prose guide-prose reading">
          <p>
            A hand comes together in sets (also called melds). Three identical
            tiles make a pung; three consecutive tiles in one suit make a chow.
            A kong is four identical tiles and counts as one set.
          </p>
          <p>
            In Fuzhou-style play, you hold sixteen tiles between turns. The
            example above finishes with seventeen: five sets and a pair. The
            gold wildcard gives you more ways to get there.
          </p>
        </div>
      </Section>

      <Section id="calls" title="Pung, pong, peng? Chow, chi?">
        <p className="guide-call-intro">
          Two shapes, with a few names you might hear at the table.
        </p>
        <dl className="call-guide">
          <div>
            <dt>
              Pung / pong / peng
              <span className="call-character" lang="zh-Hans">碰</span>
              <span>Three of a kind</span>
            </dt>
            <dd>
              Three identical tiles, such as three eight-dot tiles. If you hold
              two, you can usually call pung to claim the latest matching
              discard from any player.
            </dd>
          </div>
          <div>
            <dt>
              Chow / chi
              <span className="call-character" lang="zh-Hans">吃</span>
              <span>A sequence</span>
            </dt>
            <dd>
              Three consecutive numbers in the same suit, such as five, six, and
              seven bamboo. A chow is normally claimed only from the player to
              your left, immediately before your turn.
            </dd>
          </div>
        </dl>
        <p className="quiet guide-note">
          After a pung or chow call, show the completed set and discard a tile.
          Winds and dragons can form pungs, but not chows. Ask the table about
          local calling rules and the gold wildcard.
        </p>
        <p className="quiet">
          Terminology:{" "}
          <a href="https://www.mahjongtime.com/chinese-official-mahjong-rules-2.html">
            pung and chow
          </a>
          ; <a href="https://riichi.wiki/Naki">chi and pon call names</a>. Rules
          vary by mahjong style.
        </p>
      </Section>

      <Section id="turn" title="Take a turn">
        <ol className="turn-flow">
          <li>
            <strong>Draw</strong>
            <span>Take one tile from the wall.</span>
          </li>
          <li>
            <strong>Read your hand</strong>
            <span>Look for groups that are complete or one tile away.</span>
          </li>
          <li>
            <strong>Discard</strong>
            <span>Return one tile face-up to the center.</span>
          </li>
        </ol>
        <p className="quiet guide-note">
          A discard can sometimes be claimed to finish a group. Calls vary by
          situation, so a club member will prompt you when one is available.
        </p>
      </Section>

      <Section id="first-table" title="Your first table">
        <div className="prose guide-prose reading">
          <p>
            Just bring yourself. We provide the sets, explain the gold tile, and
            play a practice hand before recording a score.
          </p>
          <p>
            Ask questions as you play. Nobody expects you to know every tile.
          </p>
        </div>
      </Section>
      <div className="guide-top-link">
        <a className="action-link" href="#guide-top">
          <IconArrowUp size={18} aria-hidden="true" /> Back to top
        </a>
      </div>
    </main>
  );
}
