import Link from "next/link";
import { getCurrentSemester } from "@/lib/data";
import { MIN_TABLES_TO_RANK } from "@/lib/schema";
import { formatDate } from "@/lib/format";
import PlayerSearch from "@/components/PlayerSearch";

/** Homepage-sized standings; the data file retains every ranked player. */
const SHOWN = 9;

/** 一 through 九. Index 0 is unused so the array reads by rank. */
const NUMERALS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/**
 * The rank as a character tile: the numeral above, 萬 below, as a real 萬子
 * tile is laid out.
 *
 * Hovering the row turns it over: the jade reverse carries the Arabic numeral,
 * so anyone who does not read the characters can still find their place.
 *
 * That number is also present for assistive technology at all times, since a
 * rank is information and hover is not available to everyone.
 */
function RankTile({ rank }: { rank: number }) {
  const numeral = NUMERALS[rank];
  if (!numeral) return <span className="rank-plain">{rank}</span>;

  return (
    <span className="rank-tile">
      <span className="rank-face rank-front" aria-hidden="true">
        <span className="rank-numeral">{numeral}</span>
        <span className="rank-suit">萬</span>
      </span>
      {/* The reverse, showing the number the character stands for. */}
      <span className="rank-face rank-back" aria-hidden="true">
        {rank}
      </span>
      <span className="sr-only">{rank}</span>
    </span>
  );
}

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
                    <tr key={player.id} data-leader={player.rank === 1}>
                      <td data-label="Rank">
                        <RankTile rank={player.rank} />
                      </td>
                      <th scope="row">
                        {player.display}
                        {player.rank === 1 && (
                          <span className="leader-badge">
                            <span className="leader-seal" aria-hidden="true">
                              1
                            </span>
                            First place
                          </span>
                        )}
                      </th>
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
                  winning tables; losses don’t subtract from your total. Play{" "}
                  {MIN_TABLES_TO_RANK} tables to be ranked.
                </p>
                <p>
                  <Link className="action-link" href="/guide/">
                    Learn how to play
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
                <Link className="action-link" href="#find-player">
                  Find your place
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      <PlayerSearch
        standings={semester.standings}
        unranked={semester.unranked}
      />
    </main>
  );
}
