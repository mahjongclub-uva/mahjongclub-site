import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CARD_VALUES,
  cardTotal,
  getMeeting,
  pendingSchema,
  postMeeting,
  rememberedCode,
  tableError,
} from "./meeting.ts";

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

test("cards reproduce a 205 starting stack and code memory expires", () => {
  assert.equal(
    cardTotal(CARD_VALUES.map((value) => (value === 50 ? 3 : 1))),
    205,
  );
  assert.equal(
    rememberedCode(JSON.stringify({ code: "TEST-BAMBOO", savedAt: 100 }), 101),
    "TEST-BAMBOO",
  );
  assert.equal(
    rememberedCode(
      JSON.stringify({ code: "TEST-BAMBOO", savedAt: 100 }),
      100 + 12 * 3600000,
    ),
    "",
  );
  assert.equal(rememberedCode("broken"), "");
  assert.equal(
    rememberedCode(JSON.stringify({ code: "TEST-BAMBOO", savedAt: 100 }), 99),
    "",
  );
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
        ? { status: 401, message: "Wrong code" }
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
    (await getMeeting("https://example.test/exec", "CODE")).players,
    players,
  );
  const reply = await postMeeting("https://example.test/exec", "CODE", {
    r: "results",
    seats,
  });
  assert.equal(reply.status, 401);
  assert.equal(new URL(requests[0].url).searchParams.get("k"), "CODE");
  assert.equal(requests[1].init.credentials, "omit");
  assert.equal(requests[1].init.referrerPolicy, "no-referrer");
  assert.deepEqual(requests[1].init.headers, { "Content-Type": "text/plain" });
  assert.equal(JSON.parse(requests[1].init.body as string).k, "CODE");
});
