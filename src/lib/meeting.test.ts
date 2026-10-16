import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actionLanded,
  cleanComputingId,
  computingIdError,
  getMeeting,
  getResults,
  isMeetingPage,
  meetingShortcut,
  playerNext,
  postMeeting,
  provisionalMeeting,
  tableError,
} from "./meeting.ts";
import { draftSchema, pendingSchema } from "./meetingSchemas.ts";

const players = [1, 2, 3, 4].map((i) => ({
  id: `p00${i}`,
  display: `Player ${i}`,
}));
const seats = players.map((player, i) => ({
  id: player.id,
  total: [220, 210, 200, 190][i],
}));

test("only four distinct checked-in players with whole balanced totals can submit", () => {
  assert.equal(tableError(seats, players), null);
  for (const invalid of [
    seats.slice(1),
    seats.map(() => seats[0]),
    [...seats.slice(0, 3), { id: "p999", total: 190 }],
    seats.map((seat, i) => ({ ...seat, total: i === 0 ? 220.5 : seat.total })),
    seats.map((seat, i) => ({ ...seat, total: i === 0 ? NaN : seat.total })),
    seats.map((seat, i) => ({ ...seat, total: i === 0 ? 221 : seat.total })),
  ])
    assert.ok(tableError(invalid, players));
});

test("pending saves retain their identity", () => {
  assert.ok(
    pendingSchema.safeParse({
      r: "results",
      meetingId: "m1",
      submissionId: "ea8971ea-bca2-4ac2-8030-856a6a83da56",
      seats,
    }).success,
  );
});

test("Apps Script transport uses plain-text POST and validates application status", async (t) => {
  const requests: { url: string; init: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return Response.json(
      init.method === "POST"
        ? { status: 423, message: "Meeting closed" }
        : {
            status: 200,
            open: true,
            checkinsOpen: true,
            meetingId: "m1",
            date: "2026-09-30",
            semester: "fall-2026",
            players,
          },
    );
  });
  assert.deepEqual(
    (await getMeeting("https://example.test/exec")).players,
    players,
  );
  const reply = await postMeeting("https://example.test/exec", {
    r: "results",
    seats,
  });
  assert.equal(reply.status, 423);
  assert.equal(new URL(requests[0].url).searchParams.has("k"), false);
  assert.equal(requests[1].init.credentials, "omit");
  assert.equal(requests[1].init.referrerPolicy, "no-referrer");
  assert.deepEqual(requests[1].init.headers, { "Content-Type": "text/plain" });
  assert.equal("k" in JSON.parse(requests[1].init.body as string), false);
  // No meeting yet: the closed reply still parses.
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      status: 200,
      open: false,
      checkinsOpen: false,
      meetingId: null,
      date: null,
      semester: null,
    }),
  );
  assert.equal((await getMeeting("https://example.test/exec")).open, false);
});

test("live results parse; drafts only store valid opaque seats", async (t) => {
  const body = {
    status: 200,
    meetingId: "m1",
    date: "2026-10-02",
    tables: [
      {
        table: 1,
        seats: seats.map((seat) => ({
          ...seat,
          display: seat.id,
          net: seat.total - 205,
        })),
      },
    ],
  };
  t.mock.method(globalThis, "fetch", async () => Response.json(body));
  assert.equal(
    (await getResults("https://example.test/exec")).tables.length,
    1,
  );
  assert.ok(
    draftSchema.safeParse({
      meetingId: "m1",
      ids: players.map((p) => p.id),
      totals: seats.map((s) => String(s.total)),
    }).success,
  );
  assert.equal(
    draftSchema.safeParse({
      meetingId: "m1",
      ids: ["full name", "", "", ""],
      totals: ["", "", "", ""],
    }).success,
    false,
  );
  assert.ok(isMeetingPage("/live/"));
  assert.ok(isMeetingPage("/meeting/"));
  assert.ok(isMeetingPage("/meeting/table/12/"));
  assert.equal(isMeetingPage("/meeting/table/x/"), false);
  assert.equal(isMeetingPage("//outside.example"), false);
});

test("negative totals survive validation, pending saves, drafts and results", async (t) => {
  for (const totals of [
    [-15, 425, 205, 205],
    [-15, 835, 0, 0],
  ]) {
    const signedSeats = players.map((player, i) => ({
      id: player.id,
      total: totals[i],
    }));
    assert.equal(tableError(signedSeats, players), null);
    assert.ok(
      pendingSchema.safeParse({
        r: "results",
        meetingId: "m1",
        submissionId: "ea8971ea-bca2-4ac2-8030-856a6a83da56",
        seats: signedSeats,
      }).success,
    );
    assert.ok(
      draftSchema.safeParse({
        meetingId: "m1",
        ids: players.map((p) => p.id),
        totals: totals.map(String),
      }).success,
    );
    t.mock.method(globalThis, "fetch", async () =>
      Response.json({
        status: 200,
        meetingId: "m1",
        date: "2026-10-09",
        tables: [
          {
            table: 1,
            seats: signedSeats.map((seat) => ({
              ...seat,
              display: seat.id,
              net: seat.total - 205,
            })),
          },
        ],
      }),
    );
    const results = await getResults("https://example.test/exec");
    assert.deepEqual(
      results.tables[0].seats.map((seat) => seat.total),
      totals,
    );
    assert.equal(results.tables[0].seats[0].net, -220);
    t.mock.restoreAll();
  }
});

test("computing IDs accept a pasted UVA email and explain anything else", () => {
  assert.equal(cleanComputingId("  abc2de@Virginia.edu "), "abc2de");
  assert.equal(cleanComputingId("abc2de@gmail.com"), "abc2de@gmail.com");
  assert.equal(computingIdError("abc2de"), null);
  assert.match(computingIdError("abc2de@gmail.com")!, /before @virginia\.edu/);
  assert.match(computingIdError("2abc")!, /starts with letters/);
  assert.match(computingIdError("")!, /Enter/);
});

test("the meeting shortcut names a table only for a seated, confirmed player", () => {
  const meeting = {
    status: 200 as const,
    open: true,
    checkinsOpen: true,
    meetingId: "m1",
    date: "2026-10-16",
    semester: "Fall 2026",
    players,
    rooms: [
      {
        table: 3,
        session: 1,
        seats: [{ ...players[0], wind: 0 }],
        hands: [],
        totals: [],
        ended: null,
      },
    ],
  };
  assert.deepEqual(meetingShortcut(meeting, null), {
    player: null,
    label: "Check in",
    href: "/meeting/checkin/",
  });
  assert.equal(meetingShortcut(meeting, players[0]).href, "/meeting/table/3/");
  assert.equal(meetingShortcut(meeting, players[0]).label, "Table 3");
  assert.equal(meetingShortcut(meeting, players[1]).href, "/meeting/tables/");
  assert.equal(
    meetingShortcut({ ...meeting, rooms: undefined }, players[0]).href,
    "/meeting/",
  );
});

test("check-in starts from the calendar only for a phone without tonight's player", () => {
  const start = "2026-10-16T17:30:00-04:00";
  const schedule = [
    { start, end: "2026-10-16T20:00:00-04:00", summary: "", location: null },
  ];
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => saved.get(key) ?? null },
  });
  const at = (time: string) => provisionalMeeting(schedule, Date.parse(time));
  assert.equal(at("2026-10-16T16:59:00-04:00"), null);
  assert.equal(at("2026-10-16T20:00:00-04:00"), null);
  assert.equal(at("2026-10-16T17:05:00-04:00")?.date, "2026-10-16");
  assert.equal(at("2026-10-16T17:05:00-04:00")?.checkinsOpen, true);
  saved.set(
    "club-checked-in",
    JSON.stringify({ meetingId: "old:1", player: players[0] }),
  );
  assert.ok(at("2026-10-16T17:05:00-04:00"));
  saved.set(
    "club-checked-in",
    JSON.stringify({
      meetingId: "evt:" + Date.parse(start),
      player: players[0],
    }),
  );
  assert.equal(at("2026-10-16T17:05:00-04:00"), null);
});

test("after a lost reply, each table action is recognised only once it took effect", () => {
  const seat = (id: string, wind: number) => ({ id, display: id, wind });
  const room = (
    session: number,
    ids: string[],
    hands: string[],
    lastHandId?: string,
  ) => ({
    table: 2,
    session,
    seats: ids.map(seat),
    hands: hands.map((id) => ({ id, winner: ids[0], each: 5 })),
    totals: [],
    ended: lastHandId
      ? {
          session: session - 1,
          lastHandId,
          sheetTable: 4,
          at: 0,
          by: "",
          games: 3,
          totals: [],
        }
      : null,
  });
  const before = room(1, ["p001", "p002", "p003", "p004"], ["h1", "h2"]);
  const sent = { playerId: "p001", table: 2, lastHandId: "h2" };
  const landed = (action: string, after: ReturnType<typeof room>, extra = {}) =>
    actionLanded(action, { ...sent, ...extra }, before, [after]);
  assert.equal(
    landed("hand", room(1, ["p001"], ["h1", "h2", "h3"]), { handId: "h3" }),
    "landed",
  );
  assert.equal(landed("hand", before, { handId: "h3" }), "missing");
  // Another phone ended the table straight after this game was saved.
  assert.equal(
    landed("hand", room(2, [], [], "h3"), { handId: "h3" }),
    "landed",
  );
  assert.equal(
    landed("hand", room(2, [], [], "h2"), { handId: "h3" }),
    "unsure",
  );
  assert.equal(landed("undo", room(1, ["p001"], ["h1"])), "landed");
  assert.equal(landed("undo", before), "missing");
  // Someone else ended the table and a new session began: this Undo can't tell.
  assert.equal(landed("undo", room(2, ["p001"], [])), "unsure");
  assert.equal(landed("end", room(2, [], []), { session: 1 }), "landed");
  assert.equal(landed("end", before, { session: 1 }), "missing");
  assert.equal(landed("leave", room(1, ["p002"], [])), "landed");
  assert.equal(landed("leave", before), "missing");
  const full = room(1, ["p002", "p003", "p004", "p001"], []);
  assert.equal(
    actionLanded("join", { ...sent, seat: 3 }, undefined, [full]),
    "landed",
  );
  assert.equal(
    actionLanded("join", { ...sent, seat: 1 }, undefined, [full]),
    "missing",
  );
  assert.equal(
    actionLanded("join", sent, undefined, [room(1, ["p002"], [])]),
    "missing",
  );
});

test("checking in before the service answers still leads to the tables", () => {
  // The calendar's stand-in, as provisionalMeeting builds it.
  const stand = {
    status: 200 as const,
    open: true,
    checkinsOpen: true,
    meetingId: null,
    date: "2026-10-16",
    semester: null,
    players: [],
  };
  assert.equal(playerNext(stand, "p001").label, "Find a table");
  // A real reply without rooms is a service from before table rooms.
  assert.equal(
    playerNext({ ...stand, meetingId: "m1" }, "p001").label,
    "Record a table",
  );
});
