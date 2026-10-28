/** Everyone starts a season at 205 (re-exported by schema.ts). */
export const SEASON_START = 205;

/** 一 through 九 by index, with 伍 for five as on the guide's tiles. */
export const NUMERALS = ["", ..."一二三四伍六七八九"];

/** A score with a real minus sign, which a season below zero can need. */
export const formatPoints = (points: number) =>
  String(points).replace("-", "−");

/** "2025-11-22" -> "22 November 2025". Parsed as UTC so it cannot slip a day. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-09-30" -> "Wed 30 Sept", for the meeting header. */
export function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Pinned rather than read from the environment, since `next build` runs on a
 * GitHub runner in UTC and meeting times must render in the club's zone. */
export const CLUB_TZ = "America/New_York";

/** The club's calendar date at `now`, as "2026-10-30". */
export const clubDate = (now: Date) =>
  now.toLocaleDateString("en-CA", { timeZone: CLUB_TZ });

/** "2026-09-18T17:30:00-04:00" -> "Friday 18 September". */
export function formatMeetingDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CLUB_TZ,
  });
}

/** A start and optional end as one span: "5:30–7:30 pm", or "5:30 pm" alone. */
export function formatMeetingTime(start: string, end: string | null): string {
  const parts = (iso: string) => {
    const text = new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: CLUB_TZ,
    });
    const [clock, marker] = text.split(" ");
    return { clock, marker: marker.toLowerCase() };
  };

  const from = parts(start);
  if (!end) return `${from.clock} ${from.marker}`;

  const to = parts(end);
  // "5:30–7:30 pm" reads better than "5:30 pm–7:30 pm", but only when the two
  // ends share a day period. A meeting running 11:30 to 1:30 has to say both.
  const head =
    from.marker === to.marker ? from.clock : `${from.clock} ${from.marker}`;
  return `${head}–${to.clock} ${to.marker}`;
}

/** A signed net such as "+45" or "−20", with a real minus sign. */
export function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "±0";
}

/** A number with a real minus sign. */
export const minus = (value: number) => String(value).replace("-", "−");

/** A clock time on this phone, such as "6:42 PM". */
export const clock = (at = Date.now()) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The names under a group of tiles: a "First L." name shows as just the
 * first name, unless someone else in the group shares it. Handles and other
 * shapes show as they are. */
export function tileNames(
  players: { id: string; display: string }[],
): Map<string, string> {
  const first = (display: string) => /^(\S+) \S\.$/.exec(display)?.[1] ?? null;
  const count = new Map<string, number>();
  for (const { display } of players) {
    const name = first(display)?.toLowerCase();
    if (name) count.set(name, (count.get(name) ?? 0) + 1);
  }
  return new Map(
    players.map(({ id, display }) => {
      const name = first(display);
      return [id, name && count.get(name.toLowerCase()) === 1 ? name : display];
    }),
  );
}
