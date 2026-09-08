import Link from "next/link";
import { getCurrentSemester } from "@/lib/data";

// Scaffolding, not design.
//
// The markup is a real <table> because this is genuinely tabular data and that
// is what a screen reader needs. Six columns do not fit a phone, so below 768px
// it collapses into stacked cards — display:block on the table parts plus the
// data-label attributes below. Horizontal scrolling on the table is the one
// approach ruled out, because it hides columns with no sign they exist.
//
// Names never link anywhere. There are no player pages and no player-specific
// URLs anywhere on this site, by design.

export default function Leaderboard() {
  const semester = getCurrentSemester();

  return (
    <main>
      <h1>{semester.label} leaderboard</h1>

      <p>
        Ranked by points won. Losses are not counted against you, so playing
        more tables can only ever help. You need {semester.min_tables_to_rank}{" "}
        tables to be ranked.
      </p>

      {semester.standings.length === 0 ? (
        <p>No tables played yet this semester.</p>
      ) : (
        <table className="leaderboard">
          {/*
            Deliberately does not print the session count. Table 21 has no date
            in the sheet, so semester.sessions is a floor rather than a count —
            it is honest as metadata, but not as a sentence on a public page.
            Restore it once the sheet is fixed.
          */}
          <caption>{semester.standings.length} ranked players</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col">Tables</th>
              <th scope="col">Points won</th>
              <th scope="col">Average</th>
              <th scope="col">Best table</th>
            </tr>
          </thead>
          <tbody>
            {semester.standings.map((player) => (
              <tr key={player.id}>
                {/*
                  Each data-label repeats its column heading. Below the tablet
                  breakpoint the header row is hidden and the CSS pulls these
                  back in via td::before, which is what lets one <table> serve
                  both the desktop table and the mobile cards.
                  Keep them in step with the <th scope="col"> text above.
                */}
                <td data-label="Rank">{player.rank}</td>
                <th scope="row">{player.display}</th>
                <td data-label="Tables">{player.tables_played}</td>
                <td data-label="Points won">{player.total_gain}</td>
                <td data-label="Average">{player.avg_gain}</td>
                <td data-label="Best table">{player.best_table}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {semester.awards.length > 0 && (
        <section>
          <h2>Awards</h2>
          <dl>
            {semester.awards.map((award) => (
              <div key={award.id}>
                <dt>{award.label}</dt>
                <dd>
                  {award.display} — {award.value} {award.unit}
                  {award.detail ? ` (${award.detail})` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {semester.unranked.length > 0 && (
        <section>
          <h2>Not yet ranked</h2>
          <ul>
            {semester.unranked.map((player) => (
              <li key={player.id}>
                {player.display} — {player.tables_needed} more{" "}
                {player.tables_needed === 1 ? "table" : "tables"} to be ranked
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Required by the club's consent model: people are told, here, what
        playing a scored game publishes about them, and how to leave.
      */}
      <section>
        <h2>About these standings</h2>
        <p>
          Playing a scored game at club puts your result on this page, shown as
          your first name and last initial. Nothing else is published — no
          attendance, no dues, no full names.
        </p>
        <p>
          If you would rather not appear, tell a club officer and you will be
          removed entirely. Ranks are worked out after any removals, so the list
          never shows a gap where somebody used to be.
        </p>
      </section>

      <p>
        <Link href="/">Back to the homepage</Link>
      </p>
    </main>
  );
}
