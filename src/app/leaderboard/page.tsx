import Link from "next/link";
import type { CSSProperties } from "react";
import {
  IconCrownFilled,
  IconTriangleFilled,
  IconTriangleInvertedFilled,
} from "@tabler/icons-react";
import { getCurrentSemester } from "@/lib/data";
import { SEASON_START, type Standing } from "@/lib/schema";
import { formatDate } from "@/lib/format";
import { podium } from "@/lib/live";
import PlayerSearch from "@/components/PlayerSearch";
import CountUp from "@/components/CountUp";
import { Delta, RankTile, StandingRow } from "@/components/StandingParts";
import SeasonMark from "@/components/SeasonMark";
import "../(meeting)/halloween.css";

/** Homepage-sized standings; the data file retains every ranked player. */
const SHOWN = 9;

export default function Leaderboard() {
  const semester = getCurrentSemester();
  const shown = semester.standings.slice(0, SHOWN);
  const top = podium(shown);
  const score = (player: Standing) => SEASON_START + player.total_net;
  const tables = semester.min_tables_to_rank;

  return (
    <main className="leaderboard-page">
      <SeasonMark />
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
              {/* The top places on the felt, first in the middle, then left,
                  then right. Step heights follow rank, and a tie is never
                  split between the felt and the list. */}
              {top.length > 0 && (
                <ol
                  className="lb-podium"
                  aria-label={`${semester.label} podium`}
                >
                  {top.map((player, i) => (
                    <li
                      key={player.id}
                      className="lb-spot"
                      data-place={i + 1}
                      data-step={Math.min(player.rank, 3)}
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
                      <Delta change={player.rank_change} />
                      <span className="lb-step" aria-hidden="true">
                        {player.rank}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {shown.length > top.length && (
                <ol
                  className="standings"
                  aria-label={`${semester.label} standings${top.length ? ", continued" : ""}`}
                >
                  {shown.slice(top.length).map((player, i) => (
                    <StandingRow
                      key={player.id}
                      player={player}
                      index={i + top.length}
                    />
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
        minTables={tables}
      />

      <section className="section">
        <div className="section-wrap">
          {/* After the table, not before: most visitors just want a name and a number. */}
          <div className="scoring-note" id="score-explained">
            <h2>How the score works</h2>
            <ul className="lb-facts">
              <li>
                <b>{SEASON_START}</b> to start
              </li>
              <li>
                <b>±</b> each table
              </li>
              {/* At one table, the search note already says everyone who played shows up. */}
              {tables > 1 && (
                <li>
                  <b>{tables}</b> tables to rank
                </li>
              )}
              <li>
                <b aria-hidden="true">
                  <IconTriangleFilled />
                  <IconTriangleInvertedFilled />
                </b>
                places moved
              </li>
            </ul>
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
