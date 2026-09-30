import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MEETING_REHEARSAL } from "@/lib/site";
import "./meeting.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MeetingLayout({ children }: { children: ReactNode }) {
  return (
    <main className="meeting-page">
      {MEETING_REHEARSAL && (
        <p className="meeting-rehearsal section-wrap">
          Rehearsal only. Use fake names and IDs; this is not the club
          attendance record.
        </p>
      )}
      {children}
    </main>
  );
}
