import { SEASON_START, formatShortDate } from "./format.ts";
import type { Semester } from "./schema.ts";

/** Places moved since the last meeting, as a story chip. */
export type Move = { dir: "up" | "down" | "held" | "new"; text: string };

export type StoryEntry = {
  rank: number;
  name: string;
  score: number;
  move: Move | null;
};

/** No chip at all when the data predates places moved. */
export function storyMove(change: number | null | undefined): Move | null {
  if (change === undefined) return null;
  if (change === null) return { dir: "new", text: "NEW" };
  if (change === 0) return { dir: "held", text: "HELD" };
  return { dir: change > 0 ? "up" : "down", text: String(Math.abs(change)) };
}

/** The Instagram story's content: top nine, plus the biggest climb anywhere on the board. */
export function storyBoard(semester: Semester) {
  const top: StoryEntry[] = semester.standings.slice(0, 9).map((s) => ({
    rank: s.rank,
    name: s.display,
    score: SEASON_START + s.total_net,
    move: storyMove(s.rank_change),
  }));

  let climb: { name: string; places: number } | null = null;
  for (const s of semester.standings) {
    if ((s.rank_change ?? 0) > (climb?.places ?? 0))
      climb = { name: s.display, places: s.rank_change! };
  }

  const date = semester.last_session
    ? formatShortDate(semester.last_session)
    : null;

  // Whole ranks only on the podium, so a tie is never split between it and
  // the rows below: ranks 1, 2, 2, 2 leave the winner alone up there.
  const cut = top[3]?.rank;
  const podium = top.slice(0, 3).filter((e) => e.rank !== cut);

  return {
    label: semester.label,
    date,
    podium,
    rows: top.slice(podium.length),
    climb,
    hasMoves: top.some((e) => e.move),
  };
}
