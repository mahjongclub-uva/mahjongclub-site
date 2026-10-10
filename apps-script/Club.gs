function properties() {
  return PropertiesService.getScriptProperties();
}

function withLock(action) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000))
    fail(503, "Another write is finishing. Please retry.");
  try {
    return action();
  } finally {
    try {
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  }
}

function settings() {
  const raw = properties().getProperty("settings");
  if (!raw) fail(503, "An officer must run Club > Settings and Set up first.");
  return validateSettings(JSON.parse(raw));
}

function validateSettings(value) {
  if (
    !value ||
    typeof value.calendarId !== "string" ||
    !value.calendarId ||
    !Array.isArray(value.semesters) ||
    !value.semesters.length ||
    !Array.isArray(value.publishedPlayers)
  )
    fail(400, "Settings need calendarId, semesters and publishedPlayers.");
  for (const key of ["checkinMinutesBefore", "scoreMinutesAfter"]) {
    if (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > 1440)
      fail(400, "Meeting margins must be whole minutes from 0 to 1440.");
  }
  value.semesters.forEach((semester, index) => {
    if (
      !semester ||
      !/^[a-z0-9-]+$/.test(semester.id) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(semester.start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(semester.end) ||
      semester.start > semester.end ||
      typeof semester.attendanceTab !== "string" ||
      !semester.attendanceTab.trim() ||
      typeof semester.pointsTab !== "string" ||
      !semester.pointsTab.trim() ||
      [semester.start, semester.end].some(
        (date) =>
          !Number.isFinite(new Date(date + "T12:00:00Z").getTime()) ||
          new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date,
      )
    )
      fail(400, "Each semester needs an id, start/end dates and tab names.");
    if (
      value.semesters
        .slice(0, index)
        .some(
          (other) =>
            other.id === semester.id ||
            (other.start <= semester.end && semester.start <= other.end),
        )
    )
      fail(400, "Semester ids must be unique and dates must not overlap.");
  });
  if (
    value.publishedPlayers.some(
      (player) =>
        !player ||
        !/^p\d{3,}$/.test(player.id) ||
        typeof player.display !== "string" ||
        !player.display,
    )
  )
    fail(
      400,
      "publishedPlayers must contain only ids and short names from the published leaderboard.",
    );
  return value;
}

function workbook() {
  const id = properties().getProperty("spreadsheetId");
  if (!id) fail(503, "Run Club > Set up from the workbook first.");
  return SpreadsheetApp.openById(id);
}

function sheet(name) {
  const tab = workbook().getSheetByName(name);
  if (!tab) fail(503, "Missing workbook tab: " + name + ".");
  return tab;
}

function dateKey(value) {
  if (typeof value === "number")
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000)
      .toISOString()
      .slice(0, 10);
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    fail(503, "Expected a valid date in the workbook.");
  return Utilities.formatDate(
    value,
    workbook().getSpreadsheetTimeZone(),
    "yyyy-MM-dd",
  );
}

function readMeeting() {
  return JSON.parse(properties().getProperty("meeting") || "null");
}

function saveMeeting(meeting) {
  properties().setProperty("meeting", JSON.stringify(meeting));
}

function semesterFor(date) {
  const semester = settings().semesters.find(
    (item) => item.start <= date && date <= item.end,
  );
  if (!semester) fail(423, "This meeting is outside the configured semesters.");
  return semester;
}

function startMeeting(id, start, end) {
  const config = settings();
  const date = dateKey(new Date(start));
  const semester = semesterFor(date);
  // Refuse a bad workbook before opening the lobby.
  attendanceLayout(
    sheet(semester.attendanceTab).getDataRange().getValues(),
    date,
    dateKey,
  );
  pointsLayout(sheet(semester.pointsTab).getDataRange().getValues());
  rosterLayout(sheet("Roster").getDataRange().getValues());
  const meeting = {
    id,
    date,
    semester: semester.id,
    attendanceTab: semester.attendanceTab,
    pointsTab: semester.pointsTab,
    opens: start - config.checkinMinutesBefore * 60000,
    checkinsClose: end,
    closes: end + config.scoreMinutesAfter * 60000,
    closed: false,
  };
  saveMeeting(meeting);
  return meeting;
}

// Cached so a room full of phones costs one Calendar read per five minutes;
// a meeting can therefore open up to five minutes into its check-in window.
function calendarMeetings(now) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("calendar");
  if (cached) return JSON.parse(cached);
  const config = settings();
  const calendar = CalendarApp.getCalendarById(config.calendarId);
  if (!calendar) fail(503, "The configured calendar is not accessible.");
  const events = calendar
    .getEvents(
      new Date(now - (config.scoreMinutesAfter + 1440) * 60000),
      new Date(now + config.checkinMinutesBefore * 60000),
    )
    .filter(
      (event) =>
        !event.isAllDayEvent() &&
        now >=
          event.getStartTime().getTime() -
            config.checkinMinutesBefore * 60000 &&
        now < event.getEndTime().getTime() + config.scoreMinutesAfter * 60000,
    )
    .map((event) => ({
      id: event.getId() + ":" + event.getStartTime().getTime(),
      start: event.getStartTime().getTime(),
      end: event.getEndTime().getTime(),
    }));
  cache.put("calendar", JSON.stringify(events), 300);
  return events;
}

function updateMeeting() {
  const now = Date.now();
  let meeting = readMeeting();
  if (meeting && !meeting.closed && now >= meeting.closes) {
    meeting.closed = true;
    saveMeeting(meeting);
  }
  if (meeting && !meeting.closed) return meeting;
  if (meeting) settleRooms(meeting);
  const events = calendarMeetings(now);
  if (events.length > 1)
    fail(503, "Calendar meetings overlap. An officer must correct them.");
  if (events.length === 1) {
    const event = events[0];
    if (
      properties().getProperty("closedCalendarEvent") !== event.id &&
      meeting?.id !== event.id
    )
      meeting = startMeeting(event.id, event.start, event.end);
  }
  return meeting;
}

// Reads skip the lock while a meeting is open; only opening or closing takes it.
function currentMeeting() {
  const meeting = readMeeting();
  return meetingWindow(meeting, Date.now()).open
    ? meeting
    : withLock(updateMeeting);
}

function requireMeeting(checkin) {
  const meeting = updateMeeting();
  const state = meetingWindow(meeting, Date.now());
  if (!(checkin ? state.checkinsOpen : state.open))
    fail(423, checkin ? "Check-in is closed." : "The meeting is closed.");
  return meeting;
}

function attendance(meeting) {
  const tab = sheet(meeting.attendanceTab);
  const grid = tab.getDataRange().getValues();
  return { tab, grid, layout: attendanceLayout(grid, meeting.date, dateKey) };
}

function checkedPlayers(meeting, players) {
  const { grid, layout } = attendance(meeting);
  if (!layout.column) return [];
  return players.filter((player) => {
    const member = layout.members.find(
      (item) => normalize(item.name) === normalize(player.name),
    );
    return member && grid[member.row - 1][layout.column - 1] === true;
  });
}

function publicPlayer(player) {
  return {
    id: player.id,
    display: player.optOut ? "Player " + player.id : player.display,
  };
}

function markAttendance(meeting, player) {
  const { tab, layout } = attendance(meeting);
  let row = layout.members.find(
    (member) => normalize(member.name) === normalize(player.name),
  )?.row;
  const formula = !row && tab.getRange(layout.lastMember, 2).getFormulaR1C1();
  if (!row && !formula)
    fail(503, "Attendance template is missing its # Meets formula.");
  let column = layout.column;
  if (!column) {
    // Insert inside the existing date range so # Meets formulas expand with it.
    tab.insertColumnBefore(layout.lastColumn);
    column = layout.lastColumn;
    tab
      .getRange(
        layout.header + 1,
        layout.lastColumn + 1,
        tab.getMaxRows() - layout.header,
        1,
      )
      .copyTo(
        tab.getRange(layout.header + 1, column),
        SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,
        false,
      );
    tab
      .getRange(layout.header + 1, column, tab.getMaxRows() - layout.header, 1)
      .setValue(false);
    tab
      .getRange(layout.header, column)
      .setValue(
        Utilities.parseDate(
          meeting.date,
          workbook().getSpreadsheetTimeZone(),
          "yyyy-MM-dd",
        ),
      )
      .setNumberFormat("mmm d");
  }
  if (!row) {
    tab.insertRowAfter(layout.lastMember);
    row = layout.lastMember + 1;
    const source = tab.getRange(
      layout.lastMember,
      1,
      1,
      layout.column ? layout.lastColumn : layout.lastColumn + 1,
    );
    const target = tab.getRange(row, 1, 1, source.getNumColumns());
    source.copyTo(target);
    target.clearContent();
    tab
      .getRange(row, 2)
      .setFormulaR1C1(tab.getRange(layout.lastMember, 2).getFormulaR1C1());
    tab.getRange(row, 1).setValue(player.name);
  }
  tab.getRange(row, column).setValue(true);
  return { status: 200, player: publicPlayer(player), meetingId: meeting.id };
}

function checkIn(request, meeting) {
  const computingId = text(
    request.computingId,
    "computing ID",
    32,
  ).toLowerCase();
  if (!/^[a-z][a-z0-9]*$/.test(computingId))
    fail(400, "Use letters and digits for the computing ID.");
  const players = rosterLayout(sheet("Roster").getDataRange().getValues());
  const known = players.find((player) => player.computingId === computingId);
  if (known) return markAttendance(meeting, known);
  if (request.r === "checkins")
    return { status: 404, message: "Sign up with your full name to check in." };
  const name = text(request.fullName, "full name", 120);
  let player = players.find((item) => normalize(item.name) === normalize(name));
  if (player?.computingId)
    fail(409, "That name is already claimed. Ask an officer for help.");
  const published = settings().publishedPlayers;
  const suggestions = players.filter(
    (item) =>
      !item.computingId &&
      !item.optOut &&
      published.some((publicEntry) => publicEntry.id === item.id) &&
      closeNames(name, item.name),
  );
  if (!player && request.matchId) {
    player = suggestions.find((item) => item.id === request.matchId);
    if (!player)
      fail(409, "That suggestion is no longer available. Try again.");
  }
  if (!player && suggestions.length && request.createNew !== true) {
    return {
      status: 409,
      suggestions: suggestions.map((item) =>
        published.find((entry) => entry.id === item.id),
      ),
    };
  }
  const roster = sheet("Roster");
  const plannedAttendance = attendance(meeting);
  if (
    !plannedAttendance.layout.members.some(
      (member) =>
        normalize(member.name) === normalize(player ? player.name : name),
    ) &&
    !plannedAttendance.tab
      .getRange(plannedAttendance.layout.lastMember, 2)
      .getFormulaR1C1()
  )
    fail(503, "Attendance template is missing its # Meets formula.");
  if (!player) {
    const display = deriveDisplay(
      name,
      players.map((item) => item.display),
    );
    if (!display)
      fail(
        409,
        "That short name is taken. Ask an officer to set a nickname in Roster.",
      );
    const id =
      "p" +
      String(
        Math.max(0, ...players.map((item) => Number(item.id.slice(1)))) + 1,
      ).padStart(3, "0");
    const row = Math.max(1, ...players.map((item) => item.row)) + 1;
    player = { id, computingId, name, display, optOut: false, row };
    roster
      .getRange(row, 1, 1, 5)
      .setValues([[id, computingId, name, display, false]]);
    roster.getRange(row, 5).insertCheckboxes();
  } else {
    roster.getRange(player.row, 2).setValue(computingId);
  }
  return markAttendance(meeting, player);
}

function submitResult(request, meeting) {
  if (
    typeof request.submissionId !== "string" ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(request.submissionId)
  )
    fail(400, "A valid submission ID is required.");
  if (request.meetingId !== meeting.id)
    fail(409, "The meeting changed. Reload before submitting.");
  const players = rosterLayout(sheet("Roster").getDataRange().getValues());
  const seats = validateResult(
    request.seats,
    checkedPlayers(meeting, players).map((player) => player.id),
  );
  const tab = sheet(meeting.pointsTab);
  const blocks = pointsLayout(tab.getDataRange().getValues());
  const receipt = JSON.stringify({
    meetingId: meeting.id,
    submissionId: request.submissionId,
    seats,
  });
  const notes = blocks.map((block) => tab.getRange(block.row, 2).getNote());
  const existing = notes.findIndex((note) => {
    try {
      return JSON.parse(note).submissionId === request.submissionId;
    } catch {
      return false;
    }
  });
  let block;
  if (existing >= 0) {
    if (notes[existing] !== receipt)
      fail(409, "This submission ID was already used for a different result.");
    block = blocks[existing];
    if (!block.empty) {
      const expected = seats.map((seat) => [
        players.find((player) => player.id === seat.id).name,
        seat.total,
        seat.net,
      ]);
      if (
        JSON.stringify(block.seats) !== JSON.stringify(expected) ||
        dateKey(block.date) !== meeting.date
      )
        fail(
          409,
          "This result has been changed in the Sheet. Ask an officer to check it.",
        );
      return {
        status: 200,
        table: block.number,
        submissionId: request.submissionId,
      };
    }
  } else {
    block = blocks.find((item, index) => item.empty && !notes[index]);
  }
  if (!block)
    fail(
      503,
      "No empty Table N template is available. Ask an officer to add one.",
    );
  // Reserve the same block on retries, including a failure between the note and values write.
  tab.getRange(block.row, 2).setNote(receipt);
  const netFormulas = tab.getRange(block.row + 2, 4, 4, 1).getFormulas();
  tab
    .getRange(block.row + 1, 2, 5, 4)
    .setValues([
      [
        "Player",
        "Points",
        "Net",
        Utilities.parseDate(
          meeting.date,
          workbook().getSpreadsheetTimeZone(),
          "yyyy-MM-dd",
        ),
      ],
      ...seats.map((seat, index) => [
        players.find((player) => player.id === seat.id).name,
        seat.total,
        netFormulas[index][0] || seat.net,
        "",
      ]),
    ]);
  CacheService.getScriptCache().remove("results:" + meeting.id);
  return {
    status: 201,
    table: block.number,
    submissionId: request.submissionId,
  };
}

function results(meeting) {
  const cache = CacheService.getScriptCache();
  const key = "results:" + meeting.id;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const players = rosterLayout(sheet("Roster").getDataRange().getValues());
  const tables = pointsLayout(
    sheet(meeting.pointsTab).getDataRange().getValues(),
  )
    .filter(
      (block) =>
        !block.empty && block.date && dateKey(block.date) === meeting.date,
    )
    .map((block) => ({
      table: block.number,
      seats: block.seats.map(([name, total, net]) => {
        const player = players.find((item) => item.name === name);
        if (!player || !Number.isSafeInteger(total) || net !== total - 205)
          fail(503, "An officer must recheck Table " + block.number + ".");
        return { ...publicPlayer(player), optOut: player.optOut, total, net };
      }),
    }));
  tables.forEach((table) =>
    validateResult(
      table.seats,
      table.seats.map((seat) => seat.id),
    ),
  );
  const response = {
    status: 200,
    meetingId: meeting.id,
    date: meeting.date,
    tables,
  };
  cache.put(key, JSON.stringify(response), 30);
  return response;
}

// Table rooms. README.md, "How a table works", describes the whole lifecycle.
// A room is a physical table (its number never changes). The group seated
// there plays a table session: games ("hands" in code) accumulate in Script
// Properties, one key per table, until someone ends the table. Ending saves
// the four totals as one "Table N" block in Points Tracking through
// submitResult, releases all four players and starts the next session.
// ponytail: fixed table count; make it an officer setting if the club outgrows it.
// The site's /meeting/table/N pages are generated for the same 12.
const MAX_TABLES = 12;
// Keeps a room, with its ended summary, under the 9 KB Script Properties limit.
const MAX_HANDS = 60;
const WINDS = ["East", "South", "West", "North"];

// Keyed by meeting too, so a room that failed to save is never overwritten
// by next meeting's table of the same number.
function roomKey(room) {
  return "room:" + room.meetingId + ":" + room.table;
}

function readRooms(meetingId) {
  const all = properties().getProperties();
  return Object.keys(all)
    .filter((key) => key.startsWith("room:"))
    .map((key) => JSON.parse(all[key]))
    .filter((room) => room.meetingId === meetingId)
    .sort((a, b) => a.table - b.table);
}

// Empty rooms are kept: an ended session's summary must outlive its players.
function writeRoom(room) {
  room.seats.sort((a, b) => a.wind - b.wind);
  properties().setProperty(roomKey(room), JSON.stringify(room));
}

// Every win: the other three each pay `each`, so a game always sums to zero.
function roomTotals(room) {
  return room.seats.map((seat) => ({
    id: seat.id,
    total: room.hands.reduce(
      (total, hand) =>
        total + (hand.winner === seat.id ? 3 * hand.each : -hand.each),
      205,
    ),
  }));
}

// tableId is the workbook submission ID and stays private: anyone holding it
// could submit a different result under it and block the real save.
function publicRoom(room) {
  return {
    table: room.table,
    session: room.session,
    seats: room.seats,
    hands: room.hands,
    totals: roomTotals(room),
    ended: room.ended || null,
  };
}

// Ends the session: saves its totals when there were games, releases every
// seat, and starts a new session at the same physical table.
function endRoom(room, meeting, by) {
  let sheetTable = null;
  if (room.hands.length)
    sheetTable = submitResult(
      {
        submissionId: room.tableId,
        meetingId: meeting.id,
        seats: roomTotals(room),
      },
      meeting,
    ).table;
  room.ended = {
    session: room.session,
    lastHandId: room.hands[room.hands.length - 1]?.id || null,
    sheetTable,
    at: Date.now(),
    by,
    games: room.hands.length,
    totals: roomTotals(room).map((seat, i) => ({
      ...seat,
      display: room.seats[i].display,
      wind: room.seats[i].wind,
      optOut: room.seats[i].optOut,
    })),
  };
  room.seats = [];
  room.hands = [];
  room.tableId = Utilities.getUuid();
  room.session++;
  return sheetTable;
}

function settleRooms(meeting) {
  for (const room of readRooms(meeting.id)) {
    try {
      if (room.hands.length && room.seats.length === 4)
        endRoom(room, meeting, "Scoring closed");
      properties().deleteProperty(roomKey(room));
    } catch (error) {
      // ponytail: an unsaved room stays in Script Properties for an officer to copy by hand.
      console.error(
        "Table " +
          room.table +
          " could not be saved (" +
          error.message +
          "): " +
          JSON.stringify(
            roomTotals(room).map((seat, i) => [
              room.seats[i].display,
              seat.total,
            ]),
          ),
      );
    }
  }
}

// Rooms and tonight's saved tables in one read, so a phone never counts a
// game both in a room and in the table block it was just saved to.
function roomsState(meeting) {
  let tables = null;
  try {
    tables = results(meeting).tables;
  } catch {
    // The rooms still load; standings wait for an officer to fix the sheet.
  }
  return { rooms: readRooms(meeting.id).map(publicRoom), results: tables };
}

function roomAction(request, meeting) {
  if (request.meetingId !== meeting.id)
    fail(409, "The meeting changed. Reload the page.");
  const player = checkedPlayers(
    meeting,
    rosterLayout(sheet("Roster").getDataRange().getValues()),
  ).find((item) => item.id === request.playerId);
  if (!player) fail(409, "Check in before joining a table.");
  const rooms = readRooms(meeting.id);
  const mine = rooms.find((room) =>
    room.seats.some((seat) => seat.id === player.id),
  );
  const last = (room) => room.hands[room.hands.length - 1]?.id || null;
  // Two phones at one table must not record the same change twice.
  const expectSeen = (room) => {
    if ((request.lastHandId || null) !== last(room))
      fail(409, "Your table just changed. Check the latest scores.");
  };
  const reply = (saved) => ({ status: 200, saved, ...roomsState(meeting) });
  const action = request.action;
  if (action === "join") {
    const table = request.table;
    if (!Number.isSafeInteger(table) || table < 1 || table > MAX_TABLES)
      fail(400, "Choose a table from 1 to " + MAX_TABLES + ".");
    const target = rooms.find((room) => room.table === table) || {
      meetingId: meeting.id,
      table,
      tableId: Utilities.getUuid(),
      session: 1,
      seats: [],
      hands: [],
      ended: null,
    };
    const taken = (wind) => target.seats.find((seat) => seat.wind === wind);
    const wind =
      request.seat === undefined
        ? [0, 1, 2, 3].find((item) => !taken(item))
        : request.seat;
    if (mine && mine.table !== table)
      fail(
        409,
        "You're at Table " +
          mine.table +
          ". " +
          (mine.hands.length ? "End that table" : "Leave it") +
          " before joining another.",
      );
    if (mine) {
      // Changing seats at your own table is fine until a game is saved.
      const seat = mine.seats.find((item) => item.id === player.id);
      if (request.seat === undefined || seat.wind === wind) return reply(null);
      if (mine.hands.length)
        fail(409, "Seats are fixed once a game is saved at this table.");
      if (taken(wind)) fail(409, WINDS[wind] + " was just taken.");
      seat.wind = wind;
      writeRoom(mine);
      return reply(null);
    }
    if (wind === undefined || target.seats.length >= 4)
      fail(409, "Table " + table + " is full.");
    if (!Number.isSafeInteger(wind) || wind < 0 || wind > 3)
      fail(400, "Choose East, South, West or North.");
    if (taken(wind)) fail(409, WINDS[wind] + " was just taken.");
    target.seats.push({ ...publicPlayer(player), optOut: player.optOut, wind });
    writeRoom(target);
    return reply(null);
  }
  if (action === "leave") {
    if (!mine) return reply(null);
    if (mine.hands.length)
      fail(
        409,
        "Games are saved at this table. End the table to leave; it ends for all four players.",
      );
    mine.seats = mine.seats.filter((seat) => seat.id !== player.id);
    writeRoom(mine);
    return reply(null);
  }
  if (action === "end") {
    const room = rooms.find((item) => item.table === request.table);
    // A repeated End (a retry, or a second phone) after everyone was released.
    if (
      room?.ended &&
      room.ended.session === request.session &&
      room.ended.lastHandId === (request.lastHandId || null)
    )
      return reply(room.ended.sheetTable);
    if (!room || mine !== room) fail(409, "You're not seated at this table.");
    if (room.session !== request.session)
      fail(409, "Your table just changed. Check the latest scores.");
    expectSeen(room);
    const saved = endRoom(room, meeting, player.display);
    writeRoom(room);
    return reply(saved);
  }
  if (!mine) fail(409, "Join a table first.");
  if (action === "hand") {
    if (
      typeof request.handId !== "string" ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(request.handId)
    )
      fail(400, "A valid game ID is required.");
    if (mine.hands.some((hand) => hand.id === request.handId))
      return reply(null);
    expectSeen(mine);
    if (mine.seats.length !== 4)
      fail(409, "A game needs four players at the table.");
    if (!mine.seats.some((seat) => seat.id === request.winner))
      fail(400, "Choose the winner from this table.");
    if (
      !Number.isSafeInteger(request.each) ||
      request.each < 1 ||
      request.each > 9999
    )
      fail(400, "Enter what each player pays, as a whole number above 0.");
    if (mine.hands.length >= MAX_HANDS)
      fail(409, "End this table to keep recording games.");
    mine.hands.push({
      id: request.handId,
      winner: request.winner,
      each: request.each,
    });
    writeRoom(mine);
    return reply(null);
  }
  if (action === "undo") {
    expectSeen(mine);
    if (!mine.hands.length) fail(409, "There is no game to undo.");
    mine.hands.pop();
    writeRoom(mine);
    return reply(null);
  }
  fail(404, "Unknown table action.");
}

function respond(action) {
  let response;
  try {
    response = action();
  } catch (error) {
    response = {
      status: error.status || 503,
      message: error.status
        ? error.message
        : "The workbook is unavailable. Ask an officer to check the Apps Script execution log.",
    };
    if (!error.status) console.error(error.stack);
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet(event) {
  return respond(() => {
    const request = event.parameter || {};
    const meeting = currentMeeting();
    if (request.r === "meeting") {
      const state = meetingWindow(meeting, Date.now());
      const response = {
        status: 200,
        ...state,
        meetingId: meeting?.id || null,
        date: meeting?.date || null,
        semester: meeting?.semester || null,
      };
      if (state.open) {
        response.players = checkedPlayers(
          meeting,
          rosterLayout(sheet("Roster").getDataRange().getValues()),
        ).map(publicPlayer);
        response.rooms = readRooms(meeting.id).map(publicRoom);
      }
      return response;
    }
    // Reads only Script Properties, so phones at a table can refresh often.
    if (request.r === "rooms") {
      if (!meetingWindow(meeting, Date.now()).open)
        fail(423, "The meeting is closed.");
      return { status: 200, meetingId: meeting.id, ...roomsState(meeting) };
    }
    if (request.r === "results") {
      if (!meetingWindow(meeting, Date.now()).open)
        fail(423, "The meeting is closed.");
      return results(meeting);
    }
    fail(404, "Unknown resource.");
  });
}

function doPost(event) {
  return respond(() => {
    if (!event.postData || event.postData.contents.length > 4096)
      fail(400, "Invalid request body.");
    let request;
    try {
      request = JSON.parse(event.postData.contents);
    } catch {
      fail(400, "Send a JSON body as text/plain.");
    }
    if (!request || typeof request !== "object" || Array.isArray(request))
      fail(400, "Invalid request body.");
    if (!["checkins", "players", "results", "rooms"].includes(request.r))
      fail(404, "Unknown resource.");
    return withLock(() => {
      const scores = request.r === "results" || request.r === "rooms";
      const meeting = requireMeeting(!scores);
      if (request.r === "rooms") return roomAction(request, meeting);
      return request.r === "results"
        ? submitResult(request, meeting)
        : checkIn(request, meeting);
    });
  });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Club")
    .addItem("Settings", "clubSettings")
    .addItem("Set up", "clubSetup")
    .addSeparator()
    .addItem("Open now", "clubOpen")
    .addItem("Close now", "clubClose")
    .addItem("Check in selected member", "clubCheckIn")
    .addItem("Recheck", "clubRecheck")
    .addToUi();
}

function menuAction(action) {
  try {
    const message = action();
    if (message) SpreadsheetApp.getUi().alert(message);
  } catch (error) {
    SpreadsheetApp.getUi().alert(error.message);
  }
}

function clubSettings() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile("Settings")
      .setWidth(540)
      .setHeight(600),
    "Club settings",
  );
}

function clubReadSettings() {
  return (
    JSON.parse(properties().getProperty("settings") || "null") || {
      calendarId: "",
      checkinMinutesBefore: 30,
      scoreMinutesAfter: 60,
      semesters: [
        {
          id: "fall-2026",
          start: "2026-08-01",
          end: "2026-12-31",
          attendanceTab: "Fall Attendance",
          pointsTab: "Fall Points Tracking",
        },
      ],
      publishedPlayers: [],
    }
  );
}

function clubSaveSettings(value) {
  return withLock(() => {
    if (meetingWindow(readMeeting(), Date.now()).open)
      fail(409, "Close the meeting before changing settings.");
    // Published-name suggestions are installed by the maintainer, never inferred from private rows.
    value.publishedPlayers = clubReadSettings().publishedPlayers;
    properties().setProperty(
      "settings",
      JSON.stringify(validateSettings(value)),
    );
    return "Settings saved. Run Club > Set up next.";
  });
}

function clubSetup() {
  menuAction(() =>
    withLock(() => {
      const book = SpreadsheetApp.getActiveSpreadsheet();
      properties().setProperty("spreadsheetId", book.getId());
      const config = settings();
      if (!CalendarApp.getCalendarById(config.calendarId))
        fail(503, "Share the calendar with this account first.");
      rosterLayout(sheet("Roster").getDataRange().getValues());
      config.semesters.forEach((semester) => {
        attendanceLayout(
          sheet(semester.attendanceTab).getDataRange().getValues(),
          semester.start,
          dateKey,
        );
        pointsLayout(sheet(semester.pointsTab).getDataRange().getValues());
      });
      // Meetings open when someone visits, so remove the old every-minute timer.
      ScriptApp.getProjectTriggers()
        .filter((trigger) => trigger.getHandlerFunction() === "clubTick")
        .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
      return "Set up complete. Meetings open from the calendar when the first person visits.";
    }),
  );
}

function clubOpen() {
  menuAction(() =>
    withLock(() => {
      if (meetingWindow(updateMeeting(), Date.now()).open)
        return "A meeting is already open.";
      // A manual meeting lasts two hours; Close now is available at any time.
      startMeeting(
        "manual:" + Utilities.getUuid(),
        Date.now(),
        Date.now() + 120 * 60000,
      );
      return "Meeting opened. Check-in closes in two hours.";
    }),
  );
}

function clubClose() {
  menuAction(() =>
    withLock(() => {
      const meeting = readMeeting();
      if (!meeting) return "There is no meeting to close.";
      meeting.closed = true;
      saveMeeting(meeting);
      settleRooms(meeting);
      if (!meeting.id.startsWith("manual:"))
        properties().setProperty("closedCalendarEvent", meeting.id);
      else {
        const events = calendarMeetings(Date.now());
        if (events.length === 1)
          properties().setProperty("closedCalendarEvent", events[0].id);
      }
      return "Meeting closed. Automatic score publishing is added in build step 5.";
    }),
  );
}

function clubCheckIn() {
  menuAction(() =>
    withLock(() => {
      const meeting = updateMeeting();
      if (!meetingWindow(meeting, Date.now()).checkinsOpen)
        fail(423, "Check-in is closed.");
      const range = SpreadsheetApp.getActiveRange();
      const tab = range.getSheet();
      let player;
      const players = rosterLayout(sheet("Roster").getDataRange().getValues());
      if (tab.getName() === "Roster")
        player = players.find((item) => item.row === range.getRow());
      if (tab.getName() === meeting.attendanceTab)
        player = players.find(
          (item) =>
            normalize(item.name) ===
            normalize(tab.getRange(range.getRow(), 1).getValue()),
        );
      if (!player)
        fail(400, "Select a member row in Roster or Attendance first.");
      markAttendance(meeting, player);
      return "Checked in " + publicPlayer(player).display + ".";
    }),
  );
}

function clubRecheck() {
  menuAction(() =>
    withLock(() => {
      const players = rosterLayout(sheet("Roster").getDataRange().getValues());
      const errors = [];
      settings().semesters.forEach((semester) => {
        const tab = sheet(semester.pointsTab);
        const grid = tab.getDataRange().getValues();
        const blocks = pointsLayout(grid);
        blocks.forEach((block) => {
          let message = "";
          if (!block.empty) {
            try {
              const date = dateKey(block.date);
              const checked = checkedPlayers(
                { date, attendanceTab: semester.attendanceTab },
                players,
              ).map((player) => player.id);
              const seats = block.seats.map(([name, total, net]) => {
                const player = players.find((item) => item.name === name);
                if (!player || net !== total - 205)
                  fail(400, "Unknown player or incorrect Net.");
                return { id: player.id, total };
              });
              validateResult(seats, checked);
            } catch (error) {
              message = error.status
                ? error.message
                : "Invalid date or table cells.";
            }
          }
          tab
            .getRange(block.row + 1, 2, 5, 3)
            .setBackground(message ? "#fce8e6" : null);
          if (message)
            errors.push(
              semester.id + " Table " + block.number + ": " + message,
            );
        });
      });
      const meeting = readMeeting();
      if (meeting)
        CacheService.getScriptCache().remove("results:" + meeting.id);
      return errors.length
        ? errors.join("\n")
        : "All filled tables passed validation.";
    }),
  );
}
