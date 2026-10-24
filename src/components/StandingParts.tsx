import type { CSSProperties } from "react";
import {
  IconTriangleFilled,
  IconTriangleInvertedFilled,
} from "@tabler/icons-react";
import { CharacterFace, TileFace } from "@/components/PlayingTile";
import { RED } from "@/components/TileArtwork";
import RankTileFlip from "@/components/RankTileFlip";
import CountUp from "@/components/CountUp";
import { SEASON_START, type Standing } from "@/lib/schema";
import { formatPoints } from "@/lib/format";

/** 一 through 九, with 伍 for five as on the guide's tiles. */
const NUMERALS = ["", "一", "二", "三", "四", "伍", "六", "七", "八", "九"];

/**
 * A rank as the guide's character tile, turning over to show the number for
 * anyone who doesn't read the characters. Plain number past nine.
 */
export function RankTile({ rank }: { rank: number }) {
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

/**
 * Places a player moved at the latest meeting, by arrow and number as well as
 * colour: NEW for a player new to the board, a dash for no change. Nothing
 * when the data predates the field.
 */
export function Delta({ change }: { change?: number | null }) {
  if (change === undefined) return null;
  const dir =
    change === null ? "new" : change > 0 ? "up" : change < 0 ? "down" : "same";
  const Arrow =
    dir === "up"
      ? IconTriangleFilled
      : dir === "down"
        ? IconTriangleInvertedFilled
        : null;
  const said =
    change === null
      ? "new to the board"
      : change === 0
        ? "same place as last meeting"
        : `${change > 0 ? "up" : "down"} ${Math.abs(change)} since last meeting`;
  return (
    <span className="lb-delta" data-dir={dir}>
      {Arrow && <Arrow size={11} aria-hidden="true" />}
      <span aria-hidden="true">
        {change === null ? "NEW" : change === 0 ? "–" : Math.abs(change)}
      </span>
      <span className="sr-only">{said}</span>
    </span>
  );
}

/**
 * One leaderboard row. Given an index, it arrives in order and its score
 * counts up; without one (search results) the number simply shows.
 */
export function StandingRow({
  player,
  index,
  match,
}: {
  player: Standing;
  index?: number;
  /** Search text to mark in the name, already lowercased. */
  match?: string;
}) {
  const name = player.display;
  const at = match ? name.toLocaleLowerCase().indexOf(match) : -1;
  const score = SEASON_START + player.total_net;
  return (
    <li
      className="standing"
      style={
        index === undefined ? undefined : ({ "--i": index } as CSSProperties)
      }
    >
      <span className="standing-tile">
        <RankTile rank={player.rank} />
      </span>
      <span className="sr-only">Rank {player.rank}: </span>
      <span className="standing-player">
        <span className="standing-name">
          {at < 0 || !match ? (
            name
          ) : (
            <>
              {name.slice(0, at)}
              <mark>{name.slice(at, at + match.length)}</mark>
              {name.slice(at + match.length)}
            </>
          )}
        </span>
        <span className="lb-tables">
          {player.games_played
            ? `${player.games_played} ${player.games_played === 1 ? "game" : "games"}`
            : `${player.tables_played} ${player.tables_played === 1 ? "table" : "tables"} played`}
        </span>
      </span>
      <span className="standing-score">
        <b>
          {index === undefined ? (
            formatPoints(score)
          ) : (
            <CountUp value={score} delay={index * 40 + 100} />
          )}
        </b>
        <span className="sr-only"> points</span>
        <Delta change={player.rank_change} />
      </span>
    </li>
  );
}
