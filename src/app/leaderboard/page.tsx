import Link from "next/link";
import type { CSSProperties } from "react";
import { CharacterFace, TileFace } from "@/components/PlayingTile";
import { RED } from "@/components/TileArtwork";
import { getCurrentSemester } from "@/lib/data";
import { MIN_TABLES_TO_RANK } from "@/lib/schema";
import { formatDate } from "@/lib/format";
import PlayerSearch from "@/components/PlayerSearch";
import RankTileFlip from "@/components/RankTileFlip";

/** Homepage-sized standings; the data file retains every ranked player. */
const SHOWN = 9;

/** 一 through 九, with 伍 for five as on the guide's tiles. */
const NUMERALS = ["", "一", "二", "三", "四", "伍", "六", "七", "八", "九"];

/**
 * A rank as the guide's character tile, turning over to show the number for
 * anyone who doesn't read the characters. Plain number past nine.
 */
function RankTile({ rank }: { rank: number }) {
  const numeral = NUMERALS[rank];
  if (!numeral) return <span className="rank-plain">{rank}</span>;
  return (
    <RankTileFlip rank={rank}>
      <span className="rank-front">
        <TileFace>
          <CharacterFace top={numeral} bottom="萬" />
        </TileFace>
      </span>
      <span className="rank-back">
        <TileFace>
          <text
            x="44"
            y="84"
            textAnchor="middle"
            fontFamily="var(--body), sans-serif"
            fontWeight="700"
            fontSize="64"
            fill={RED}
          >
            {rank}
          </text>
        </TileFace>
      </span>
    </RankTileFlip>
  );
}

export default function Leaderboard() {
  const semester = getCurrentSemester();
  const shown = semester.standings.slice(0, SHOWN);

  return (
    <main className="leaderboard-page">
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">{semester.label}</p>
          <h1 className="page-title">Leaderboard</h1>
          {semester.last_session && (
            <p className="leaderboard-meta">
              Updated{" "}
              <time dateTime={semester.last_session}>
                {formatDate(semester.last_session)}
              </time>
            </p>
          )}
        </div>
      </header>

      <section className="section">
        <div className="section-wrap">
          {shown.length === 0 ? (
            <p className="quiet">No tables played yet this semester.</p>
          ) : (
            <>
              {/* Visual only: each row already reads out its rank and points. */}
              <div className="standings-head" aria-hidden="true">
                <span>Rank</span>
                <span>Player</span>
                <span>Points</span>
              </div>
              <ol
                className="standings"
                aria-label={`${semester.label} standings`}
              >
                {shown.map((player, i) => (
                  <li
                    key={player.id}
                    className="standing"
                    data-place={i + 1}
                    style={{ "--i": i } as CSSProperties}
                  >
                    <span className="standing-tile">
                      <RankTile rank={player.rank} />
                    </span>
                    <span className="sr-only">Rank {player.rank}: </span>
                    <span className="standing-player">
                      <span className="standing-name">{player.display}</span>
                      <span className="standing-tables">
                        {player.tables_played} tables
                      </span>
                    </span>
                    <span className="standing-score">
                      <b
                        className="count"
                        style={{ "--to": player.total_gain } as CSSProperties}
                      >
                        <span className="count-value">{player.total_gain}</span>
                        <span className="count-up" aria-hidden="true" />
                      </b>
                      <span className="sr-only">points</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="rank-touch-hint">
                Tap a player to flip their tile.
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
              The board adds up only your winning tables; losses don’t subtract
              from your total. Play {MIN_TABLES_TO_RANK} tables to be ranked.
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
