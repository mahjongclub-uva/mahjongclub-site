import Link from "next/link";
import { GROUPME_URL, INSTAGRAM } from "@/lib/site";
import Section from "@/components/Section";

export const metadata = {
  title: "About - Mahjong Club @ UVA",
  description:
    "What the Mahjong Club at UVA plays, how to join, and how public club data is handled.",
};

export default function About() {
  return (
    <main>
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">About</p>
          <h1 className="page-title">The club</h1>
          <p className="page-intro">
            A low-pressure place to learn Fuzhou-style mahjong, meet new
            players and keep coming back to the table.
          </p>
        </div>
      </header>

      <Section id="game" title="What we play">
        <div className="prose">
          <p>
            Fuzhou-style mahjong. Sixteen tiles in hand instead of the usual
            thirteen, four players to a table, and a gold wildcard that stands
            in for any tile.
          </p>
          <p>
            The wildcard changes how the game feels. Hands that would be dead
            turn out to be one tile away, so tables stay alive much longer.
          </p>
        </div>
      </Section>

      <Section id="connect" title="Join the next table">
        <div className="social-list">
          {GROUPME_URL ? (
            <a href={GROUPME_URL} rel="noopener noreferrer" target="_blank">
              <span>
                <strong>GroupMe</strong>
                <small>Reminders, questions and last-minute changes</small>
              </span>
              <b>Open invite</b>
            </a>
          ) : (
            <div className="social-list-pending">
              <span>
                <strong>GroupMe</strong>
                <small>Ask a club officer for the current invitation</small>
              </span>
              <b>Invite pending</b>
            </div>
          )}

          {INSTAGRAM && (
            <a
              href={`https://instagram.com/${INSTAGRAM}`}
              rel="me noopener noreferrer"
              target="_blank"
            >
              <span>
                <strong>@{INSTAGRAM}</strong>
                <small>Photos, announcements and meeting updates</small>
              </span>
              <b>Open Instagram</b>
            </a>
          )}
        </div>
      </Section>

      <Section id="learn" title="New to mahjong?">
        <div className="prose">
          <p>
            Most members learned here. We provide the sets and guide new
            players through a practice hand before anything is scored.
          </p>
          <p>
            <Link className="text-link" href="/guide/">
              Read the beginner guide
            </Link>
          </p>
        </div>
      </Section>

      <section className="club-notes" aria-labelledby="notes">
        <div className="section-wrap">
          <h2 id="notes">Club notes</h2>
          <ol>
            <li>
              Mahjong Club @ UVA operates independently as a Contracted
              Independent Organization. The University does not direct or
              control the club and is not responsible for its activities. Read
              the University&apos;s{" "}
              <a
                href="https://studentaffairs.virginia.edu/subsite/student-engagement/cio-support/about-student-orgs"
                rel="noopener noreferrer"
                target="_blank"
              >
                explanation of student organizations
              </a>
              .
            </li>
            <li>
              Playing a scored table allows the club to publish your display
              name and result. Ask a club officer to opt out; public ranks are
              recalculated without your entry.
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
