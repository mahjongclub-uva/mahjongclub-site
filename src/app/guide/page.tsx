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
    <main className="guide-page">
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
            <a href="#calls">Pung &amp; chow</a>
            <a href="#turn">Your turn</a>
            <a href="#first-table">Your first table</a>
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
            The groups in a hand are called sets, often called melds. Three
            identical tiles make a pung; three consecutive tiles in one suit
            make a chow. A kong is four identical tiles and counts as one set.
          </p>
          <p>
            In our 16-tile game, a complete hand is generally five groups and
            one matching pair. The gold wildcard makes more combinations
            possible.
          </p>
        </div>
      </Section>

      <Section id="calls" title="Pung, pong, chow, chi?">
        <p className="guide-call-intro">
          Different names, the same two useful shapes. These are also the calls
          you use when claiming a discard.
        </p>
        <dl className="call-guide">
          <div>
            <dt>
              Pung / pong <span>Three of a kind</span>
            </dt>
            <dd>
              Three identical tiles, such as three eight-dot tiles. If you hold
              two, you can usually call pung to claim the latest matching
              discard from any player.
            </dd>
          </div>
          <div>
            <dt>
              Chow / chi <span>A sequence</span>
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
            Bring nothing. We provide the sets, explain the gold tile, and play
            a practice hand before recording a score.
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
