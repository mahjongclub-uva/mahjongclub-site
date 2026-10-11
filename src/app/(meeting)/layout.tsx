import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nunito } from "next/font/google";
import { MEETING_REHEARSAL } from "@/lib/site";
import "./meeting.css";

// The meeting pages' own rounded face, so the game feels apart from the site.
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-meeting",
  display: "swap",
});

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MeetingLayout({ children }: { children: ReactNode }) {
  return (
    <main className={`meeting-page ${nunito.variable}`}>
      {MEETING_REHEARSAL && (
        <p className="meeting-rehearsal">
          Rehearsal only. Use fake names and IDs.
        </p>
      )}
      {children}
    </main>
  );
}
