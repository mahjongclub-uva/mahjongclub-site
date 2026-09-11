import Link from "next/link";
import { getCurrentSemester } from "@/lib/data";
import { MIN_TABLES_TO_RANK } from "@/lib/schema";
import { formatDate } from "@/lib/format";
import Section from "@/components/Section";

/** Homepage-sized standings; the data file retains every ranked player. */
const SHOWN = 9;

export default function Leaderboard() {
  const semester = getCurrentSemester();
  const shown = semester.standings.slice(0, SHOWN);
  const hidden = semester.standings.length - shown.length;

  return (
    <main className="leaderboard-page">
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">{semester.label}</p>
          <h1 className="page-title">Leaderboard</h1>
        </div>
      </header>

      <section className="section">
        <div className="section-wrap">
          {shown.length === 0 ? (
            <p className="quiet">No tables played yet this semester.</p>
          ) : (
            <>
              {/* A real table: this is tabular data, and it is what a screen
              reader needs. Below 768px the header row is hidden and each row
              becomes a card, using the data-label attributes. */}
              <table className="leaderboard">
                <caption className="sr-only">
                  {semester.label} leaderboard
                </caption>
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
                      <td data-label="Rank">
                        <span className="bamboo-rank">{player.rank}</span>
                      </td>
                      <th scope="row">{player.display}</th>
                      <td data-label="Score">{player.total_gain}</td>
                      <td data-label="Tables">{player.tables_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* How the numbers are arrived at. Small, and after the table
              rather than before it, because most visitors are looking for a
              name and a number and do not need the rules to read it. */}
              <div className="scoring-note" id="score-explained">
                <h2>How the score works</h2>
                <p>
                  Everyone starts a table with 205 points, and your result is
                  what you finish with minus 205. The board adds up only your
                  winning tables, so a bad night never costs you a place. Play{" "}
                  {MIN_TABLES_TO_RANK} tables to be ranked.
                </p>
                <p>
                  <Link className="text-link" href="/guide/">
                    New to the game?
                  </Link>
                </p>
              </div>

              {/* Both facts a reader needs after the table: how current it is,
              and that they are not seeing all of it. */}
              <p className="quiet table-note">
                {semester.last_session && (
                  <span>
                    Last updated{" "}
                    <time dateTime={semester.last_session}>
                      {formatDate(semester.last_session)}
                    </time>
                  </span>
                )}
                {hidden > 0 && (
                  <span>
                    Showing the top {SHOWN} of {semester.standings.length}{" "}
                    ranked players
                  </span>
                )}
              </p>
              <p className="section-more">
                <Link className="text-link" href="#score-explained">
                  How scoring works
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      {semester.awards.length > 0 && (
        <Section id="awards" title="Awards">
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
        </Section>
      )}
    </main>
  );
}
