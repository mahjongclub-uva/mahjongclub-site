import {
  IconPhoto,
  IconBrandInstagram,
  IconMessageCircle,
  IconArrowUpRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { ABOUT, GROUPME_URL, INSTAGRAM, OFFICERS } from "@/lib/site";
import Section from "@/components/Section";

export const metadata = {
  title: "About - Mahjong Club @ UVA",
  description:
    "What the Mahjong Club at UVA plays, how to join, and how public club data is handled.",
};

export default function About() {
  return (
    <main className="about-page">
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">About</p>
          <h1 className="page-title">The club</h1>
          <p className="page-intro">{ABOUT.intro}</p>
        </div>
      </header>

      <Section id="game" title="What we play">
        <div className="about-story">
          <div className="prose reading">
            <p>{ABOUT.game}</p>
            <p>{ABOUT.variety}</p>
            <p>{ABOUT.otherStyles}</p>
            <Link className="action-link" href="/guide/">
              New to mahjong? Start here
            </Link>
          </div>
          <div className="about-photo-placeholder">
            <IconPhoto size={42} stroke={1.2} aria-hidden="true" />
            <span>{ABOUT.tablePhoto}</span>
            <small>Coming soon</small>
          </div>
        </div>
      </Section>

      <Section id="officers" title="Meet the officers">
        {/* A description list, because that is what this is: each role is a
            term and the person holding it is its definition. */}
        <div className="about-officers-layout">
          <dl className="officers">
            {OFFICERS.map((officer) => (
              <div key={officer.role}>
                <dt>{officer.role}</dt>
                <dd className={officer.name ? undefined : "officers-vacant"}>
                  {officer.name ?? "To be announced"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section id="connect" title="Join the next table">
        <div className="social-list">
          {GROUPME_URL ? (
            <a href={GROUPME_URL} rel="noopener noreferrer" target="_blank">
              <IconMessageCircle
                className="join-icon"
                size={30}
                stroke={1.5}
                aria-hidden="true"
              />
              <span>
                <strong>GroupMe</strong>
                <small>Reminders, questions and last-minute changes</small>
              </span>
              <b>
                Join GroupMe <IconArrowUpRight size={17} aria-hidden="true" />
              </b>
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
              <IconBrandInstagram
                className="join-icon"
                size={30}
                stroke={1.5}
                aria-hidden="true"
              />
              <span>
                <strong>Instagram</strong>
                <small>Photos, announcements and meeting updates</small>
              </span>
              <b>
                Follow us <IconArrowUpRight size={17} aria-hidden="true" />
              </b>
            </a>
          )}
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
