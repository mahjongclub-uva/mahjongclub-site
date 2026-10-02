import type { Metadata } from "next";
import LiveStandings from "@/components/LiveStandings";
import { getCurrentSemester } from "@/lib/data";
import { MEETING_REHEARSAL } from "@/lib/site";

export const metadata: Metadata = { title: "Live standings" };
export default function LivePage() {
  const semester = getCurrentSemester();
  // Rehearsal player IDs must never overlap the real roster's scores.
  const baseline = MEETING_REHEARSAL
    ? {
        ...semester,
        standings: [],
        unranked: [],
        last_session: null,
        sessions: 0,
      }
    : semester;
  return <LiveStandings semester={baseline} />;
}
