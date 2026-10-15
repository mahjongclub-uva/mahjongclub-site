import Link from "next/link";
import type { CSSProperties } from "react";
import {
  IconCrownFilled,
  IconTriangleFilled,
  IconTriangleInvertedFilled,
} from "@tabler/icons-react";
import { CharacterFace, TileFace } from "@/components/PlayingTile";
import { RED } from "@/components/TileArtwork";
import { getCurrentSemester } from "@/lib/data";
import { SEASON_START, type Standing } from "@/lib/schema";
import { formatDate } from "@/lib/format";
import PlayerSearch from "@/components/PlayerSearch";
import RankTileFlip from "@/components/RankTileFlip";
import CountUp from "@/components/CountUp";

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

/** How far a season score sits from the start, by sign and arrow as well as colour. */
function Delta({ net }: { net: number }) {
  const Arrow = net < 0 ? IconTriangleInvertedFilled : IconTriangleFilled;
  return (
    <span className="lb-delta" data-dir={net < 0 ? "down" : "up"}>
      <Arrow size={11} aria-hidden="true" />
      {net < 0 ? "−" : "+"}
      {Math.abs(net)}
      <span className="sr-only"> from {SEASON_START}</span>
    </span>
  );
}

/** Tables played as tile backs; a count past six. */
function Tables({ count }: { count: number }) {
  return (
    <span className="lb-tables">
      <span className="sr-only">
        {count} {count === 1 ? "table" : "tables"}
      </span>
      <span className="lb-pips" aria-hidden="true">
        {count > 6 ? (
          <>
            <i />×{count}
          </>
        ) : (
          Array.from({ length: count }, (_, k) => <i key={k} />)
        )}
      </span>
    </span>
  );
}

export default function Leaderboard() {
  const semester = getCurrentSemester();
  const shown = semester.standings.slice(0, SHOWN);
  const seasonNet = semester.scoring_rule === "season-net";
  const score = (player: Standing) =>
    seasonNet ? SEASON_START + player.total_net : player.total_gain;
  const tables = semester.min_tables_to_rank;

  return (
    <main className="leaderboard-page">
      <header className="page-head">
        <div className="section-wrap">
          <h1 className="page-title">Leaderboard</h1>
          <p className="lb-chips">
            <span className="lb-chip" data-season>
              {semester.label}
            </span>
            {semester.last_session && (
              <span className="lb-chip">
                Updated{" "}
                <time dateTime={semester.last_session}>
                  {formatDate(semester.last_session)}
                </time>
              </span>
            )}
          </p>
        </div>
      </header>

      <section className="section">
        <div className="section-wrap">
          {shown.length === 0 ? (
            <p className="quiet">No tables played yet this semester.</p>
          ) : (
            <>
              {/* Top three on the felt, by place: 2, 1, 3 left to right. Ties
                  share a rank; the steps still follow list order. */}
              <ol
                className="lb-podium"
                aria-label={`${semester.label} top three`}
              >
                {shown.slice(0, 3).map((player, i) => (
                  <li
                    key={player.id}
                    className="lb-spot"
                    data-place={i + 1}
                    style={{ "--i": i } as CSSProperties}
                  >
                    {player.rank === 1 && (
                      <IconCrownFilled
                        className="lb-crown"
                        aria-hidden="true"
                      />
                    )}
                    <span className="standing-tile">
                      <RankTile rank={player.rank} />
                    </span>
                    <span className="sr-only">Rank {player.rank}: </span>
                    <span className="lb-name">{player.display}</span>
                    <span className="lb-score">
                      <b>
                        <CountUp value={score(player)} delay={i * 40 + 100} />
                      </b>
                      <span className="sr-only"> points</span>
                    </span>
                    {seasonNet && <Delta net={player.total_net} />}
                    <span className="lb-step" aria-hidden="true">
                      {player.rank}
                    </span>
                  </li>
                ))}
              </ol>

              {shown.length > 3 && (
                <ol
                  className="standings"
                  aria-label={`${semester.label} standings, from fourth`}
                >
                  {shown.slice(3).map((player, i) => (
                    <li
                      key={player.id}
                      className="standing"
                      style={{ "--i": i + 3 } as CSSProperties}
                    >
                      <span className="standing-tile">
                        <RankTile rank={player.rank} />
                      </span>
                      <span className="sr-only">Rank {player.rank}: </span>
                      <span className="standing-player">
                        <span className="standing-name">{player.display}</span>
                        <Tables count={player.tables_played} />
                      </span>
                      <span className="standing-score">
                        <b>
                          <CountUp
                            value={score(player)}
                            delay={(i + 3) * 40 + 100}
                          />
                        </b>
                        <span className="sr-only"> points</span>
                        {seasonNet && <Delta net={player.total_net} />}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

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
        seasonNet={seasonNet}
      />

      <section className="section">
        <div className="section-wrap">
          {/* After the table, not before: most visitors just want a name and a number. */}
          <div className="scoring-note" id="score-explained">
            <h2>How the score works</h2>
            {seasonNet ? (
              <ul className="lb-facts">
                <li>
                  <b>{SEASON_START}</b> to start
                </li>
                <li>
                  <b>±</b> each table
                </li>
                <li>
                  <b>{tables}</b> {tables === 1 ? "table" : "tables"} to rank
                </li>
              </ul>
            ) : (
              <p>
                Only winning tables count; losses don’t take points away. Play{" "}
                {tables} {tables === 1 ? "table" : "tables"} to be ranked.
              </p>
            )}
            <p>
              Points come from wins, special hands, and flower and gold
              combinations.
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
