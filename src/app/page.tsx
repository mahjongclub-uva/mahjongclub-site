import Link from "next/link";
import { getCurrentSemester } from "@/lib/data";
import Wordmark from "@/components/Wordmark";

// Scaffolding, not design. This page proves the data reaches a template and
// gives you a semantic skeleton to build on. The markup is yours to change —
// the tile wordmark, the layout and all of the styling are still to be written.
//
// Two things worth keeping whatever else changes:
//   - the club name stays real text inside the <h1>, never an image
//   - the first reveal is CSS, so the name does not wait on hydration.
//     JavaScript is welcome on top of that, not underneath it.

export default function Home() {
  const semester = getCurrentSemester();
  const top5 = semester.standings.slice(0, 5);

  return (
    <main>
      <Wordmark />

      <p>
        Anyone is welcome to play! Come learn with us.
      </p>

      <h2>{semester.label} leaders</h2>

      {top5.length === 0 ? (
        <p>No tables played yet this semester.</p>
      ) : (
        <ol>
          {top5.map((player) => (
            <li key={player.id}>
              {player.display} — {player.total_gain} points from{" "}
              {player.tables_played} tables
            </li>
          ))}
        </ol>
      )}

      <p>
        <Link href="/leaderboard/">Full leaderboard</Link>
      </p>

      {semester.last_session && (
        <p>
          Data through{" "}
          <time dateTime={semester.last_session}>
            {formatDate(semester.last_session)}
          </time>
          .
        </p>
      )}
    </main>
  );
}

/** "2025-11-22" -> "22 Nov 2025". Parsed as UTC so it cannot slip a day. */
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
