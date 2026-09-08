import { MIN_TABLES_TO_RANK } from "@/lib/schema";
import Section from "@/components/Section";
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
        <div className="section-wrap">
          <p className="eyebrow">About</p>
          <h1 className="page-title">The club</h1>
        </div>
      </header>

      <Section id="game" title="What we play">
        <div className="prose">
          <p>
            Fuzhou-style mahjong. Sixteen tiles in hand instead of the usual
            thirteen, four players to a table, and a gold wildcard that stands
            in for any tile.
          </p>
          <p>
            The wildcard changes how the game feels. Hands that would be dead
            turn out to be one tile away, so tables stay alive much longer.
          </p>
        </div>
      </Section>

      <Section id="beginners" title="If you have never played">
        <div className="prose">
          <p>
            Good. Most of us learned here. Someone will sit with you and walk
            you through a hand, and nothing is scored while you are learning.
          </p>
          <p>Bring nothing. It costs nothing to try.</p>
        </div>
      </Section>

      <Section id="scoring" title="How the leaderboard works">
        <div className="prose">
          <p>
            Everyone starts with 205 points. Your result is what you walk away
            with, minus that 205, so it can be negative.
          </p>
          <p>
            The leaderboard only counts tables you finished up on. A losing
            table scores zero instead of counting against you, so playing more
            can never drop you down the list.
          </p>
          <p>
            You need {MIN_TABLES_TO_RANK} tables to be ranked. Level scores go
            to whoever needed fewer tables, then to whoever lost less.
          </p>
        </div>
        <TileMark className="section-mark" height={64} />
      </Section>
    </main>
  );
}
