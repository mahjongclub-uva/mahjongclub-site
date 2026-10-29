import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MEETING_REHEARSAL } from "@/lib/site";
import { preconnect } from "react-dom";
import { nunito } from "@/lib/fonts";
import "./meeting.css";
import "./halloween.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MeetingLayout({ children }: { children: ReactNode }) {
  // Every meeting page asks the Apps Script first thing, which answers from
  // script.google.com and then redirects to googleusercontent.com.
  preconnect("https://script.google.com", { crossOrigin: "anonymous" });
  preconnect("https://script.googleusercontent.com", {
    crossOrigin: "anonymous",
  });
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
