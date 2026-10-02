"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CODE_EVENT,
  CODE_STORAGE,
  RETURN_STORAGE,
  getMeeting,
  rememberedCode,
  isMeetingPage,
  type Meeting,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import { formatDate } from "@/lib/format";
import styles from "./MeetingLinks.module.css";

export default function MeetingLinks() {
  const pathname = usePathname();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [target, setTarget] = useState("/checkin/");
  useEffect(() => {
    let revision = 0;
    let controller: AbortController;
    async function load() {
      const current = ++revision;
      controller?.abort();
      controller = new AbortController();
      try {
        let code = "";
        try {
          code = rememberedCode(sessionStorage.getItem(CODE_STORAGE));
          const saved = sessionStorage.getItem(RETURN_STORAGE);
          setTarget(saved && isMeetingPage(saved) ? saved : "/checkin/");
        } catch {
          /* Public meeting state is still available without storage. */
        }
        const next = await getMeeting(
          MEETING_SERVICE_URL,
          code,
          AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        );
        if (current === revision) setMeeting(next);
      } catch {
        if (current === revision) setMeeting(null);
      }
    }
    void load();
    window.addEventListener(CODE_EVENT, load);
    const timer = setInterval(load, 60000);
    return () => {
      revision++;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener(CODE_EVENT, load);
    };
  }, [pathname]);
  if (!meeting?.open || !meeting.date) return null;
  const href =
    !meeting.checkinsOpen && target === "/checkin/" ? "/score/" : target;
  return (
    <Link href={href} className={styles.dock}>
      <span className={styles.dot} aria-hidden="true" />
      <span>
        <strong>
          {meeting.checkinsOpen
            ? "We’re playing right now!"
            : "Scores are still open"}
        </strong>
        <small>
          <time dateTime={meeting.date}>{formatDate(meeting.date)}</time> -
          Meeting
        </small>
      </span>
      <b>
        {target !== "/checkin/"
          ? "Back to meeting →"
          : meeting.checkinsOpen
            ? "Check in →"
            : "Record a table →"}
      </b>
    </Link>
  );
}
