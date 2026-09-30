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
    typeof value.code !== "string" ||
    !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value.code) ||
    value.code.length < 8 ||
    value.code.length > 64 ||
    typeof value.calendarId !== "string" ||
    !value.calendarId ||
    !Array.isArray(value.semesters) ||
    !value.semesters.length ||
    !Array.isArray(value.publishedPlayers)
  )
    fail(
      400,
      "Settings need a semester code, calendarId, semesters and publishedPlayers.",
    );
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

function calendarMeetings(now) {
  const config = settings();
  const calendar = CalendarApp.getCalendarById(config.calendarId);
  if (!calendar) fail(503, "The configured calendar is not accessible.");
  return calendar
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
  const events = calendarMeetings(now);
  if (events.length > 1)
    fail(503, "Calendar meetings overlap. An officer must correct them.");
  if (events.length === 1) {
    const event = events[0];
    const id = event.getId() + ":" + event.getStartTime().getTime();
    if (
      properties().getProperty("closedCalendarEvent") !== id &&
      meeting?.id !== id
    )
      meeting = startMeeting(
        id,
        event.getStartTime().getTime(),
        event.getEndTime().getTime(),
      );
  }
  return meeting;
}

function requireMeeting(request, checkin) {
  if (request.k !== settings().code)
    fail(401, "The semester code is incorrect.");
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
        if (
          !player ||
          !Number.isSafeInteger(total) ||
          total < 0 ||
          net !== total - 205
        )
          fail(503, "An officer must recheck Table " + block.number + ".");
        return { ...publicPlayer(player), total, net };
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
  return respond(() =>
    withLock(() => {
      const request = event.parameter || {};
      if (request.r === "meeting") {
        const meeting = updateMeeting();
        const state = meetingWindow(meeting, Date.now());
        const response = {
          status: 200,
          ...state,
          meetingId: meeting?.id || null,
          date: meeting?.date || null,
          semester: meeting?.semester || null,
        };
        if (state.open && request.k === settings().code)
          response.players = checkedPlayers(
            meeting,
            rosterLayout(sheet("Roster").getDataRange().getValues()),
          ).map(publicPlayer);
        return response;
      }
      if (request.r === "results")
        return results(requireMeeting(request, false));
      fail(404, "Unknown resource.");
    }),
  );
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
    if (!["checkins", "players", "results"].includes(request.r))
      fail(404, "Unknown resource.");
    return withLock(() => {
      const meeting = requireMeeting(request, request.r !== "results");
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
      code: "",
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
      const triggers = ScriptApp.getProjectTriggers().filter(
        (trigger) => trigger.getHandlerFunction() === "clubTick",
      );
      if (!triggers.length)
        ScriptApp.newTrigger("clubTick").timeBased().everyMinutes(1).create();
      triggers.slice(1).forEach((trigger) => ScriptApp.deleteTrigger(trigger));
      return "Set up complete for this account. The calendar timer runs every minute.";
    }),
  );
}

function clubTick() {
  withLock(updateMeeting);
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
      if (!meeting.id.startsWith("manual:"))
        properties().setProperty("closedCalendarEvent", meeting.id);
      else {
        const events = calendarMeetings(Date.now());
        if (events.length === 1)
          properties().setProperty(
            "closedCalendarEvent",
            events[0].getId() + ":" + events[0].getStartTime().getTime(),
          );
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
