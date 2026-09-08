import Link from "next/link";
import { getCurrentSemester } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { TAGLINE } from "@/lib/site";
import Wordmark from "@/components/Wordmark";
import Calendar from "@/components/Calendar";
import Photos from "@/components/Photos";
import TileMark from "@/components/TileMark";
import Rule from "@/components/Rule";

export default function Home() {
  const semester = getCurrentSemester();
  const leaders = semester.standings.slice(0, 5);

  return (
    <main>
      <header className="hero">
        <Wordmark />
        <p className="tagline">{TAGLINE}</p>
        <TileMark className="hero-mark" height={78} />
      </header>

      <Rule />

      <section className="section reveal" aria-labelledby="when">
        <h2 className="section-title" id="when">
          When we play
        </h2>
        <Calendar />
      </section>

      <Rule />

      <section className="section reveal" aria-labelledby="standings">
        <h2 className="section-title" id="standings">
          {semester.label}
        </h2>

        {leaders.length === 0 ? (
          <p className="quiet">No tables played yet this semester.</p>
        ) : (
          <>
            <ol className="leaders">
              {leaders.map((player) => (
                <li key={player.id}>
                  <span className="leaders-rank">{player.rank}</span>
                  <span className="leaders-name">{player.display}</span>
                  <span className="leaders-score">{player.total_gain}</span>
                </li>
              ))}
            </ol>
            <p className="section-more">
              <Link href="/leaderboard/">Full standings</Link>
            </p>
          </>
        )}

        {semester.last_session && (
          <p className="quiet">
            Through{" "}
            <time dateTime={semester.last_session}>
              {formatDate(semester.last_session)}
            </time>
          </p>
        )}
      </section>

      <Rule />

      <section className="section reveal" aria-labelledby="table">
        <h2 className="section-title" id="table">
          At the table
        </h2>
        <Photos />
      </section>
    </main>
  );
}
