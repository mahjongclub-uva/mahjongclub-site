"use client";

import { useState, type ReactNode } from "react";
import { IconMenu2 } from "@tabler/icons-react";
import Sheet from "@/components/Sheet";
import {
  getMeeting,
  rememberPlayer,
  requestError,
  savedPlayer,
  type Meeting,
  MEETING_PATHS,
} from "@/lib/meeting";
import { LOGO, MEETING_SERVICE_URL } from "@/lib/site";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { formatDate } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

/**
 * Everything that is not the page's one main action, in one layer: who this
 * phone is, the other meeting pages, the typed-totals fallback and the club
 * website. It replaces a row of tabs and the links scattered under each page.
 */
function MeetingMenu({
  meeting,
  pathname,
  close,
}: {
  meeting: Meeting | null;
  pathname: string;
  close: () => void;
}) {
  const player = meeting && savedPlayer(meeting);
  const seatedAt = meeting?.rooms?.find((room) =>
    room.seats.some((seat) => seat.id === player?.id),
  )?.table;
  const here = pathname.replace(/\/?$/, "/");
  const links: [string, string][] = meeting?.open
    ? [
        [MEETING_PATHS.hub, "Tonight’s meeting"],
        [MEETING_PATHS.checkin, "Check in"],
        seatedAt
          ? [MEETING_PATHS.table(seatedAt), `Your table: Table ${seatedAt}`]
          : meeting.rooms
            ? [MEETING_PATHS.tables, "Tables"]
            : [MEETING_PATHS.score, "Record a table"],
        [MEETING_PATHS.standings, "Tonight’s standings"],
      ]
    : [];
  return (
    <Sheet title="Menu" close={close}>
      {player && (
        <p className="menu-player">
          <span>
            Playing as <strong>{player.display}</strong>
          </span>
          <button
            type="button"
            className="meeting-text"
            onClick={() => {
              rememberPlayer(meeting!, null);
              window.location.assign(MEETING_PATHS.checkin);
            }}
          >
            Not you? Switch player
          </button>
        </p>
      )}
      {links.length > 0 && (
        <ul className="menu-links">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={here === href ? "page" : undefined}
                onClick={close}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ul className="menu-links menu-quiet">
        {meeting?.rooms && (
          <li>
            <Link href={MEETING_PATHS.score} onClick={close}>
              Played without a table? Enter final totals
            </Link>
          </li>
        )}
        <li>
          <Link href="/">Club website</Link>
        </li>
      </ul>
      <p className="quiet">No UVA computing ID? An officer can check you in.</p>
    </Sheet>
  );
}

export default function MeetingAccess({
  children,
}: {
  children: (meeting: Meeting, refresh: () => void) => ReactNode;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const refresh = usePoll(
    async (signal) => {
      setChecking(true);
      try {
        const next = await getMeeting(MEETING_SERVICE_URL, signal);
        if (signal.aborted) return;
        setMeeting(next);
        setError("");
        setCheckedAt(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      } catch (failure) {
        if (!signal.aborted) setError(requestError(failure));
      } finally {
        if (!signal.aborted) setChecking(false);
      }
    },
    60000,
    [],
  );
  return (
    <div className="meeting-access">
      <header className="meeting-header">
        <div className="meeting-brand">
          {LOGO && <Image src={LOGO} alt="" width={36} height={36} />}
          <span>
            <strong>
              {meeting?.date
                ? `${formatDate(meeting.date)} - Meeting`
                : "Mahjong meeting"}
            </strong>
            <small>Mahjong Club @ UVA</small>
          </span>
        </div>
        <button
          type="button"
          className="meeting-menu-button"
          aria-haspopup="dialog"
          onClick={() => setMenu(true)}
        >
          <IconMenu2 size={20} aria-hidden="true" />
          Menu
        </button>
      </header>
      {menu && (
        <MeetingMenu
          meeting={meeting}
          pathname={pathname}
          close={() => setMenu(false)}
        />
      )}
      {meeting?.open && (
        <>
          <p className="meeting-status">
            <span className="meeting-live-dot" aria-hidden="true" />
            {meeting.checkinsOpen
              ? "We’re playing right now!"
              : "Scores are still open"}
            {meeting.players && (
              <span className="meeting-headcount">
                {meeting.players.length} checked in
              </span>
            )}
          </p>
        </>
      )}
      {error && (
        <div className="meeting-notice" role="alert">
          <p>{error}</p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={refresh}
            disabled={checking}
          >
            {checking ? "Connecting…" : "Retry connection"}
          </button>
          <p>An officer can help with attendance and scores.</p>
        </div>
      )}
      {!meeting && !error && (
        <div className="meeting-loading" role="status">
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Checking tonight’s meeting…
        </div>
      )}
      {meeting && !meeting.open && (
        <div className="meeting-closed">
          <h1>See you at the table.</h1>
          <p>
            Check-in opens during club meetings. Already here? Ask an officer to
            open it.
          </p>
          <button
            className="meeting-secondary"
            type="button"
            onClick={refresh}
            disabled={checking}
          >
            {checking ? "Checking…" : "Check again"}
          </button>
          <p className="quiet" role="status">
            {checking
              ? "Checking for an open meeting…"
              : `Last checked at ${checkedAt}.`}
          </p>
          <Link className="meeting-text" href="/">
            Back to the club
          </Link>
        </div>
      )}
      {meeting?.open && meeting.players && children(meeting, refresh)}
      {meeting?.open && !meeting.players && !error && (
        <p role="alert">
          The meeting service needs an update. Ask an officer to record
          attendance and scores for now.
        </p>
      )}
      <noscript>
        <p>
          Enable JavaScript to check in or submit a score. An officer can also
          record your attendance and result in the Sheet.
        </p>
      </noscript>
    </div>
  );
}
