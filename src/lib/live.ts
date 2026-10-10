import type { Results } from "./meeting.ts";
import { SEASON_START, type Semester } from "./schema.ts";

export type LiveStanding = {
  id: string;
  display: string;
  rank: number;
  before: number | null;
  points: number;
  tables: number;
};

export function liveStandings(
  semester: Semester,
  results: Results | null,
): LiveStanding[] {
  const rows = new Map(
    semester.standings.map((player) => [
      player.id,
      {
        id: player.id,
        display: player.display,
        rank: player.rank,
        before: player.rank,
        points: SEASON_START + player.total_net,
        tables: player.tables_played,
      } as LiveStanding,
    ]),
  );
  if (
    !results ||
    (semester.last_session && results.date <= semester.last_session)
  )
    return [...rows.values()];
  const withheld = new Set<string>();
  for (const table of results.tables)
    for (const seat of table.seats) {
      if (seat.optOut) {
        withheld.add(seat.id);
        continue;
      }
      // ponytail: unpublished historical nets are absent from the snapshot; wait for the official sync rather than inventing them.
      if (semester.unranked.some((player) => player.id === seat.id)) continue;
      const row = rows.get(seat.id) ?? {
        id: seat.id,
        display: seat.display,
        rank: 0,
        before: null,
        points: SEASON_START,
        tables: 0,
      };
      row.points += seat.net;
      row.tables++;
      row.display = seat.display;
      rows.set(seat.id, row);
    }
  const sorted = [...rows.values()]
    .filter(
      (row) =>
        !withheld.has(row.id) && row.tables >= semester.min_tables_to_rank,
    )
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.tables - b.tables ||
        a.display.localeCompare(b.display),
    );
  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    row.rank = prev
      ? prev.rank +
        Number(prev.points !== row.points || prev.tables !== row.tables)
      : 1;
  });
  return sorted;
}

export type TonightStanding = {
  id: string;
  display: string;
  rank: number;
  net: number;
  tables: number;
};

/** Tonight only: each player's saved nets from this meeting's tables. */
export function tonightStandings(results: Results | null): TonightStanding[] {
  const rows = new Map<string, TonightStanding>();
  for (const table of results?.tables ?? [])
    for (const seat of table.seats) {
      if (seat.optOut) continue;
      const row = rows.get(seat.id) ?? {
        id: seat.id,
        display: seat.display,
        rank: 0,
        net: 0,
        tables: 0,
      };
      row.net += seat.net;
      row.tables++;
      rows.set(seat.id, row);
    }
  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.net - a.net ||
      a.tables - b.tables ||
      a.display.localeCompare(b.display),
  );
  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    row.rank = prev
      ? prev.rank + Number(prev.net !== row.net || prev.tables !== row.tables)
      : 1;
  });
  return sorted;
}
