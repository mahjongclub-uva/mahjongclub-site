import type { Results, ResultTable, Room } from "./meeting.ts";
import type { Semester } from "./schema.ts";
import { SEASON_START } from "./format.ts";

type LiveStanding = {
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
  return ranked(
    sorted,
    (a, b) => a.points === b.points && a.tables === b.tables,
  );
}

/**
 * Who stands on a podium of three: whole ranks only, so a tie is never split
 * between the podium and the list below it. Ranks 1, 2, 2, 2 leave the
 * winner alone up there.
 */
export function podium<T extends { rank: number }>(sorted: T[]): T[] {
  const top = sorted.slice(0, 3);
  const cut = sorted[3]?.rank;
  return cut === undefined ? top : top.filter((row) => row.rank !== cut);
}

/** Ranks from 1 that never gap; rows share one only when `tied`. */
function ranked<T extends { rank: number }>(
  sorted: T[],
  tied: (a: T, b: T) => boolean,
) {
  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    row.rank = prev ? prev.rank + Number(!tied(prev, row)) : 1;
  });
  return sorted;
}

type TonightStanding = {
  id: string;
  display: string;
  rank: number;
  net: number;
  tables: number;
};

/**
 * Tonight's tables: the saved blocks plus, as provisional tables, the games
 * at tables still playing. Both come from one rooms read, so a table that
 * was just ended is either still a room or already a block, never both.
 */
export function tonightTables(
  results: ResultTable[] | null,
  rooms: Room[],
): ResultTable[] {
  const playing = rooms
    .filter((room) => room.hands.length && room.seats.length === 4)
    .map((room) => ({
      table: room.table,
      seats: room.seats.map((seat) => {
        const total =
          room.totals.find((item) => item.id === seat.id)?.total ??
          SEASON_START;
        return { ...seat, total, net: total - SEASON_START };
      }),
    }));
  return [...(results ?? []), ...playing];
}

/** Tonight only: each player's nets from tonight's tables. */
export function tonightStandings(tables: ResultTable[]): TonightStanding[] {
  const rows = new Map<string, TonightStanding>();
  for (const table of tables)
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
  return ranked(sorted, (a, b) => a.net === b.net && a.tables === b.tables);
}
