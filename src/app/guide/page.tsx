import Section from "@/components/Section";
import TileSet from "@/components/TileSet";

export const metadata = {
  title: "Mahjong Guide - Mahjong Club @ UVA",
  description:
    "A short guide to tiles, turns, winning hands and club scoring for new mahjong players.",
};

export default function Guide() {
  return (
    <main>
      <header className="page-head guide-head">
        <div className="section-wrap">
          <p className="eyebrow">Mahjong guide</p>
          <h1 className="page-title">Learn your first hand</h1>
          <p className="page-intro">
            You only need a few ideas to sit down and start playing. We teach
            the table rules as you go.
          </p>
          <nav className="guide-index" aria-label="In this guide">
            <a href="#tiles">Tiles</a>
            <a href="#hand">Winning hands</a>
            <a href="#turn">Your turn</a>
            <a href="#scoring">Scoring</a>
          </nav>
        </div>
      </header>

      <Section id="tiles" title="Meet the tiles">
        <TileSet />
        <dl className="tile-key">
          <div>
            <dt>Three suits</dt>
            <dd>
              Characters, bamboo and dots are numbered one through nine.
            </dd>
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
        <div className="prose guide-prose">
          <p>
            Most of your hand is arranged into groups: three matching tiles,
            four matching tiles, or three consecutive tiles in one suit.
          </p>
          <p>
            In our 16-tile game, a complete hand is generally five groups and
            one matching pair. The gold wildcard makes more combinations
            possible.
          </p>
        </div>
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
        <div className="prose guide-prose">
          <p>
            Bring nothing. We provide the sets, explain the gold tile, and
            play a practice hand before recording a score.
          </p>
          <p>
            Say what you are thinking out loud. It helps the table teach you,
            and nobody expects a new player to recognize every tile at once.
          </p>
        </div>
      </Section>

    </main>
  );
}
