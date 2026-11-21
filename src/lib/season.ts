/** Nights shared with another student group: the meeting's date, and the
 * partner as named in PARTNERS (site.ts). That date the meeting pages wear
 * the partner's theme (collab.css) and offer its faces (avatar.ts). */
export const COLLAB_NIGHTS = {
  "2026-11-06": "hksa",
  // Not yet confirmed with CSA.
  "2026-11-15": "csa",
} as const;
export type Collab = (typeof COLLAB_NIGHTS)[keyof typeof COLLAB_NIGHTS];

/** The partner for a meeting date ("YYYY-MM-DD"), if it is a collab night. */
export const collabOn = (
  date: string | null | undefined,
): Collab | undefined =>
  date ? COLLAB_NIGHTS[date as keyof typeof COLLAB_NIGHTS] : undefined;

/** What the pages wear at `now` on this phone's clock: "halloween" from
 * Oct 24 to 31, a collab night's partner on its date, else null. Uses
 * nothing from outside, since the root layout runs it as a string before
 * the first paint; `nights` is COLLAB_NIGHTS. */
export function seasonOn(now: Date, nights: Record<string, string>) {
  if (now.getMonth() === 9 && now.getDate() >= 24) return "halloween";
  const pad = (n: number) => String(n).padStart(2, "0");
  // The phone's own date: a Sunday evening in Virginia is Monday in UTC.
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return nights[date] ?? null;
}

/** Oct 24 to 31 on this phone's clock: the week of the club's Halloween
 * meeting, when the meeting pages dress up. */
export const halloweenWeek = (now: Date) => seasonOn(now, {}) === "halloween";
