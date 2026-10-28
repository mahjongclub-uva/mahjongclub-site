/** Oct 24 to 31 on this phone's clock: the week of the club's Halloween
 * meeting, when the meeting pages dress up. */
export const halloweenWeek = (now: Date) =>
  now.getMonth() === 9 && now.getDate() >= 24;
