import { MIN_TABLES_TO_RANK } from "@/lib/schema";
import Rule from "@/components/Rule";
import TileMark from "@/components/TileMark";

export const metadata = {
  title: "About — Mahjong Club @ UVA",
  description:
    "What we play, who it is for, and how the leaderboard is worked out.",
};

export default function About() {
  return (
    <main>
      <header className="page-head">
        <p className="eyebrow">About</p>
        <h1 className="page-title">What we play</h1>
      </header>

      <section className="prose">
        <p>
          We play Fuzhou-style mahjong: sixteen tiles in hand rather than the
          thirteen most people have seen, four players to a table, and a gold
          wildcard that can stand in for anything.
        </p>
        <p>
          The wildcard is what makes the Fuzhou game its own thing. It turns
          hands that would be dead into hands that are one tile away, so the
          table stays live much later than it otherwise would.
        </p>
      </section>

      <Rule />

      <section className="section" aria-labelledby="beginners">
        <h2 className="section-title" id="beginners">
          If you have never played
        </h2>
        <div className="prose">
          <p>
            Then you are the person we most want at the table. Most of the club
            learned here. Someone will sit with you and talk you through a hand,
            and nobody keeps score while you are learning.
          </p>
          <p>
            There is nothing to bring and nothing to pay to try it.
          </p>
        </div>
      </section>

      <Rule />

      <section className="section" aria-labelledby="scoring">
        <h2 className="section-title" id="scoring">
          How the leaderboard works
        </h2>
        <div className="prose">
          <p>
            Everyone sits down with 205 points. What you leave the table with,
            minus that 205, is your result — and it can be negative, because
            the points have to come from somewhere.
          </p>
          <p>
            The leaderboard adds up only the tables you <em>won</em> points on.
            A losing table counts as zero rather than as a loss. That is
            deliberate: it means sitting down at another table can never cost
            you position, so there is no reason to stop playing once you are
            ahead, and no reason not to play at all if you are behind.
          </p>
          <p>
            You need {MIN_TABLES_TO_RANK} tables to be ranked. If two players
            finish level, the one who did it in fewer tables places higher, and
            if they are level on that too, the one who lost less across the
            season.
          </p>
        </div>
        <TileMark className="section-mark" height={64} />
      </section>
    </main>
  );
}
