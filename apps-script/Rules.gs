function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function normalize(value) {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function text(value, label, maximum) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maximum ||
    /^[=+@-]/.test(value.trim()) ||
    /[\x00-\x1f]/.test(value)
  ) {
    fail(400, "Enter a valid " + label + ".");
  }
  return value.trim().replace(/\s+/g, " ");
}

function deriveDisplay(name, taken) {
  const parts = name.split(/\s+/);
  if (parts.length === 1) return taken.includes(parts[0]) ? null : parts[0];
  const surname = parts[parts.length - 1];
  for (let length = 1; length <= surname.length; length++) {
    const candidate = parts[0] + " " + surname.slice(0, length) + ".";
    if (!taken.includes(candidate)) return candidate;
  }
  return null;
}

function closeNames(a, b) {
  const left = normalize(a).split(" ");
  const right = normalize(b).split(" ");
  return (
    left.length > 1 &&
    right.length > 1 &&
    left[left.length - 1] === right[right.length - 1] &&
    (left[0].startsWith(right[0]) || right[0].startsWith(left[0]))
  );
}

function validateResult(seats, checkedIn) {
  if (
    !Array.isArray(seats) ||
    seats.length !== 4 ||
    seats.some((seat) => !seat || typeof seat.id !== "string") ||
    new Set(seats.map((seat) => seat.id)).size !== 4
  ) {
    fail(400, "Choose four different players.");
  }
  if (seats.some((seat) => !checkedIn.includes(seat.id)))
    fail(400, "Every player must check in tonight.");
  if (
    seats.some(
      (seat) =>
        !Number.isSafeInteger(seat.total) || seat.total < 0 || seat.total > 820,
    ) ||
    seats.reduce((sum, seat) => sum + seat.total, 0) !== 820
  ) {
    fail(400, "Enter whole totals of zero or more that add up to 820.");
  }
  return seats.map((seat) => ({
    id: seat.id,
    total: seat.total,
    net: seat.total - 205,
  }));
}

function rosterLayout(grid) {
  const headers = [
    "player_id",
    "computing_id",
    "full_name",
    "display",
    "opt_out",
  ];
  if (
    !grid.length ||
    headers.some((header, column) => grid[0][column] !== header)
  )
    fail(
      503,
      "Roster headers must be player_id, computing_id, full_name, display, opt_out.",
    );
  const players = [];
  grid.slice(1).forEach((row, index) => {
    if (!row[2]) {
      if (row[0] || row[1] || row[3])
        fail(503, "Roster row " + (index + 2) + " is incomplete.");
      return;
    }
    if (
      !/^p\d{3,}$/.test(row[0]) ||
      typeof row[2] !== "string" ||
      typeof row[3] !== "string" ||
      !row[3] ||
      ![true, false, ""].includes(row[4])
    )
      fail(503, "Check Roster row " + (index + 2) + ".");
    players.push({
      id: row[0],
      computingId: normalize(row[1]),
      name: row[2],
      display: row[3],
      optOut: row[4] === true,
      row: index + 2,
    });
  });
  for (const field of ["id", "name", "computingId"]) {
    const values = players
      .map((player) => normalize(player[field]))
      .filter(Boolean);
    if (new Set(values).size !== values.length)
      fail(
        503,
        "Roster has duplicate " +
          field +
          " values; an officer must resolve them.",
      );
  }
  return players;
}

function attendanceLayout(grid, date, dateKey) {
  const header = grid.findIndex(
    (row) => row[0] === "Member" && row[1] === "# Meets",
  );
  if (
    header < 0 ||
    grid.filter((row) => row[0] === "Member" && row[1] === "# Meets").length !==
      1
  )
    fail(
      503,
      "Attendance needs one Member / # Meets header in columns A and B.",
    );
  const columns = grid[header]
    .map((value, index) =>
      value instanceof Date || typeof value === "number"
        ? { column: index + 1, date: dateKey(value) }
        : null,
    )
    .filter(Boolean);
  if (
    !columns.length ||
    columns.some((item) => item.column < 4) ||
    new Set(columns.map((item) => item.date)).size !== columns.length
  )
    fail(503, "Attendance date headers are missing or duplicated.");
  const members = grid
    .slice(header + 1)
    .map((row, index) => ({ name: row[0], row: header + index + 2 }))
    .filter((member) => member.name);
  if (
    !members.length ||
    new Set(members.map((member) => normalize(member.name))).size !==
      members.length
  )
    fail(
      503,
      "Attendance needs unique member names and a template member row.",
    );
  return {
    header: header + 1,
    members,
    column: columns.find((item) => item.date === date)?.column,
    lastColumn: Math.max(...columns.map((item) => item.column)),
    lastMember: members[members.length - 1].row,
  };
}

function pointsLayout(grid) {
  const blocks = [];
  grid.forEach((row, index) => {
    if (!/^Table \d+$/.test(String(row[1]))) return;
    const header = grid[index + 1];
    if (
      !header ||
      header[1] !== "Player" ||
      header[2] !== "Points" ||
      header[3] !== "Net" ||
      !grid[index + 5]
    )
      fail(503, "Points Tracking has an invalid table template.");
    const seats = grid
      .slice(index + 2, index + 6)
      .map((seat) => seat.slice(1, 4));
    blocks.push({
      row: index + 1,
      number: Number(row[1].slice(6)),
      date: header[4],
      seats,
      empty: seats.every(
        ([name, points, net]) =>
          name === "" && points === "" && ["", -205].includes(net),
      ),
    });
  });
  if (
    !blocks.length ||
    new Set(blocks.map((block) => block.number)).size !== blocks.length ||
    blocks.some(
      (block, index) => index > 0 && block.row < blocks[index - 1].row + 6,
    )
  )
    fail(
      503,
      "Points Tracking needs separate, uniquely numbered Table N blocks in B:E.",
    );
  return blocks;
}

function meetingWindow(meeting, now) {
  return {
    open:
      !!meeting &&
      !meeting.closed &&
      now >= meeting.opens &&
      now < meeting.closes,
    checkinsOpen:
      !!meeting &&
      !meeting.closed &&
      now >= meeting.opens &&
      now < meeting.checkinsClose,
  };
}
