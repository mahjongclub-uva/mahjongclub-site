import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

// Small in-memory workbook. Production entry points run unchanged through doGet/doPost.
function harness() {
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
  class Range {
    constructor(tab, row, column, rows = 1, columns = 1) {
      Object.assign(this, { tab, row, column, rows, columns });
    }
    getValue() {
      return this.tab.grid[this.row - 1]?.[this.column - 1] ?? "";
    }
    getValues() {
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
    getNote() {
      return this.tab.notes[this.row + ":" + this.column] || "";
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
    setBackground() {
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
    publishedPlayers: [{ id: "p005", display: "Benjamin E." }],
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
    getSpreadsheetTimeZone: () => "America/New_York",
  };
  let locked = false;
  const cache = new Map();
  const events = [];
  const triggers = [];
  const context = vm.createContext({
    Date,
    console: { error() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => store[key] || null,
        setProperty: (key, value) => {
          store[key] = value;
        },
      }),
    },
    SpreadsheetApp: {
      openById: () => book,
      getActiveSpreadsheet: () => book,
      getUi: () => ({ alert() {} }),
      flush() {},
      CopyPasteType: { PASTE_DATA_VALIDATION: "validation" },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          assert.equal(locked, false);
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
      newTrigger: (handler) => ({
        timeBased() {
          return this;
        },
        everyMinutes() {
          return this;
        },
        create() {
          triggers.push({ getHandlerFunction: () => handler });
        },
      }),
      deleteTrigger: (trigger) => triggers.splice(triggers.indexOf(trigger), 1),
    },
    Utilities: {
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
    context,
    tabs,
    store,
    meeting,
    config,
    events,
    triggers,
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
  assert.equal(JSON.stringify(response).includes("Dogwood"), false);
  request.seats[0].total = 206;
  request.seats[1].total = 204;
  assert.equal(h.post(request).status, 409);
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

test("signup claims history, limits suggestions to published players, and inserts before blank checkboxes", () => {
  const h = harness();
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
