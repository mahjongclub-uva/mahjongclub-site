import WukongHeadband from "@/components/WukongHeadband";
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
 * Rank as a character tile: numeral above, 萬 below, laid out as a real 萬子
 * tile. Hovering flips it to show the Arabic numeral for anyone who doesn't
 * read the characters; also present for assistive tech at all times, since
 * hover isn't available to everyone.
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
                        <span className="player-name">
                          <span>{player.display}</span>
                          {player.rank === 1 && <WukongHeadband />}
                        </span>
                      </th>
                      <td data-label="Score">{player.total_gain}</td>
                      <td data-label="Tables">{player.tables_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
            </>
          )}
        </div>
      </section>

      <PlayerSearch
        standings={semester.standings}
        unranked={semester.unranked}
      />
      <section className="section">
        <div className="section-wrap">
          {/* After the table, not before: most visitors just want a name and a number. */}
          <div className="scoring-note" id="score-explained">
            <h2>How the score works</h2>
            <p>
              The board adds up only your winning tables; losses don’t subtract from your total. Play{" "}
              {MIN_TABLES_TO_RANK} tables to be ranked.
            </p>
            <p>
              <Link className="action-link" href="/guide/">
                Learn how to play
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
