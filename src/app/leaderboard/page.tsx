import { getCurrentSemester } from "@/lib/data";
import { formatDate } from "@/lib/format";
import Rule from "@/components/Rule";

/** A display truncation only. The data always carries every ranked player. */
const SHOWN = 10;

export default function Leaderboard() {
  const semester = getCurrentSemester();
  const shown = semester.standings.slice(0, SHOWN);
  const hidden = semester.standings.length - shown.length;

  return (
    <main>
      <header className="page-head">
        <p className="eyebrow">{semester.label}</p>
        <h1 className="page-title">Leaderboard</h1>
        {semester.last_session && (
          <p className="quiet">
            Through{" "}
            <time dateTime={semester.last_session}>
              {formatDate(semester.last_session)}
            </time>
          </p>
        )}
      </header>

      {shown.length === 0 ? (
        <p className="quiet">No tables played yet this semester.</p>
      ) : (
        <>
          {/* A real table: this is tabular data, and it is what a screen
              reader needs. Below 768px the header row is hidden and each row
              becomes a card, using the data-label attributes. */}
          <table className="leaderboard">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Player</th>
                <th scope="col">Score</th>
                <th scope="col">Tables</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((player) => (
                <tr key={player.id}>
                  <td data-label="Rank">{player.rank}</td>
                  <th scope="row">{player.display}</th>
                  <td data-label="Score">{player.total_gain}</td>
                  <td data-label="Tables">{player.tables_played}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {hidden > 0 && (
            <p className="quiet">
              Showing the top {SHOWN} of {semester.standings.length} ranked
              players.
            </p>
          )}
        </>
      )}

      {semester.awards.length > 0 && (
        <>
          <Rule />
          <section className="section" aria-labelledby="awards">
            <h2 className="section-title" id="awards">
              Awards
            </h2>
            <dl className="awards">
              {semester.awards.map((award) => (
                <div key={award.id}>
                  <dt>{award.label}</dt>
                  <dd>
                    <span className="awards-name">{award.display}</span>
                    <span className="awards-value">
                      {award.value} {award.unit}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

    </main>
  );
}
