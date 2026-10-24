import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

// Small in-memory workbook. Production entry points run unchanged through doGet/doPost.
function harness() {
  const fullReads = {};
  const calls = {
    opens: 0,
    reads: 0,
    writes: 0,
    flushes: 0,
    locks: 0,
    // tryLock(0): take the lock only if it is free, never waiting.
    quickLocks: 0,
    noteReads: 0,
    zones: 0,
  };
  const roster = [
    ["player_id", "computing_id", "full_name", "display", "opt_out"],
    ["p001", "a1", "Alex Amber", "Alex A.", false],
    ["p002", "b2", "Blair Birch", "Blair B.", false],
    ["p003", "c3", "Casey Cedar", "Casey C.", false],
    ["p004", "d4", "Drew Dogwood", "Drew D.", true],
    ["p005", "", "Benjamin Elm", "Benjamin E.", false],
    ["p006", "", "Ben Fern", "Ben F.", false],
    ...Array.from({ length: 20 }, () => ["", "", "", "", false]),
  ];
  const attendance = [
    ["Attendance", "", "", ""],
    ["Member", "# Meets", "", 46295],
    ...roster.slice(1, 7).map((row) => [row[2], 1, "", true]),
    ...Array.from({ length: 20 }, () => ["", "", "", false]),
  ];
  const points = Array.from({ length: 21 }, () => Array(9).fill(""));
  for (let number = 1; number <= 3; number++) {
    const row = (number - 1) * 7;
    points[row][1] = "Table " + number;
    points[row + 1].splice(1, 4, "Player", "Points", "Net", "");
    points[row][6] = "OFF LIMITS";
    for (let seat = row + 2; seat <= row + 5; seat++) points[seat][3] = -205;
  }
  const tabs = {};
  let failWrite = false;
  let busy = false;
  class Range {
    constructor(tab, row, column, rows = 1, columns = 1) {
      Object.assign(this, { tab, row, column, rows, columns });
    }
    getValue() {
      return this.tab.grid[this.row - 1]?.[this.column - 1] ?? "";
    }
    getValues() {
      calls.reads++;
      return Array.from({ length: this.rows }, (_, r) =>
        Array.from(
          { length: this.columns },
          (_, c) =>
            this.tab.grid[this.row + r - 1]?.[this.column + c - 1] ?? "",
        ),
      );
    }
    setValue(value) {
      return this.setValues(
        Array.from({ length: this.rows }, () =>
          Array(this.columns).fill(value),
        ),
      );
    }
    setValues(values) {
      calls.writes++;
      if (failWrite && this.tab.name === "Points") {
        failWrite = false;
        throw new Error("Injected network failure");
      }
      values.forEach((row, r) =>
        row.forEach((value, c) => {
          this.tab.grid[this.row + r - 1] ??= [];
          const key = this.row + r + ":" + (this.column + c);
          this.tab.formulas[key] =
            typeof value === "string" && value.startsWith("=") ? value : "";
          this.tab.grid[this.row + r - 1][this.column + c - 1] =
            this.tab.formulas[key] && this.tab.name === "Points"
              ? this.tab.grid[this.row + r - 1][2] - 205
              : value;
        }),
      );
      return this;
    }
    getNotes() {
      calls.noteReads++;
      return Array.from({ length: this.rows }, (_, r) =>
        Array.from(
          { length: this.columns },
          (_, c) =>
            this.tab.notes[this.row + r + ":" + (this.column + c)] || "",
        ),
      );
    }
    getFormulas() {
      return Array.from({ length: this.rows }, (_, r) =>
        Array.from(
          { length: this.columns },
          (_, c) =>
            this.tab.formulas[this.row + r + ":" + (this.column + c)] || "",
        ),
      );
    }
    setNote(value) {
      this.tab.notes[this.row + ":" + this.column] = value;
      return this;
    }
    getNumColumns() {
      return this.columns;
    }
    getFormulaR1C1() {
      return this.tab.formula;
    }
    setFormulaR1C1(value) {
      this.tab.formula = value;
      return this;
    }
    copyTo(target, type) {
      if (!type) {
        target.rows = this.rows;
        target.columns = this.columns;
        target.setValues(this.getValues());
      }
      return this;
    }
    clearContent() {
      return this.setValue("");
    }
    setNumberFormat() {
      return this;
    }
    insertCheckboxes() {
      return this.setValue(false);
    }
    setBackground(color) {
      this.tab.backgrounds.push([[this.row], color]);
      return this;
    }
  }
  for (const [name, grid] of Object.entries({
    Roster: roster,
    Attendance: attendance,
    Points: points,
  })) {
    tabs[name] = {
      name,
      grid,
      notes: {},
      backgrounds: [],
      getRangeList(list) {
        return {
          setBackground: (color) => this.backgrounds.push([list, color]),
        };
      },
      formulas:
        name === "Points"
          ? Object.fromEntries(
              [1, 2, 3].flatMap((number) =>
                Array.from({ length: 4 }, (_, seat) => {
                  const row = (number - 1) * 7 + seat + 3;
                  return [row + ":4", "=C" + row + "-$H$3"];
                }),
              ),
            )
          : {},
      formula: "=COUNTIF(RC[2]:RC[12],TRUE)",
      getRange(...args) {
        return new Range(this, ...args);
      },
      getDataRange() {
        fullReads[this.name] = (fullReads[this.name] || 0) + 1;
        return this.getRange(
          1,
          1,
          this.grid.length,
          Math.max(...this.grid.map((row) => row.length)),
        );
      },
      getMaxRows() {
        return this.grid.length;
      },
      insertRowAfter(row) {
        this.grid.splice(row, 0, Array(9).fill(""));
      },
      insertColumnBefore(column) {
        this.grid.forEach((row) => row.splice(column - 1, 0, ""));
      },
    };
  }
  const now = Date.UTC(2026, 8, 30, 22);
  const config = {
    calendarId: "fake",
    checkinMinutesBefore: 30,
    scoreMinutesAfter: 60,
    semesters: [
      {
        id: "fall-2026",
        start: "2026-08-01",
        end: "2026-12-31",
        attendanceTab: "Attendance",
        pointsTab: "Points",
      },
    ],
  };
  const meeting = {
    id: "fake-meeting",
    date: "2026-09-30",
    semester: "fall-2026",
    attendanceTab: "Attendance",
    pointsTab: "Points",
    opens: now - 1000,
    checkinsClose: now + 10000,
    closes: now + 20000,
    closed: false,
  };
  const store = {
    settings: JSON.stringify(config),
    spreadsheetId: "fake",
    meeting: JSON.stringify(meeting),
  };
  const book = {
    getId: () => "fake",
    getSheetByName: (name) => tabs[name],
    getSpreadsheetTimeZone: () => {
      calls.zones++;
      return "America/New_York";
    },
  };
  let locked = false;
  const cache = new Map();
  const events = [];
  const triggers = [];
  const logs = [];
  const context = vm.createContext({
    Date,
    console: { error() {}, log: (line) => logs.push(JSON.parse(line)) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => store[key] || null,
        getProperties: () => ({ ...store }),
        setProperty: (key, value) => {
          store[key] = value;
        },
        deleteProperty: (key) => {
          delete store[key];
        },
      }),
    },
    SpreadsheetApp: {
      openById: () => {
        calls.opens++;
        return book;
      },
      getActiveSpreadsheet: () => book,
      getUi: () => ({ alert() {} }),
      flush() {
        calls.flushes++;
      },
      CopyPasteType: { PASTE_DATA_VALIDATION: "validation" },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: (ms) => {
          if (ms === 0) calls.quickLocks++;
          else calls.locks++;
          // Another request holds it: a quick try gives up at once.
          if (ms === 0 && (locked || busy)) return false;
          assert.equal(locked, false, "a lock taken inside a held lock");
          locked = true;
          return true;
        },
        releaseLock: () => {
          locked = false;
        },
      }),
    },
    CalendarApp: { getCalendarById: () => ({ getEvents: () => events }) },
    ScriptApp: {
      getProjectTriggers: () => triggers,
      deleteTrigger: (trigger) => triggers.splice(triggers.indexOf(trigger), 1),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (value) => value.toISOString().slice(0, 10),
      parseDate: (value) =>
        vm.runInContext(
          "new Date(" + JSON.stringify(value + "T12:00:00Z") + ")",
          context,
        ),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => cache.get(key),
        put: (key, value) => cache.set(key, value),
        remove: (key) => cache.delete(key),
      }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (value) => ({ setMimeType: () => value }),
    },
  });
  for (const file of ["Rules.gs", "Club.gs"])
    vm.runInContext(
      readFileSync(new URL(file, import.meta.url), "utf8"),
      context,
    );
  // Inject the clock without changing the host's Date constructor.
  vm.runInContext(
    `Date = class extends Date { static now() { return ${now}; } }`,
    context,
  );
  return {
    calls,
    fullReads,
    cache,
    context,
    tabs,
    store,
    meeting,
    config,
    events,
    triggers,
    logs,
    now,
    interruptWrite: () => {
      failWrite = true;
    },
    post: (request) =>
      JSON.parse(
        context.doPost({
          postData: {
            contents: JSON.stringify(request),
          },
        }),
      ),
    get: (request) => JSON.parse(context.doGet({ parameter: request })),
    // Another request holding the lock, as a quick try sees it.
    hold: (value) => {
      busy = value;
    },
    // An officer typing in a tab, as the simple onEdit trigger sees it.
    edit: (name) =>
      context.onEdit({ range: { getSheet: () => ({ getName: () => name }) } }),
  };
}

test("an open meeting accepts code-free check-ins and results, preserving summaries", () => {
  const h = harness();
  const summaries = h.tabs.Points.grid.map((row) => row.slice(6));
  const formulas = { ...h.tabs.Points.formulas };
  for (const computingId of ["a1", "b2", "c3", "d4"])
    assert.equal(h.post({ r: "checkins", computingId }).status, 200);
  const request = {
    r: "results",
    meetingId: h.meeting.id,
    submissionId: "fake-submission-0001",
    seats: ["p001", "p002", "p003", "p004"].map((id) => ({ id, total: 205 })),
  };
  assert.equal(h.post(request).status, 201);
  assert.equal(h.post(request).status, 200);
  assert.equal(h.tabs.Points.grid[9][1], "");
  assert.deepEqual(
    h.tabs.Points.grid.map((row) => row.slice(6)),
    summaries,
  );
  for (const [key, formula] of Object.entries(formulas))
    assert.equal(h.tabs.Points.formulas[key], formula);
  assert.equal(h.get({ r: "meeting" }).players.length, 6);
  const response = h.get({ r: "results" });
  assert.equal(response.tables.length, 1);
  assert.equal(response.tables[0].seats[3].display, "Player p004");
  assert.equal(response.tables[0].seats[3].optOut, true);
  assert.equal(JSON.stringify(response).includes("Dogwood"), false);
  request.seats[0].total = 206;
  request.seats[1].total = 204;
  assert.equal(h.post(request).status, 409);
});

test("results fill existing table templates and stop without changes when full", () => {
  const h = harness();
  const request = {
    r: "results",
    meetingId: h.meeting.id,
    seats: ["p001", "p002", "p003", "p004"].map((id, index) => ({
      id,
      total: [255, 205, 185, 175][index],
    })),
  };
  // A template copied from a filled block, its old game count left behind.
  h.tabs.Points.grid[0][5] = 9;
  for (let number = 1; number <= 3; number++) {
    const submission = {
      ...request,
      submissionId: `template-test-000${number}`,
    };
    const saved = h.post(submission);
    assert.equal(saved.status, 201);
    assert.equal(saved.table, number);
    assert.equal(h.post(submission).status, 200);
    const row = (number - 1) * 7 + 2;
    assert.deepEqual(
      h.tabs.Points.grid.slice(row, row + 4).map((seat) => seat.slice(1, 4)),
      [
        ["Alex Amber", 255, 50],
        ["Blair Birch", 205, 0],
        ["Casey Cedar", 185, -20],
        ["Drew Dogwood", 175, -30],
      ],
    );
  }
  // Whole-table results have no count, so the stale one is cleared.
  assert.equal(h.tabs.Points.grid[0][5], "");
  const before = JSON.stringify(h.tabs.Points);
  const full = h.post({ ...request, submissionId: "template-test-0004" });
  assert.equal(full.status, 503);
  assert.match(full.message, /Add a Table N block/);
  assert.equal(JSON.stringify(h.tabs.Points), before);
  assert.equal(h.get({ r: "results" }).tables.length, 3);
});

test("an interrupted result write retries into its reserved table", () => {
  const h = harness();
  const request = {
    r: "results",
    meetingId: h.meeting.id,
    submissionId: "fake-submission-0002",
    seats: ["p001", "p002", "p003", "p004"].map((id) => ({ id, total: 205 })),
  };
  h.interruptWrite();
  assert.equal(h.post(request).status, 503);
  assert.equal(h.post(request).status, 201);
  assert.equal(h.post(request).table, 1);
});

test("only a player in Points Tracking is suggested", () => {
  const ask = (h) =>
    h.post({ r: "players", computingId: "new7", fullName: "Benjamin Fern" })
      .suggestions;
  assert.equal(ask(harness()), undefined);
  const h = harness();
  h.tabs.Points.grid[2][1] = "Ben Fern";
  assert.deepEqual(ask(h), [{ id: "p006", display: "Ben F." }]);
  // A broken Points tab leaves sign-up working, with no suggestions.
  h.tabs.Points.grid[1][1] = "";
  assert.equal(ask(h), undefined);
});

test("signup claims history, limits suggestions to published players, and inserts before blank checkboxes", () => {
  const h = harness();
  h.tabs.Points.grid[2][1] = "Benjamin Elm";
  const suggestion = h.post({
    r: "players",
    computingId: "new1",
    fullName: "Ben Elm",
  });
  assert.deepEqual(suggestion.suggestions, [
    { id: "p005", display: "Benjamin E." },
  ]);
  assert.equal(
    h.post({
      r: "players",
      computingId: "new1",
      fullName: "Ben Elm",
      matchId: "p005",
    }).player.id,
    "p005",
  );
  assert.equal(h.tabs.Roster.grid[5][1], "new1");
  assert.equal(
    h.post({ r: "players", computingId: "new2", fullName: "  ben   fern " })
      .player.id,
    "p006",
  );
  assert.equal(
    h.post({ r: "players", computingId: "new3", fullName: "Nova Spruce" })
      .status,
    200,
  );
  assert.equal(h.tabs.Roster.grid[7][2], "Nova Spruce");
  assert.equal(h.tabs.Attendance.grid[8][0], "Nova Spruce");
  assert.equal(h.tabs.Attendance.grid[8][3], true);
  assert.equal(
    h.post({ r: "players", computingId: "new4", fullName: "Nova Spruce" })
      .status,
    409,
  );
  assert.equal(
    h.post({ r: "players", computingId: "new5", fullName: "=IMPORTXML()" })
      .status,
    400,
  );
});

test("closed meetings, stale meetings and invalid totals write nothing", () => {
  const h = harness();
  const snapshot = JSON.stringify(h.tabs.Points.grid);
  const seats = ["p001", "p002", "p003", "p004"].map((id) => ({
    id,
    total: 205,
  }));
  const request = {
    r: "results",
    meetingId: h.meeting.id,
    submissionId: "fake-submission-0003",
    seats,
  };
  for (const changes of [
    { meetingId: "yesterday" },
    { seats: [seats[0], seats[0], seats[2], seats[3]] },
    { seats: seats.map((seat) => ({ ...seat, total: 204 })) },
    { seats: seats.map((seat) => ({ ...seat, total: "205" })) },
    { seats: seats.map((seat) => ({ ...seat, total: 205.5 })) },
    { seats: seats.map((seat) => ({ ...seat, id: "p999" })) },
  ])
    assert.ok(h.post({ ...request, ...changes }).status >= 400);
  h.store.meeting = JSON.stringify({ ...h.meeting, closed: true });
  assert.equal(h.post(request).status, 423);
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 423);
  assert.equal(JSON.stringify(h.tabs.Points.grid), snapshot);
  assert.equal(h.get({ r: "meeting" }).players, undefined);
});

test("name derivation matches migration, and layout changes fail before writing", () => {
  const h = harness();
  assert.equal(
    h.context.deriveDisplay("Kevin Jones", ["Kevin J."]),
    "Kevin Jo.",
  );
  assert.equal(
    h.context.deriveDisplay("Kevin Jones", [
      "Kevin J.",
      "Kevin Jo.",
      "Kevin Jon.",
      "Kevin Jone.",
      "Kevin Jones.",
    ]),
    null,
  );
  h.tabs.Attendance.grid[1][1] = "renamed";
  const snapshot = JSON.stringify(h.tabs.Attendance.grid);
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 503);
  assert.equal(JSON.stringify(h.tabs.Attendance.grid), snapshot);
  const incomplete = harness();
  incomplete.tabs.Roster.grid[7][0] = "p999";
  const before = JSON.stringify(incomplete.tabs.Roster.grid);
  assert.equal(
    incomplete.post({
      r: "players",
      computingId: "new1",
      fullName: "Nova Spruce",
    }).status,
    503,
  );
  assert.equal(JSON.stringify(incomplete.tabs.Roster.grid), before);
});

test("a newcomer claims the Roster row an officer added with a nickname", () => {
  const h = harness();
  h.tabs.Roster.grid[7] = ["p007", "", "Kevin Jones", "Kev J.", false];
  const reply = h.post({
    r: "players",
    computingId: "kj9",
    fullName: "Kevin Jones",
  });
  assert.equal(reply.player.id, "p007");
  assert.equal(reply.player.display, "Kev J.");
  assert.equal(h.tabs.Roster.grid[7][1], "kj9");
});

test("an unscheduled meeting inserts a date inside the formula range", () => {
  const h = harness();
  h.store.meeting = JSON.stringify({ ...h.meeting, date: "2026-10-01" });
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 200);
  assert.equal(
    h.tabs.Attendance.grid[1][3].toISOString().slice(0, 10),
    "2026-10-01",
  );
  assert.equal(h.tabs.Attendance.grid[2][3], true);
  assert.equal(h.tabs.Attendance.grid[3][3], false);
});

test("calendar windows open once, close check-in before scores, and respect Close now", () => {
  const h = harness();
  h.store.meeting = "null";
  h.events.push({
    isAllDayEvent: () => false,
    getId: () => "calendar-event",
    getStartTime: () => new h.context.Date(h.now + 15 * 60000),
    getEndTime: () => new h.context.Date(h.now + 75 * 60000),
  });
  assert.equal(h.get({ r: "meeting" }).checkinsOpen, true);
  const opened = JSON.parse(h.store.meeting);
  assert.equal(opened.opens, h.now - 15 * 60000);
  assert.equal(opened.closes, h.now + 135 * 60000);
  h.context.Date.now = () => h.now + 76 * 60000;
  assert.equal(h.get({ r: "meeting" }).open, true);
  assert.equal(h.get({ r: "meeting" }).checkinsOpen, false);
  h.context.clubClose();
  assert.equal(h.get({ r: "meeting" }).open, false);
  assert.equal(JSON.parse(h.store.meeting).closed, true);
});

test("Set up is repeatable, and malformed settings do not replace valid settings", () => {
  const h = harness();
  h.triggers.push({ getHandlerFunction: () => "clubTick" });
  h.context.clubSetup();
  h.context.clubSetup();
  assert.equal(h.triggers.length, 0);
  h.store.meeting = "null";
  const previous = h.store.settings;
  assert.throws(() =>
    h.context.clubSaveSettings({
      ...h.config,
      semesters: [{ ...h.config.semesters[0], start: "2026-02-30" }],
    }),
  );
  assert.equal(h.store.settings, previous);
});

test("negative final totals save, retry, and appear in results", () => {
  for (const totals of [
    [-15, 425, 205, 205],
    [-15, 835, 0, 0],
  ]) {
    const h = harness();
    for (const computingId of ["a1", "b2", "c3", "d4"])
      assert.equal(h.post({ r: "checkins", computingId }).status, 200);
    const request = {
      r: "results",
      meetingId: h.meeting.id,
      submissionId: "negative-total-test-1",
      seats: ["p001", "p002", "p003", "p004"].map((id, i) => ({
        id,
        total: totals[i],
      })),
    };
    assert.equal(h.post(request).status, 201);
    assert.equal(h.post(request).status, 200);
    const response = h.get({ r: "results" });
    assert.equal(response.status, 200);
    assert.deepEqual(
      response.tables[0].seats.map((seat) => seat.total),
      totals,
    );
    assert.equal(response.tables[0].seats[0].net, -220);
  }
});

function seatedTable(h, ids = ["p001", "p002", "p003", "p004"]) {
  const room = (playerId, action, extra = {}) =>
    h.post({ r: "rooms", action, meetingId: h.meeting.id, playerId, ...extra });
  ids.forEach((id, wind) =>
    assert.equal(room(id, "join", { table: 1, seat: wind }).status, 200),
  );
  let lastHandId = null;
  const hand = (winner, each, by = "p001", handId = crypto.randomUUID()) => {
    const reply = room(by, "hand", {
      table: 1,
      session: table().session,
      winner,
      each,
      handId,
      lastHandId,
    });
    if (reply.status === 200) lastHandId = handId;
    return reply;
  };
  const table = () =>
    h.get({ r: "rooms", results: "0" }).rooms.find((r) => r.table === 1);
  const end = (by = "p001", extra = {}) =>
    room(by, "end", {
      table: 1,
      session: table().session,
      lastHandId,
      ...extra,
    });
  return { room, hand, end, table, last: () => lastHandId };
}

const savedTables = (h) =>
  h.context.pointsLayout(h.tabs.Points.grid).filter((block) => !block.empty);

test("a game pays the winner three times each, and End saves one table and releases everyone", () => {
  const h = harness();
  const t = seatedTable(h);
  assert.equal(t.hand("p001", 20).status, 200);
  assert.equal(t.hand("p003", 10, "p004").status, 200);
  assert.deepEqual(
    t.table().totals.map((seat) => seat.total),
    [255, 175, 215, 175],
  );
  const session = t.table().session;
  const ended = t.end("p002");
  assert.equal(ended.status, 200);
  assert.equal(ended.saved, 1);
  const room = t.table();
  assert.equal(room.seats.length, 0);
  assert.equal(room.session, session + 1);
  assert.equal(room.ended.games, 2);
  assert.equal(room.ended.sheetTable, 1);
  assert.equal("tableId" in room, false);
  // The game count goes beside "Table 1", in F of the block's own row.
  assert.equal(h.tabs.Points.grid[0][1], "Table 1");
  assert.equal(h.tabs.Points.grid[0][5], 2);
  assert.deepEqual(
    room.ended.totals.map((seat) => [seat.display, seat.total]),
    [
      ["Alex A.", 255],
      ["Blair B.", 175],
      ["Casey C.", 215],
      ["Player p004", 175],
    ],
  );
  // A repeated End from a released player returns the same save, once.
  assert.equal(t.end("p003", { session }).saved, 1);
  assert.equal(savedTables(h).length, 1);
  assert.deepEqual(
    h.get({ r: "results" }).tables[0].seats.map((seat) => seat.total),
    [255, 175, 215, 175],
  );
  // Tonight's standings get the saved tables with the rooms; tables opt out.
  assert.equal(h.get({ r: "rooms" }).results.length, 1);
  assert.equal("results" in h.get({ r: "rooms", results: "0" }), false);
  // Everyone can join another table, which starts at 205.
  assert.equal(t.room("p001", "join", { table: 2, seat: 0 }).status, 200);
});

test("a game count that cannot be written never blocks the table's save", () => {
  const h = harness();
  const t = seatedTable(h);
  assert.equal(t.hand("p001", 20).status, 200);
  // As if F were merged or protected: the count fails, the scores still save.
  const getRange = h.tabs.Points.getRange;
  h.tabs.Points.getRange = function (row, column, ...rest) {
    if (column === 6) throw new Error("Merged cell");
    return getRange.call(this, row, column, ...rest);
  };
  assert.equal(t.end("p002").saved, 1);
  assert.equal(h.tabs.Points.grid[0][5] ?? "", "");
  assert.equal(savedTables(h).length, 1);
});

test("a swap saves the round and keeps the players who stay in their seats", () => {
  const h = harness();
  const t = seatedTable(h);
  assert.equal(t.hand("p001", 20).status, 200);
  const session = t.table().session;
  // Only ids seated at this table can stay.
  assert.equal(t.end("p004", { keep: ["p001", "p009"] }).status, 400);
  assert.equal(t.end("p004", { keep: "p001" }).status, 400);
  const ended = t.end("p004", { keep: ["p001", "p002", "p003"] });
  assert.equal(ended.status, 200);
  assert.equal(ended.saved, 1);
  const room = t.table();
  assert.equal(room.session, session + 1);
  assert.deepEqual(
    room.seats.map((seat) => [seat.id, seat.wind]),
    [
      ["p001", 0],
      ["p002", 1],
      ["p003", 2],
    ],
  );
  assert.deepEqual(room.hands, []);
  // The saved round is the whole group, and the next round starts at 205.
  assert.equal(room.ended.totals.length, 4);
  assert.equal(room.ended.totals[3].display, "Player p004");
  assert.deepEqual(
    h.get({ r: "results" }).tables[0].seats.map((seat) => seat.total),
    [265, 185, 185, 185],
  );
  assert.deepEqual(
    room.totals.map((seat) => seat.total),
    [205, 205, 205],
  );
  // A retried swap changes nothing.
  assert.equal(t.end("p004", { session, keep: ["p001"] }).saved, 1);
  assert.equal(t.table().seats.length, 3);
  assert.equal(savedTables(h).length, 1);
  // The empty seat is open to someone new, and the game waits for them.
  const early = t.room("p001", "hand", {
    table: room.table,
    session: room.session,
    winner: "p001",
    each: 10,
    handId: crypto.randomUUID(),
    lastHandId: null,
  });
  assert.equal(early.status, 409);
  assert.match(early.message, /four players/);
  assert.equal(t.room("p004", "join", { table: 1, seat: 3 }).status, 200);
});

test("removing someone before any game only frees their seat", () => {
  const h = harness();
  const t = seatedTable(h);
  assert.equal(t.hand("p001", 20).status, 200);
  // A swap saves round 1; the three who stay start round 2 with no games.
  assert.equal(t.end("p004", { keep: ["p001", "p002", "p003"] }).status, 200);
  const before = t.table();
  const removed = t.end("p001", {
    session: before.session,
    lastHandId: null,
    keep: ["p001", "p002"],
  });
  assert.equal(removed.status, 200);
  const room = t.table();
  // Same round, one seat fewer, and round 1's receipt is still there.
  assert.equal(room.session, before.session);
  assert.deepEqual(
    room.seats.map((seat) => seat.id),
    ["p001", "p002"],
  );
  assert.deepEqual(room.ended, before.ended);
  assert.equal(savedTables(h).length, 1);
});

test("table requests never read the sheets", () => {
  const h = harness();
  h.get({ r: "meeting" });
  const reads = h.calls.reads;
  const t = seatedTable(h);
  assert.equal(t.hand("p001", 20).status, 200);
  assert.equal(
    "results" in t.room("p001", "undo", { lastHandId: t.last() }),
    false,
  );
  t.table();
  assert.equal(h.calls.reads, reads);
});

test("tonight's standings count a table being ended exactly once", () => {
  const h = harness();
  const t = seatedTable(h);
  assert.equal(t.hand("p001", 20).status, 200);
  // Standings rebuilt from the sheets just before End, and cached after it,
  // are never used for the night after it.
  assert.equal(h.get({ r: "rooms" }).results.length, 0);
  const before = h.cache.get("results:" + h.meeting.id);
  const key = Object.keys(h.store).find((k) => k.startsWith("room:"));
  const playing = h.store[key];
  assert.equal(t.end().saved, 1);
  assert.equal(h.store.saves, "2");
  h.cache.set("results:" + h.meeting.id, before);
  assert.equal(h.get({ r: "rooms" }).results.length, 1);
  // The next group sits down and ends with no games, replacing the summary.
  const next = seatedTable(h);
  assert.equal(next.end().saved, null);
  h.cache.set("results:" + h.meeting.id, before);
  assert.equal(h.get({ r: "rooms" }).results.length, 1);
  // A read in the middle of an End (table saved, seats not yet released)
  // waits for it to finish rather than counting the table twice.
  const ended = h.store[key];
  h.store[key] = playing;
  h.store.saves = "3";
  h.cache.clear();
  let waits = 0;
  h.context.Utilities.sleep = () => {
    waits++;
    h.store[key] = ended;
    h.store.saves = "4";
  };
  const state = h.get({ r: "rooms" });
  assert.equal(waits, 1);
  assert.equal(state.results.length, 1);
  assert.equal(state.rooms[0].hands.length, 0);
});

test("ending a table with no games releases everyone and writes nothing", () => {
  const h = harness();
  const t = seatedTable(h);
  const ended = t.end();
  assert.equal(ended.status, 200);
  assert.equal(ended.saved, null);
  assert.equal(savedTables(h).length, 0);
  assert.equal(t.table().seats.length, 0);
});

test("two phones recording one game count it once, and undo needs the latest view", () => {
  const h = harness();
  const t = seatedTable(h);
  const handId = crypto.randomUUID();
  assert.equal(t.hand("p001", 20, "p001", handId).status, 200);
  assert.equal(
    t.room("p001", "hand", {
      table: 1,
      session: 1,
      winner: "p001",
      each: 20,
      handId,
      lastHandId: null,
    }).status,
    200,
  );
  assert.equal(
    t.room("p002", "hand", {
      table: 1,
      session: 1,
      winner: "p001",
      each: 20,
      handId: crypto.randomUUID(),
      lastHandId: null,
    }).status,
    409,
  );
  assert.equal(t.table().hands.length, 1);
  assert.equal(
    t.room("p003", "undo", { table: 1, session: 1, lastHandId: null }).status,
    409,
  );
  assert.equal(
    t.room("p003", "undo", { table: 1, session: 1, lastHandId: handId }).status,
    200,
  );
  assert.equal(t.table().hands.length, 0);
  for (const [winner, each] of [
    ["p009", 5],
    ["p002", 0],
    ["p002", 1.5],
  ])
    assert.equal(
      t.room("p001", "hand", {
        table: 1,
        session: 1,
        winner,
        each,
        handId: crypto.randomUUID(),
        lastHandId: null,
      }).status,
      400,
    );
});

test("a stale End is refused, and so is ending someone else's table", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  assert.equal(t.end("p001", { lastHandId: null }).status, 409);
  assert.equal(t.end("p005").status, 409);
  assert.equal(t.table().seats.length, 4);
});

test("game saves and undo stay bound to the table session the phone saw", () => {
  for (const nextTable of [1, 2]) {
    const h = harness();
    const t = seatedTable(h);
    const original = { table: 1, session: 1 };
    const delayed = {
      ...original,
      winner: "p001",
      each: 20,
      handId: crypto.randomUUID(),
      lastHandId: null,
    };
    assert.equal(t.end("p002").status, 200);
    for (const [seat, id] of ["p001", "p002", "p003", "p004"].entries())
      assert.equal(t.room(id, "join", { table: nextTable, seat }).status, 200);
    const current = { table: nextTable, session: nextTable === 1 ? 2 : 1 };
    const before = JSON.stringify(h.store);
    assert.equal(t.room("p001", "hand", delayed).status, 409);
    assert.equal(
      JSON.stringify(h.store),
      before,
      "a stale save writes nothing",
    );

    const save = { ...delayed, ...current };
    assert.equal(t.room("p001", "hand", save).status, 200);
    assert.equal(t.room("p001", "hand", save).status, 200, "retry is safe");
    const room = () =>
      h.get({ r: "rooms" }).rooms.find((item) => item.table === nextTable);
    assert.equal(room().hands.length, 1);
    assert.deepEqual(
      room().totals.map((seat) => seat.total),
      [265, 185, 185, 185],
    );
    assert.equal(
      t.room("p001", "undo", { ...original, lastHandId: save.handId }).status,
      409,
    );
    assert.equal(room().hands.length, 1, "a stale undo leaves the game intact");
    assert.equal(
      t.room("p001", "undo", { ...current, lastHandId: save.handId }).status,
      200,
    );
    assert.equal(room().hands.length, 0);
  }
});

test("clients must identify the table session before saving or undoing a game", () => {
  const h = harness();
  const t = seatedTable(h);
  const save = {
    winner: "p001",
    each: 20,
    handId: crypto.randomUUID(),
    lastHandId: null,
  };
  for (const partial of [{}, { table: 1 }, { session: 1 }])
    assert.equal(t.room("p001", "hand", { ...save, ...partial }).status, 409);
  assert.equal(t.table().hands.length, 0);
  assert.equal(
    t.room("p001", "hand", { ...save, table: 1, session: 1 }).status,
    200,
  );
  for (const partial of [{}, { table: 1 }, { session: 1 }])
    assert.equal(
      t.room("p001", "undo", { lastHandId: save.handId, ...partial }).status,
      409,
    );
  assert.equal(t.table().hands.length, 1);
});

test("leaving is allowed only before a game; joining elsewhere needs leaving first", () => {
  const h = harness();
  const t = seatedTable(h, ["p001", "p002", "p003"]);
  assert.equal(t.room("p003", "join", { table: 2 }).status, 409);
  assert.equal(t.room("p003", "leave").status, 200);
  assert.equal(t.room("p003", "join", { table: 2 }).status, 200);
  assert.equal(t.room("p004", "join", { table: 1, seat: 2 }).status, 200);
  assert.equal(t.room("p005", "join", { table: 1, seat: 3 }).status, 200);
  t.hand("p002", 15);
  const leave = t.room("p004", "leave");
  assert.equal(leave.status, 409);
  assert.match(leave.message, /End the table/);
  assert.equal(t.room("p004", "join", { table: 3 }).status, 409);
  assert.equal(t.table().seats.length, 4);
});

test("seats are winds: a taken wind is refused by name, and seats return in wind order", () => {
  const h = harness();
  const t = seatedTable(h, ["p001"]);
  const clash = t.room("p002", "join", { table: 1, seat: 0 });
  assert.equal(clash.status, 409);
  assert.match(clash.message, /East was just taken/);
  assert.equal(t.room("p002", "join", { table: 1, seat: 3 }).status, 200);
  assert.equal(t.room("p003", "join", { table: 1 }).status, 200);
  assert.deepEqual(
    t.table().seats.map((seat) => [seat.id, seat.wind]),
    [
      ["p001", 0],
      ["p003", 1],
      ["p002", 3],
    ],
  );
  // A bad wind is refused, even when moving within your own table.
  for (const seat of [9, "x", null, 1.5])
    assert.equal(t.room("p002", "join", { table: 1, seat }).status, 400);
  assert.deepEqual(
    t.table().seats.map((item) => item.wind),
    [0, 1, 3],
  );
  // Moving seats at your own table works until a game is saved.
  assert.equal(t.room("p003", "join", { table: 1, seat: 2 }).status, 200);
  assert.equal(t.room("p004", "join", { table: 1, seat: 1 }).status, 200);
  assert.equal(t.room("p005", "join", { table: 1 }).status, 409);
});

test("players must be checked in, and tables are numbered within the limit", () => {
  const h = harness();
  const room = (playerId, extra) =>
    h.post({
      r: "rooms",
      action: "join",
      meetingId: h.meeting.id,
      playerId,
      ...extra,
    });
  assert.equal(room("p099", { table: 1 }).status, 409);
  assert.equal(room("p001", { table: 0 }).status, 400);
  assert.equal(room("p001", { table: 13 }).status, 400);
  assert.equal(room("p001", { table: 1, seat: 4 }).status, 400);
  assert.equal(
    h.post({
      r: "rooms",
      action: "join",
      meetingId: "old",
      playerId: "p001",
      table: 1,
    }).status,
    409,
  );
});

test("closing the meeting saves every room with games", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p003", 30);
  h.context.clubClose();
  assert.equal(savedTables(h).length, 1);
  assert.equal(
    Object.keys(h.store).some((key) => key.startsWith("room:")),
    false,
  );
});

test("the first request after scoring closes saves rooms with games", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p002", 25);
  vm.runInContext(
    `Date = class extends Date { static now() { return ${h.meeting.closes + 60000}; } }`,
    h.context,
  );
  assert.equal(h.get({ r: "rooms" }).status, 423);
  assert.equal(savedTables(h).length, 1);
});

test("a table that cannot save keeps its players and games", () => {
  const h = harness();
  const t = seatedTable(h);
  for (let n = 1; n <= 3; n++)
    assert.equal(
      h.post({
        r: "results",
        meetingId: h.meeting.id,
        submissionId: "fill-template-000" + n,
        seats: ["p001", "p002", "p003", "p004"].map((id) => ({
          id,
          total: 205,
        })),
      }).status,
      201,
    );
  t.hand("p001", 10);
  assert.equal(t.end().status, 503);
  const room = t.table();
  assert.equal(room.seats.length, 4);
  assert.equal(room.hands.length, 1);
});

// Fills the three template blocks, so the next table save has nowhere to go.
function fillSheet(h) {
  for (let n = 1; n <= 3; n++)
    h.post({
      r: "results",
      meetingId: h.meeting.id,
      submissionId: "fill-template-000" + n,
      seats: ["p001", "p002", "p003", "p004"].map((id) => ({ id, total: 205 })),
    });
}

function alerts(h) {
  const shown = [];
  h.context.SpreadsheetApp.getUi = () => ({
    alert: (message) => shown.push(message),
  });
  return shown;
}

test("Close names a table it could not save, with totals, and keeps it", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  fillSheet(h);
  const shown = alerts(h);
  h.context.clubClose();
  assert.match(shown[0], /Table 1 wasn’t saved/);
  assert.match(shown[0], /235/);
  assert.doesNotMatch(shown[0], /Saved tables publish/);
  const kept = Object.keys(h.store).filter((key) => key.startsWith("room:"));
  assert.equal(kept.length, 1);
  assert.equal(JSON.parse(h.store[kept[0]]).hands.length, 1);
});

test("a table that failed at close saves once after the cause is fixed", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  const save = h.context.submitResult;
  h.context.submitResult = () => {
    throw new Error("Sheet timed out.");
  };
  h.context.clubClose();
  assert.equal(savedTables(h).length, 0);
  h.context.submitResult = save;
  // A page load retries it, then an officer's second Close finds nothing left.
  h.get({ r: "meeting" });
  h.context.clubClose();
  assert.equal(savedTables(h).length, 1);
});

test("Recheck lists unsaved tables, even from an earlier meeting", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  fillSheet(h);
  const shown = alerts(h);
  h.context.clubClose();
  const key = Object.keys(h.store).find((item) => item.startsWith("room:"));
  h.store[key] = JSON.stringify({
    ...JSON.parse(h.store[key]),
    meetingId: "event:" + Date.UTC(2026, 9, 9, 23),
  });
  h.context.clubRecheck();
  assert.match(shown.at(-1), /Table 1 wasn’t saved: from 2026-10-09/);
});

test("a table with games but not four seats is reported at close, not deleted", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  const key = Object.keys(h.store).find((item) => item.startsWith("room:"));
  const room = JSON.parse(h.store[key]);
  h.store[key] = JSON.stringify({ ...room, seats: room.seats.slice(0, 3) });
  const shown = alerts(h);
  h.context.clubClose();
  assert.match(shown[0], /Table 1 wasn’t saved/);
  assert.ok(h.store[key]);
});

test("officers can end a stuck table from the Club menu, saving its games", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p004", 20);
  const alerts = [];
  h.context.SpreadsheetApp.getUi = () => ({
    alert: (message) => alerts.push(message),
    prompt: () => ({
      getSelectedButton: () => "OK",
      getResponseText: () => " 1 ",
    }),
    ButtonSet: { OK_CANCEL: "OK_CANCEL" },
    Button: { OK: "OK" },
  });
  h.context.clubEndTable();
  assert.match(alerts[0], /1 games were saved as Table 1/);
  assert.equal(savedTables(h).length, 1);
  assert.equal(t.table().seats.length, 0);
  assert.equal(t.table().ended.by, "An officer");
  h.context.clubEndTable();
  assert.match(alerts[1], /Nobody is seated/);
});

test("each request logs its kind, status and timing, never who sent it", () => {
  const h = harness();
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 200);
  const t = seatedTable(h);
  t.hand("p001", 10);
  h.get({ r: "rooms" });
  const lines = h.logs.map((line) => line.request);
  assert.ok(lines.includes("POST checkins"));
  assert.ok(lines.includes("POST rooms hand"));
  assert.ok(lines.includes("GET rooms"));
  for (const line of h.logs) {
    assert.deepEqual(Object.keys(line).sort(), [
      "lockMs",
      "ms",
      "request",
      "status",
    ]);
    assert.equal(typeof line.ms, "number");
  }
  assert.equal(JSON.stringify(h.logs).match(/a1|p001|Alex|Amber/), null);
});

test("check-in startup opens the workbook only once per request", () => {
  const h = harness();
  assert.equal(h.get({ r: "meeting" }).checkinsOpen, true);
  assert.equal(h.calls.opens, 1);
  // Without tonight's stored list, so the request reads the sheets again.
  delete h.store.here;
  assert.equal(h.get({ r: "meeting" }).checkinsOpen, true);
  assert.equal(
    h.calls.opens,
    2,
    "The workbook handle must not leak across requests",
  );
});

test("an unknown ID after loading the form avoids spreadsheet reads and the write lock", () => {
  const h = harness();
  h.get({ r: "meeting" });
  const before = { ...h.calls };
  const reply = h.post({ r: "checkins", computingId: "new99" });
  assert.equal(reply.status, 404);
  assert.deepEqual(h.calls, before);
  assert.equal(JSON.stringify(reply).includes("Amber"), false);
  assert.equal(JSON.stringify(reply).includes("a1"), false);
});

test("returning check-in avoids rewriting an existing attendance checkbox", () => {
  const h = harness();
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 200);
  assert.equal(h.calls.writes, 0);
  h.tabs.Attendance.grid[2][3] = false;
  h.edit("Attendance");
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 200);
  assert.equal(h.calls.writes, 1);
  assert.equal(h.tabs.Attendance.grid[2][3], true);
});

test("new-player signup reads attendance once and still checks in the player", () => {
  const h = harness();
  const reply = h.post({
    r: "players",
    computingId: "new99",
    fullName: "Nova Spruce",
  });
  assert.equal(reply.status, 200);
  assert.equal(h.fullReads.Attendance, 1);
  assert.equal(h.fullReads.Roster, 1);
  assert.equal(h.calls.opens, 1);
  assert.equal(JSON.parse(h.store.here).players.length, 7, "list stored");
  assert.ok(
    h
      .get({ r: "meeting" })
      .players.some((player) => player.id === reply.player.id),
  );
});

test("a cached calendar opens check-in at its boundary without a five-minute delay", () => {
  const h = harness();
  h.store.meeting = "null";
  h.events.push({
    isAllDayEvent: () => false,
    getId: () => "near-opening",
    getStartTime: () => new h.context.Date(h.now + 31 * 60000),
    getEndTime: () => new h.context.Date(h.now + 91 * 60000),
  });
  assert.equal(h.get({ r: "meeting" }).open, false);
  h.context.Date.now = () => h.now + 60000;
  assert.equal(h.get({ r: "meeting" }).checkinsOpen, true);
});

test("spreadsheet date headers reuse one timezone read per request", () => {
  const h = harness();
  h.tabs.Attendance.grid[1].splice(
    3,
    1,
    new h.context.Date("2026-09-30T12:00:00Z"),
    new h.context.Date("2026-10-01T12:00:00Z"),
    new h.context.Date("2026-10-02T12:00:00Z"),
  );
  assert.equal(h.get({ r: "meeting" }).players.length, 6);
  assert.equal(h.calls.zones, 1);
  delete h.store.here;
  h.get({ r: "meeting" });
  assert.equal(h.calls.zones, 2);
});

test("new IDs, cache misses, expiry and corruption fall back to authoritative check-in", () => {
  for (const state of ["empty", "expired", "corrupt", "unavailable"]) {
    const h = harness();
    h.get({ r: "meeting" });
    if (state === "empty") h.cache.clear();
    if (state === "expired") {
      // Keep the meeting open while the hint expires.
      h.context.Date.now = () => h.now + 30001;
      h.store.meeting = JSON.stringify({
        ...h.meeting,
        checkinsClose: h.now + 60000,
        closes: h.now + 120000,
      });
    }
    if (state === "corrupt") h.cache.set("checkin-ids:fake", "invalid JSON");
    if (state === "unavailable")
      h.context.CacheService.getScriptCache = () => {
        throw new Error("Cache unavailable");
      };
    assert.equal(
      h.post({ r: "checkins", computingId: "new99" }).status,
      404,
      state,
    );
    assert.equal(
      h.post({ r: "checkins", computingId: "a1" }).player.id,
      "p001",
      state,
    );
  }
});

test("signup invalidates the ID hint and retries never create a second player", () => {
  const h = harness();
  h.get({ r: "meeting" });
  assert.equal(h.post({ r: "checkins", computingId: "new99" }).status, 404);
  const request = {
    r: "players",
    computingId: "new99",
    fullName: "Nova Spruce",
  };
  const reply = h.post(request);
  assert.equal(reply.status, 200);
  assert.equal(
    h.post({ r: "checkins", computingId: "new99" }).player.id,
    reply.player.id,
  );
  assert.equal(h.post(request).player.id, reply.player.id);
  assert.equal(
    h.tabs.Roster.grid.filter((row) => row[1] === "new99").length,
    1,
  );
});

test("roster edits invalidate the hint and stale hints never authorize signup or reopening", () => {
  const h = harness();
  h.get({ r: "meeting" });
  h.tabs.Roster.grid[1][1] = "changed99";
  h.context.onEdit({
    range: { getSheet: () => ({ getName: () => "Roster" }) },
  });
  assert.equal(
    h.post({ r: "checkins", computingId: "changed99" }).player.id,
    "p001",
  );
  h.get({ r: "meeting" });
  // A missed edit notification may reveal the name field, but must not
  // change an existing identity when the newcomer submits that field.
  h.tabs.Roster.grid[1][1] = "manual99";
  assert.equal(h.post({ r: "checkins", computingId: "manual99" }).status, 404);
  assert.equal(
    h.post({ r: "players", computingId: "manual99", fullName: "Wrong Name" })
      .player.id,
    "p001",
  );
  h.store.meeting = JSON.stringify({ ...h.meeting, closed: true });
  assert.equal(h.post({ r: "checkins", computingId: "new99" }).status, 423);
  assert.equal(h.post({ r: "checkins", computingId: "manual99" }).status, 423);
});

test("new ID hints never bypass validation or cross workbooks", () => {
  const h = harness();
  h.get({ r: "meeting" });
  for (const computingId of ["", "bad@id", "99wrong"])
    assert.equal(h.post({ r: "checkins", computingId }).status, 400);
  h.tabs.Roster.grid[1][1] = "other99";
  h.store.spreadsheetId = "another-workbook";
  assert.equal(
    h.post({ r: "checkins", computingId: "other99" }).player.id,
    "p001",
  );
});

test("an unavailable ID cache cannot block registration or authoritative saves", () => {
  const h = harness();
  h.context.CacheService.getScriptCache = () => {
    throw new Error("Cache unavailable");
  };
  const request = {
    r: "players",
    computingId: "new99",
    fullName: "Nova Spruce",
  };
  const reply = h.post(request);
  assert.equal(reply.status, 200);
  assert.equal(h.post(request).player.id, reply.player.id);
});

test("tonight's list spares reads, table actions and repeat check-ins the sheets and the queue", () => {
  const h = harness();
  // With the lock busy, a read goes to the sheets without waiting or storing.
  h.hold(true);
  let before = { ...h.calls };
  assert.equal(h.get({ r: "meeting" }).players.length, 6);
  assert.equal(h.calls.locks, before.locks);
  assert.equal(h.store.here, undefined);
  // With it free, the read stores the list without waiting.
  h.hold(false);
  h.get({ r: "meeting" });
  assert.equal(h.calls.locks, before.locks, "never waits for the lock");
  assert.ok(h.store.here);
  h.post({ r: "checkins", computingId: "b2" });
  before = { ...h.calls };
  assert.equal(h.get({ r: "meeting" }).players.length, 6);
  assert.equal(h.calls.reads, before.reads, "GET meeting reads no sheets");
  before = { ...h.calls };
  assert.equal(h.post({ r: "checkins", computingId: "a1" }).status, 200);
  assert.equal(h.calls.locks, before.locks, "a repeat check-in skips the lock");
  const t = seatedTable(h);
  const reads = { ...h.fullReads };
  t.hand("p001", 10);
  assert.equal(h.fullReads.Roster, reads.Roster);
  assert.equal(h.fullReads.Attendance, reads.Attendance);
  // An officer unticks a player: the list is rebuilt from the sheet.
  h.tabs.Attendance.grid[3][3] = false;
  h.edit("Attendance");
  before = { ...h.calls };
  assert.equal(h.get({ r: "meeting" }).players.length, 5);
  assert.equal(
    h.calls.locks,
    before.locks,
    "a missing list never queues reads",
  );
  t.hand("p001", 10);
  assert.equal(
    JSON.parse(h.store.here).players.length,
    5,
    "the next write stores it",
  );
  h.edit("Points");
  assert.ok(h.store.here, "edits elsewhere keep the list");
});

test("every write takes the lock exactly once", () => {
  const h = harness();
  delete h.store.here;
  for (const request of [
    { r: "checkins", computingId: "a1" },
    { r: "players", computingId: "new99", fullName: "Nova Spruce" },
  ]) {
    const locks = h.calls.locks;
    delete h.store.here;
    assert.equal(h.post(request).status, 200);
    assert.equal(h.calls.locks, locks + 1, request.r);
  }
  let locks = h.calls.locks;
  delete h.store.here;
  const t = seatedTable(h);
  assert.equal(h.calls.locks - locks, 4, "four joins, four locks");
  for (const [name, write] of [
    ["hand", () => t.hand("p001", 10)],
    ["end", () => t.end()],
    [
      "results",
      () =>
        h.post({
          r: "results",
          meetingId: h.meeting.id,
          submissionId: crypto.randomUUID(),
          seats: ["p001", "p002", "p003", "p005"].map((id, i) => ({
            id,
            total: [215, 205, 200, 200][i],
          })),
        }),
    ],
  ]) {
    locks = h.calls.locks;
    delete h.store.here;
    assert.ok(write().status < 300, name);
    assert.equal(h.calls.locks, locks + 1, name);
  }
});

test("a list stored from an older Roster rebuilds rather than refusing a checked-in player", () => {
  const h = harness();
  h.post({ r: "checkins", computingId: "a1" });
  // As if p006 checked in after the list was stored, by a path that missed it.
  const here = JSON.parse(h.store.here);
  here.players = here.players.filter((player) => player.id !== "p006");
  h.store.here = JSON.stringify(here);
  const t = seatedTable(h, ["p001", "p002", "p003", "p006"]);
  assert.equal(t.hand("p006", 10).status, 200);
  assert.ok(JSON.parse(h.store.here).players.some((p) => p.id === "p006"));
});

test("saves read every receipt note at once, and reads between meetings never queue", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  const notes = h.calls.noteReads;
  assert.equal(t.end().status, 200);
  assert.equal(h.calls.noteReads - notes, 1, "one note read per save");
  // After close, the first read saves the tables under the lock; later reads,
  // with nothing to open, close or save, never queue.
  h.store.meeting = JSON.stringify({ ...h.meeting, closed: true });
  h.get({ r: "meeting" });
  const locks = h.calls.locks;
  assert.equal(h.get({ r: "meeting" }).open, false);
  assert.equal(h.calls.locks, locks);
});

test("a made-up player ID cannot force tonight's list to be rebuilt", () => {
  const h = harness();
  h.post({ r: "checkins", computingId: "a1" });
  const reads = h.fullReads.Attendance;
  const reply = h.post({
    r: "rooms",
    action: "join",
    meetingId: h.meeting.id,
    playerId: "not-a-player",
    table: 1,
  });
  assert.equal(reply.status, 409);
  assert.equal(h.fullReads.Attendance, reads);
});

test("Recheck colours every table in at most two Sheet writes", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  t.end();
  h.tabs.Points.grid[2][3] = 999;
  h.tabs.Points.backgrounds = [];
  h.context.clubRecheck();
  // JSON round-trip: the script's arrays come from another realm.
  assert.deepEqual(JSON.parse(JSON.stringify(h.tabs.Points.backgrounds)), [
    [["B2:D6"], "#fce8e6"],
    [["B9:D13", "B16:D20"], null],
  ]);
});

test("Recheck reads Attendance once per semester, and Points edits refresh results", () => {
  const h = harness();
  const t = seatedTable(h);
  t.hand("p001", 10);
  t.end();
  t.room("p002", "join", { table: 2, seat: 0 });
  const reads = h.fullReads.Attendance;
  h.context.clubRecheck();
  assert.equal(h.fullReads.Attendance - reads, 1);
  h.get({ r: "results" });
  assert.ok(h.cache.has("results:" + h.meeting.id));
  h.edit("Points");
  assert.equal(h.cache.has("results:" + h.meeting.id), false);
});
