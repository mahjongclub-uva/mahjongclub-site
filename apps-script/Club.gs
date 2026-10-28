function properties() {
  return PropertiesService.getScriptProperties();
}

// Saved tables change only under the lock. A save makes this count odd
// before it touches the sheet, and the lock makes it even again once the
// rooms are written too, so a reader that sees the same even count before
// and after its reads saw one consistent night: never a table both saved and
// still playing, nor neither.
let saving = false;
const saves = () => Number(properties().getProperty("saves") || 0);
// Always moves to a new odd count, and the lock to the next even one, so a
// count left odd by an execution killed mid-save heals at the next save.
function startSave() {
  if (saving) return;
  saving = true;
  const count = saves();
  properties().setProperty("saves", String(count + (count % 2 ? 2 : 1)));
}

function withLock(action) {
  const lock = LockService.getScriptLock();
  const waiting = Date.now();
  const locked = lock.tryLock(10000);
  if (timing) timing.lockMs = Date.now() - waiting;
  if (!locked) fail(503, "Busy for a moment. Try again.");
  try {
    return action();
  } finally {
    try {
      SpreadsheetApp.flush();
      if (saving) properties().setProperty("saves", String(saves() + 1));
    } finally {
      saving = false;
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
    !value.semesters.length
  )
    fail(400, "Settings need calendarId and semesters.");
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
        // toJSON() is null for an impossible date such as 2026-02-30.
        (date) => new Date(date + "T12:00:00Z").toJSON()?.slice(0, 10) !== date,
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
  return value;
}

function workbook() {
  if (timing?.book) return timing.book;
  const id = properties().getProperty("spreadsheetId");
  if (!id) fail(503, "Run Club > Set up from the workbook first.");
  const book = SpreadsheetApp.openById(id);
  if (timing) timing.book = book;
  return book;
}

function sheet(name) {
  const tab = workbook().getSheetByName(name);
  if (!tab) fail(503, "Missing workbook tab: " + name + ".");
  return tab;
}

function workbookTimeZone() {
  if (timing?.zone) return timing.zone;
  const zone = workbook().getSpreadsheetTimeZone();
  if (timing) timing.zone = zone;
  return zone;
}

function dateKey(value) {
  if (typeof value === "number")
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000)
      .toISOString()
      .slice(0, 10);
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    fail(503, "Expected a valid date in the workbook.");
  return Utilities.formatDate(value, workbookTimeZone(), "yyyy-MM-dd");
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

// Cache upcoming events, not whether they are open yet. Recheck their windows
// on every request so a visit just before opening cannot delay check-in.
function calendarMeetings(now) {
  const cache = CacheService.getScriptCache();
  const config = settings();
  const key = "calendar:v2:" + config.calendarId;
  const cached = cache.get(key);
  let events;
  if (cached) events = JSON.parse(cached);
  else {
    const calendar = CalendarApp.getCalendarById(config.calendarId);
    if (!calendar) fail(503, "The configured calendar is not accessible.");
    events = calendar
      .getEvents(
        new Date(now - (config.scoreMinutesAfter + 1440) * 60000),
        new Date(now + (config.checkinMinutesBefore + 5) * 60000),
      )
      .filter((event) => !event.isAllDayEvent())
      .map((event) => ({
        id: event.getId() + ":" + event.getStartTime().getTime(),
        start: event.getStartTime().getTime(),
        end: event.getEndTime().getTime(),
      }));
    cache.put(key, JSON.stringify(events), 300);
  }
  return events.filter(
    (event) =>
      now >= event.start - config.checkinMinutesBefore * 60000 &&
      now < event.end + config.scoreMinutesAfter * 60000,
  );
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
  if (events.length > 1) fail(503, "Two meetings overlap. Ask an officer.");
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

// Reads skip the lock unless the meeting has to open, close or save its
// tables; updateMeeting decides again under the lock.
function currentMeeting() {
  const now = Date.now();
  const meeting = readMeeting();
  if (meetingWindow(meeting, now).open) return meeting;
  const closing = meeting && !meeting.closed && now >= meeting.closes;
  const unsettled = meeting?.closed && readRooms(meeting.id).length > 0;
  const events = calendarMeetings(now);
  const opening =
    events.length > 1 ||
    (events.length === 1 &&
      properties().getProperty("closedCalendarEvent") !== events[0].id &&
      meeting?.id !== events[0].id);
  return closing || unsettled || opening ? withLock(updateMeeting) : meeting;
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

function checkedPlayers(meeting, players, state = attendance(meeting)) {
  const { grid, layout } = state;
  if (!layout.column) return [];
  return players.filter((player) => {
    const member = layout.members.find(
      (item) => normalize(item.name) === normalize(player.name),
    );
    return member && grid[member.row - 1][layout.column - 1] === true;
  });
}

// Who is checked in tonight, kept in Script Properties so reads and table
// actions skip the Roster and Attendance tabs. Stored only under the lock, so
// a slow read can never overwrite a newer check-in; a read without the lock
// that finds nothing goes to the sheets rather than queueing. Officer edits to
// either tab clear it (onEdit).
function hereTonight(meeting, locked) {
  const stored = storedHere(meeting);
  if (stored) return stored;
  if (locked)
    return storeHere(
      meeting,
      hereFrom(checkedPlayers(meeting, rosterPlayers())),
    );
  // A read stores the list only if the lock is free this instant.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0))
    return hereFrom(checkedPlayers(meeting, rosterPlayers()));
  try {
    return hereTonight(meeting, true);
  } finally {
    lock.releaseLock();
  }
}

function hereFrom(players) {
  return players.map(({ id, display, optOut }) => ({ id, display, optOut }));
}

// Under the lock. A list built from a Roster read before the lock can miss
// someone who signed up meanwhile, so a miss rebuilds it from the sheets once.
function hereIncluding(meeting, ids) {
  const fresh = !storedHere(meeting);
  const players = hereTonight(meeting, true);
  // A list just read from the sheets is already current, and a malformed ID
  // can never match, so neither is worth a second read.
  if (
    fresh ||
    ids.some((id) => !/^p\d{3,}$/.test(id)) ||
    ids.every((id) => players.some((player) => player.id === id))
  )
    return players;
  properties().deleteProperty("here");
  return hereTonight(meeting, true);
}

function storedHere(meeting) {
  const here = JSON.parse(properties().getProperty("here") || "null");
  return here && here.meetingId === meeting?.id ? here.players : null;
}

function storeHere(meeting, players) {
  const value = JSON.stringify({ meetingId: meeting.id, players });
  // ponytail: one property holds about 150 players; past that, every request
  // reads the sheets again.
  if (value.length < 9000) properties().setProperty("here", value);
  else properties().deleteProperty("here");
  return players;
}

// Under the lock only. Without a stored list, builds it from the attendance
// grid and Roster this check-in already read, rather than reading them again.
function addHere(meeting, player, roster, state) {
  const stored = storedHere(meeting);
  const players = stored || hereFrom(checkedPlayers(meeting, roster, state));
  const has = players.some((item) => item.id === player.id);
  if (!stored || !has)
    storeHere(meeting, has ? players : [...players, ...hereFrom([player])]);
}

function publicPlayer(player) {
  return {
    id: player.id,
    display: player.optOut ? "Player " + player.id : player.display,
  };
}

// `roster` is the Roster this request read, used to store tonight's list.
function markAttendance(meeting, player, roster, state = attendance(meeting)) {
  const { tab, grid, layout } = state;
  let row = layout.members.find(
    (member) => normalize(member.name) === normalize(player.name),
  )?.row;
  const formula = !row && tab.getRange(layout.lastMember, 2).getFormulaR1C1();
  if (!row && !formula)
    fail(503, "Attendance template is missing its # Meets formula.");
  let column = layout.column;
  if (row && column && grid[row - 1][column - 1] === true) {
    // Also repairs the list when an officer ticked this player by hand.
    addHere(meeting, player, roster, state);
    return { status: 200, player: publicPlayer(player), meetingId: meeting.id };
  }
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
        Utilities.parseDate(meeting.date, workbookTimeZone(), "yyyy-MM-dd"),
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
  addHere(meeting, player, roster, state);
  return { status: 200, player: publicPlayer(player), meetingId: meeting.id };
}

function checkinId(request) {
  const computingId = text(
    request.computingId,
    "computing ID",
    32,
  ).toLowerCase();
  if (!/^[a-z][a-z0-9]*$/.test(computingId))
    fail(400, "Use only letters and numbers.");
  return computingId;
}

function checkinIdsKey() {
  return "checkin-ids:" + properties().getProperty("spreadsheetId");
}

function forgetCheckinIds() {
  try {
    CacheService.getScriptCache().remove(checkinIdsKey());
  } catch {
    // This hint is optional; a failed cache service cannot block a save.
  }
}

function rosterPlayers() {
  const players = rosterLayout(sheet("Roster").getDataRange().getValues());
  // A private, short-lived hint for revealing the newcomer field. Never use
  // it to identify a player or authorize a write; those reread the roster.
  // A missed roster-edit notification can show a returning player the name
  // field for up to 30 seconds; submitting still finds their existing entry.
  try {
    const value = JSON.stringify({
      expires: Date.now() + 30000,
      ids: players.map((player) => player.computingId).filter(Boolean),
    });
    if (value.length < 90000)
      CacheService.getScriptCache().put(checkinIdsKey(), value, 30);
    else forgetCheckinIds();
  } catch {
    // Cache eviction or failure must not prevent check-in.
  }
  return players;
}

function unknownCheckinId(computingId) {
  try {
    const hint = JSON.parse(
      CacheService.getScriptCache().get(checkinIdsKey()) || "null",
    );
    return (
      hint?.expires > Date.now() &&
      Array.isArray(hint.ids) &&
      !hint.ids.includes(computingId)
    );
  } catch {
    return false;
  }
}

const SIGN_UP = {
  status: 404,
  message: "Sign up with your full name to check in.",
};

function onEdit(event) {
  const name = event?.range?.getSheet().getName();
  const meeting = readMeeting();
  if (name === "Roster") forgetCheckinIds();
  if (name === "Roster" || name === meeting?.attendanceTab)
    properties().deleteProperty("here");
  // An officer's fix in Points Tracking shows at once, not after the cache.
  if (meeting && (name === "Roster" || name === meeting.pointsTab))
    CacheService.getScriptCache().remove("results:" + meeting.id);
}

// A Points tab an officer is mid-edit on must not block sign-ups, so a read
// that fails suggests nobody.
function scoredNames() {
  try {
    return [...new Set(settings().semesters.map((item) => item.pointsTab))]
      .flatMap((tab) => pointsLayout(sheet(tab).getDataRange().getValues()))
      .flatMap((block) => block.seats.map(([seat]) => normalize(String(seat))))
      .filter(Boolean);
  } catch (error) {
    console.error("Points Tracking could not be read: " + error.message);
    return [];
  }
}

// `listed` is the Roster if it was read before the lock. A known player's row
// never moves, so it is safe to use; signing up rereads it, since it adds rows.
function checkIn(request, meeting, listed) {
  const computingId = checkinId(request);
  let players = listed || rosterPlayers();
  const known = players.find((player) => player.computingId === computingId);
  if (known) return markAttendance(meeting, known, players);
  if (request.r === "checkins") return SIGN_UP;
  if (listed) players = rosterPlayers();
  const name = text(request.fullName, "full name", 120);
  let player = players.find((item) => normalize(item.name) === normalize(name));
  if (player?.computingId) fail(409, "That name is taken. Ask an officer.");
  // Only published names are suggested: anyone in Points Tracking, since
  // playing a scored game is what publishes a player.
  const close = players.filter(
    (item) => !item.computingId && !item.optOut && closeNames(name, item.name),
  );
  const scored = close.length ? scoredNames() : [];
  const suggestions = close.filter((item) =>
    scored.includes(normalize(item.name)),
  );
  if (!player && request.matchId) {
    player = suggestions.find((item) => item.id === request.matchId);
    if (!player) fail(409, "That name was just claimed. Try again.");
  }
  if (!player && suggestions.length && request.createNew !== true) {
    return {
      status: 409,
      suggestions: suggestions.map(publicPlayer),
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
    if (!display) fail(409, "Your name is taken. Ask an officer.");
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
  forgetCheckinIds();
  return markAttendance(meeting, player, players, plannedAttendance);
}

// `games` comes only from a table ending, never from the request.
function submitResult(request, meeting, games) {
  if (
    typeof request.submissionId !== "string" ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(request.submissionId)
  )
    fail(400, "A valid submission ID is required.");
  if (request.meetingId !== meeting.id)
    fail(409, "The meeting changed. Reload the page.");
  const players = rosterLayout(sheet("Roster").getDataRange().getValues());
  const seats = validateResult(
    request.seats,
    hereIncluding(
      meeting,
      Array.isArray(request.seats) ? request.seats.map((seat) => seat?.id) : [],
    ).map((player) => player.id),
  );
  const tab = sheet(meeting.pointsTab);
  const blocks = pointsLayout(tab.getDataRange().getValues());
  const receipt = JSON.stringify({
    meetingId: meeting.id,
    submissionId: request.submissionId,
    seats,
  });
  // One read for every block's receipt note, not one call per block.
  const column = tab.getRange(1, 2, tab.getMaxRows(), 1).getNotes();
  const notes = blocks.map((block) => column[block.row - 1][0]);
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
      fail(409, "This save was used for different totals. Ask an officer.");
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
        fail(409, "This table was edited in the Sheet. Ask an officer.");
      return {
        status: 200,
        table: block.number,
        submissionId: request.submissionId,
      };
    }
  } else {
    block = blocks.find((item, index) => item.empty && !notes[index]);
  }
  if (!block) fail(503, "Add a Table N block in Points Tracking.");
  startSave();
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
        Utilities.parseDate(meeting.date, workbookTimeZone(), "yyyy-MM-dd"),
      ],
      ...seats.map((seat, index) => [
        players.find((player) => player.id === seat.id).name,
        seat.total,
        netFormulas[index][0] || seat.net,
        "",
      ]),
    ]);
  // The game count beside "Table N", after the scores so it can never block
  // them; a missing one only leaves that table's games uncounted. Cleared
  // when there is none, so a template copied from a filled block cannot
  // publish a stale count.
  try {
    tab
      .getRange(block.row, 6)
      .setValue(games || "")
      .setNumberFormat('[=1]0 "game";0 "games"');
  } catch (error) {
    console.error("Table " + block.number + "'s game count: " + error.message);
  }
  CacheService.getScriptCache().remove("results:" + meeting.id);
  return {
    status: 201,
    table: block.number,
    submissionId: request.submissionId,
  };
}

// Cached with the save count it was read at, so a rebuild that read the
// sheets just before a save can never stand in for the night after it.
function results(meeting, at = saves()) {
  const cache = CacheService.getScriptCache();
  const key = "results:" + meeting.id;
  const cached = JSON.parse(cache.get(key) || "null");
  if (cached?.saves === at) return cached.response;
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
  if (at % 2 === 0) cache.put(key, JSON.stringify({ saves: at, response }), 30);
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

// `all` lets a reply that also needs tiles read the store once.
function readRooms(meetingId, all = properties().getProperties()) {
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
// seat, and starts a new session at the same physical table. A swap then
// puts back the players who stay.
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
      room.hands.length,
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

// Returns a line for each table it could not save. Those stay in Script
// Properties, so the next request, Close or Recheck tries or lists them again.
function settleRooms(meeting) {
  const unsaved = [];
  for (const room of readRooms(meeting.id)) {
    try {
      if (room.hands.length) {
        if (room.seats.length !== 4)
          fail(409, "Not all four seats are filled.");
        endRoom(room, meeting, "Scoring closed");
      }
      properties().deleteProperty(roomKey(room));
    } catch (error) {
      const line = unsavedLine(room, error.message);
      console.error(line);
      unsaved.push(line);
    }
  }
  return unsaved;
}

// The totals go in the line as a record of what is waiting to save.
function unsavedLine(room, reason) {
  const totals = roomTotals(room).map(
    (seat, i) => room.seats[i].display + " " + seat.total,
  );
  return (
    "Table " +
    room.table +
    " wasn’t saved: " +
    reason +
    " Totals: " +
    totals.join(", ") +
    "."
  );
}

// Calendar meeting ids end in their start time; manual ones carry no date.
function meetingLabel(meetingId) {
  const start = Number(meetingId.split(":").pop());
  return meetingId.startsWith("manual:") || !Number.isFinite(start)
    ? "still waiting to save."
    : "from " + dateKey(new Date(start)) + ", still waiting to save.";
}

// The rooms, and with `withResults` tonight's saved tables, for Tonight's
// standings; tables only need the rooms, so their requests skip the sheets.
// Reads take no lock: a read that overlapped a save waits it out and reads
// again (see `saves`).
function roomsState(meeting, withResults) {
  if (!withResults) {
    const all = properties().getProperties();
    const rooms = readRooms(meeting.id, all).map(publicRoom);
    return { rooms, tiles: seatedTiles(meeting, rooms, null, all) };
  }
  for (let attempt = 1; ; attempt++) {
    const at = saves();
    // ponytail: gives up after about a second and shows what it read; a save
    // that slow means the sheet itself is struggling.
    if (at % 2 && attempt < 5) {
      Utilities.sleep(250);
      continue;
    }
    let tables = null;
    try {
      tables = results(meeting, at).tables;
    } catch (error) {
      // The rooms still load; standings wait for an officer to fix the sheet.
      // Logged, since the site only learns that the saved tables are missing.
      console.error(
        "Tonight's saved tables could not be read: " + error.message,
      );
    }
    const all = properties().getProperties();
    const rooms = readRooms(meeting.id, all).map(publicRoom);
    if (saves() === at || attempt >= 5)
      return {
        rooms,
        results: tables,
        tiles: seatedTiles(meeting, rooms, tables, all),
      };
  }
}

// The tiles a player can make, matching src/lib/avatar.ts (its test compares them).
const TILE_PARTS = {
  face: [
    "paw",
    "star",
    "heart",
    "moon",
    "sun",
    "flower",
    "clover",
    "cherry",
    "crown",
    "cloud",
    "apple",
    "coin",
    "sprout",
    "zhong",
    "fa",
  ],
  back: ["coral", "sky", "butter", "lilac", "mint", "midnight"],
};

// A tile a player made for tonight: one property each, "meetingId code", so a
// save needs no lock and the store never holds more tiles than the Roster has
// players. Only players checked in tonight can save one.
function saveTile(request) {
  const meeting = readMeeting();
  if (!meetingWindow(meeting, Date.now()).open)
    fail(423, "The meeting is closed.");
  const parts = typeof request.tile === "string" ? request.tile.split(".") : [];
  if (
    parts.length !== 2 ||
    !["face", "back"].every((part, i) => TILE_PARTS[part].includes(parts[i]))
  )
    fail(400, "Unknown tile.");
  if (!hereTonight(meeting).some((player) => player.id === request.playerId))
    fail(403, "Check in first.");
  properties().setProperty(
    "tile:" + request.playerId,
    meeting.id + " " + request.tile,
  );
  return { status: 200 };
}

// Both room paths return these, or tiles vanish from the table pages; saved
// tables count too, or Tonight's standings lose a tile once its table saves.
function seatedTiles(meeting, rooms, tables, all) {
  return tonightTiles(
    meeting,
    [...rooms, ...(tables || [])].flatMap((room) =>
      room.seats.map((seat) => seat.id),
    ),
    all,
  );
}

function tonightTiles(meeting, ids, all = properties().getProperties()) {
  const tiles = {};
  for (const id of ids) {
    const [meetingId, code] = (all["tile:" + id] || "").split(" ");
    if (meetingId === meeting.id) tiles[id] = code;
  }
  return tiles;
}

function roomAction(request, meeting) {
  if (request.meetingId !== meeting.id)
    fail(409, "The meeting changed. Reload the page.");
  const player = hereIncluding(meeting, [request.playerId]).find(
    (item) => item.id === request.playerId,
  );
  if (!player) fail(409, "Check in first.");
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
  // doPost adds the rooms after releasing the lock.
  const reply = (saved) => ({ status: 200, saved });
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
    // Checked before any branch: one stored bad wind would break every
    // phone's rooms read, since the site validates seats strictly.
    if (
      request.seat !== undefined &&
      (!Number.isSafeInteger(request.seat) ||
        request.seat < 0 ||
        request.seat > 3)
    )
      fail(400, "Choose East, South, West or North.");
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
      if (mine.hands.length) fail(409, "Seats are fixed once a game is saved.");
      if (taken(wind)) fail(409, WINDS[wind] + " was just taken.");
      seat.wind = wind;
      writeRoom(mine);
      return reply(null);
    }
    if (wind === undefined || target.seats.length >= 4)
      fail(409, "Table " + table + " is full.");
    if (taken(wind)) fail(409, WINDS[wind] + " was just taken.");
    target.seats.push({ ...publicPlayer(player), optOut: player.optOut, wind });
    writeRoom(target);
    return reply(null);
  }
  if (action === "leave") {
    if (!mine) return reply(null);
    if (mine.hands.length)
      fail(409, "Games are saved here. End the table to leave.");
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
    // A swap: the players who stay keep their seats for the next round.
    const keep = request.keep === undefined ? [] : request.keep;
    if (
      !Array.isArray(keep) ||
      keep.some((id) => !room.seats.some((seat) => seat.id === id))
    )
      fail(400, "Choose who stays from the players at this table.");
    const staying = room.seats.filter((seat) => keep.includes(seat.id));
    // Before any game there is no round to save: only the seats change, so
    // the last round's receipt stays up for the players who are still here.
    if (request.keep !== undefined && !room.hands.length) {
      room.seats = staying;
      writeRoom(room);
      return reply(null);
    }
    const saved = endRoom(room, meeting, player.display);
    room.seats = staying;
    writeRoom(room);
    return reply(saved);
  }
  if (!mine) fail(409, "Join a table first.");
  if (
    (action === "hand" || action === "undo") &&
    (request.table !== mine.table || request.session !== mine.session)
  )
    fail(409, "Your table just changed. Reload first.");
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

// One line per request in the Apps Script Executions log: which kind of
// request, its status, how long it took and how long it waited for the
// lock. It never includes names, computing IDs or scores; it is how a
// meeting's real response times are measured.
let timing = null;
function label(request) {
  const word = (value) =>
    typeof value === "string" ? value.replace(/[^a-z]/gi, "").slice(0, 12) : "";
  return [word(request.r), word(request.action)].filter(Boolean).join(" ");
}

function respond(action) {
  timing = { request: "", lockMs: 0 };
  const started = Date.now();
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
  console.log(
    JSON.stringify({
      request: timing.request,
      status: response.status,
      ms: Date.now() - started,
      lockMs: timing.lockMs,
    }),
  );
  timing = null;
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet(event) {
  return respond(() => {
    const request = event.parameter || {};
    timing.request = "GET " + label(request);
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
        response.players = hereTonight(meeting).map(publicPlayer);
        const all = properties().getProperties();
        response.rooms = readRooms(meeting.id, all).map(publicRoom);
        response.tiles = tonightTiles(
          meeting,
          response.players.map((player) => player.id),
          all,
        );
      }
      return response;
    }
    if (request.r !== "rooms" && request.r !== "results")
      fail(404, "Unknown resource.");
    if (!meetingWindow(meeting, Date.now()).open)
      fail(423, "The meeting is closed.");
    // Table phones refresh from Script Properties alone; Tonight's standings
    // add the 30-second results cache, so neither reads the sheets each time.
    return request.r === "rooms"
      ? {
          status: 200,
          meetingId: meeting.id,
          // Tables send results=0; anything else, including a site from
          // before that, still gets tonight's saved tables.
          ...roomsState(meeting, request.results !== "0"),
        }
      : results(meeting);
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
    timing.request = "POST " + label(request);
    if (
      !["checkins", "players", "results", "rooms", "tile"].includes(request.r)
    )
      fail(404, "Unknown resource.");
    if (request.r === "tile") return saveTile(request);
    // Check-ins read the Roster before queueing for the lock, and settle
    // unknown IDs and repeat check-ins without queueing at all.
    let roster;
    if (request.r === "checkins") {
      const computingId = checkinId(request);
      const open = readMeeting();
      if (meetingWindow(open, Date.now()).checkinsOpen) {
        if (unknownCheckinId(computingId)) return SIGN_UP;
        roster = rosterPlayers();
        const known = roster.find((item) => item.computingId === computingId);
        if (!known) return SIGN_UP;
        if (storedHere(open)?.some((item) => item.id === known.id))
          return {
            status: 200,
            player: publicPlayer(known),
            meetingId: open.id,
          };
      }
    }
    const reply = withLock(() => {
      const scores = request.r === "results" || request.r === "rooms";
      const meeting = requireMeeting(!scores);
      if (request.r === "rooms") return roomAction(request, meeting);
      return request.r === "results"
        ? submitResult(request, meeting)
        : checkIn(request, meeting, roster);
    });
    // Read after the lock, so the next table is not kept waiting.
    return request.r === "rooms"
      ? { ...reply, ...roomsState(readMeeting()) }
      : reply;
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
    .addItem("End a table…", "clubEndTable")
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

// Officer recovery. Seats live in Script Properties, so editing cells cannot
// free them; this ends a table exactly as a player's End table would,
// saving any games first.
function clubEndTable() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt(
    "End a table",
    "Which table (1 to " + MAX_TABLES + ")? Its games are saved first.",
    ui.ButtonSet.OK_CANCEL,
  );
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const table = Number(answer.getResponseText().trim());
  menuAction(() =>
    withLock(() => {
      const meeting = readMeeting();
      const room =
        meeting && readRooms(meeting.id).find((item) => item.table === table);
      if (!room || !room.seats.length)
        return "Nobody is seated at Table " + table + ".";
      const games = room.hands.length;
      const saved = endRoom(room, meeting, "An officer");
      writeRoom(room);
      return saved
        ? "Table " +
            table +
            " ended. " +
            games +
            " games were saved as Table " +
            saved +
            " in Points Tracking."
        : "Table " + table + " ended. It had no games, so nothing was saved.";
    }),
  );
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
    }
  );
}

function clubSaveSettings(value) {
  return withLock(() => {
    if (meetingWindow(readMeeting(), Date.now()).open)
      fail(409, "Close the meeting before changing settings.");
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
      const unsaved = settleRooms(meeting);
      if (!meeting.id.startsWith("manual:"))
        properties().setProperty("closedCalendarEvent", meeting.id);
      else {
        const events = calendarMeetings(Date.now());
        if (events.length === 1)
          properties().setProperty("closedCalendarEvent", events[0].id);
      }
      return unsaved.length
        ? "Meeting closed, but:\n" +
            unsaved.join("\n") +
            "\nFix the cause and run Close again. Don’t type these in: it keeps trying, and would save them twice."
        : "Meeting closed. Saved tables publish with the next score update.";
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
      markAttendance(meeting, player, players);
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
        // Read once per semester; each block only picks its date's column.
        const ticks = sheet(semester.attendanceTab).getDataRange().getValues();
        // Colours go in two writes per tab, not one per table.
        const marks = { red: [], clear: [] };
        blocks.forEach((block) => {
          let message = "";
          if (!block.empty) {
            try {
              const date = dateKey(block.date);
              const checked = checkedPlayers({ date }, players, {
                grid: ticks,
                layout: attendanceLayout(ticks, date, dateKey),
              }).map((player) => player.id);
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
          marks[message ? "red" : "clear"].push(
            "B" + (block.row + 1) + ":D" + (block.row + 5),
          );
          if (message)
            errors.push(
              semester.id + " Table " + block.number + ": " + message,
            );
        });
        if (marks.red.length)
          tab.getRangeList(marks.red).setBackground("#fce8e6");
        if (marks.clear.length)
          tab.getRangeList(marks.clear).setBackground(null);
      });
      const meeting = readMeeting();
      if (meeting)
        CacheService.getScriptCache().remove("results:" + meeting.id);
      // Games no open meeting will save: a failed close, or an older meeting.
      const all = properties().getProperties();
      for (const key of Object.keys(all).filter((item) =>
        item.startsWith("room:"),
      )) {
        const room = JSON.parse(all[key]);
        if (
          room.hands.length &&
          (room.meetingId !== meeting?.id || meeting.closed)
        )
          errors.push(unsavedLine(room, meetingLabel(room.meetingId)));
      }
      return errors.length
        ? errors.join("\n")
        : "All filled tables passed validation.";
    }),
  );
}
