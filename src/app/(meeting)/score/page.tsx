import ScoreEntry from "@/components/ScoreEntry";

export const metadata = { title: "Record a table - Mahjong Club @ UVA" };
export default function ScorePage() {
  return (
    <>
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">One person submits for the table</p>
          <h1 className="page-title">Count your cards.</h1>
          <p className="page-intro">
            Choose your four players and enter their ending totals.
          </p>
        </div>
      </header>
      <section className="section">
        <div className="section-wrap">
          <ScoreEntry />
        </div>
      </section>
    </>
  );
}
