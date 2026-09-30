"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CODE_EVENT,
  CODE_STORAGE,
  getMeeting,
  rememberedCode,
} from "@/lib/meeting";
import { MEETING_SERVICE_URL } from "@/lib/site";
import styles from "./MeetingLinks.module.css";

export default function MeetingLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const code = rememberedCode(sessionStorage.getItem(CODE_STORAGE));
        if (!code) {
          setOpen(false);
          return;
        }
        const meeting = await getMeeting(
          MEETING_SERVICE_URL,
          code,
          AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        );
        if (!controller.signal.aborted && current === revision)
          setOpen(Boolean(meeting.open && meeting.players));
      } catch {
        if (!controller.signal.aborted && current === revision) setOpen(false);
      }
    }
    void load();
    window.addEventListener(CODE_EVENT, load);
    const timer = setInterval(load, 60000);
    return () => {
      controller.abort();
      window.removeEventListener(CODE_EVENT, load);
      clearInterval(timer);
    };
  }, [pathname]);
  if (!open) return null;
  return (
    <nav className={styles.links} aria-label="Tonight’s meeting">
      <span>Tonight’s meeting</span>
      <Link
        href="/checkin/"
        aria-current={pathname === "/checkin/" ? "page" : undefined}
      >
        Check in
      </Link>
      <Link
        href="/score/"
        aria-current={pathname === "/score/" ? "page" : undefined}
      >
        Record a table
      </Link>
    </nav>
  );
}
