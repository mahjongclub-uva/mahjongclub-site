import type { Submission } from "./meeting.ts";

export type ScorePhase = "pick" | "score" | "review";

/**
 * Where a table's score entry is. One value instead of separate flags, so a
 * save can't be both sending and saved, or editable while a retry is owed.
 */
export type ScoreFlow =
  // Reading this tab's earlier draft, retry copy or receipt.
  | { name: "restoring" }
  // That read failed; only an officer's reset leaves this.
  | { name: "broken" }
  | { name: "editing"; phase: ScorePhase }
  // The submission is in sessionStorage and on its way.
  | { name: "sending"; submission: Submission }
  // Sent but never confirmed; a retry resends the same submissionId.
  | { name: "unconfirmed"; submission: Submission }
  | { name: "saved"; table: number; savedAt: string };

/** The flags the form renders from. */
export function scoreView(flow: ScoreFlow) {
  const pending =
    flow.name === "sending" || flow.name === "unconfirmed"
      ? flow.submission
      : null;
  return {
    ready: flow.name !== "restoring",
    restoreFailed: flow.name === "broken",
    busy: flow.name === "sending",
    pending,
    receipt: flow.name === "saved" ? flow : null,
    stage: pending
      ? ("review" as const)
      : flow.name === "editing"
        ? flow.phase
        : ("pick" as const),
    locked: flow.name !== "editing",
  };
}
