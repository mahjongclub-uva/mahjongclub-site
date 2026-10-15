import {
  IconBrandInstagram,
  IconMessageCircle,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import {
  ABOUT,
  ABOUT_INTRO_PHOTO,
  ABOUT_PHOTO,
  GROUPME_URL,
  INSTAGRAM,
  OFFICERS,
  PRESS,
  UNIVERSITY_STATEMENT,
} from "@/lib/site";
import Section from "@/components/Section";
import { ClubPhoto } from "@/components/Photos";
import BackToTop from "@/components/BackToTop";

export const metadata = {
  title: "About - Mahjong Club @ UVA",
  description:
    "What the Mahjong Club at UVA plays, how to join, and how public club data is handled.",
};

function emphasizeStyles(copy: string, styles: RegExp) {
  return copy
    .split(styles)
    .map((part, index) =>
      index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
    );
}

export default function About() {
  return (
    <main className="about-page">
      <header className="page-head">
        <div className="section-wrap">
          <p className="eyebrow">About</p>
          <h1 className="page-title">The club</h1>
          <p className="page-intro">{ABOUT.intro}</p>
          {ABOUT_INTRO_PHOTO && (
            <figure className="about-photo about-intro-photo">
              {/* The page's largest image, so it loads first. */}
              <ClubPhoto
                photo={ABOUT_INTRO_PHOTO}
                loading="eager"
                fetchPriority="high"
              />
            </figure>
          )}
        </div>
      </header>

      <Section id="game" title="What we play">
        <div className="about-story">
          <div className="prose reading">
            <p>
              {emphasizeStyles(
                ABOUT.game,
                /(Fuzhounese \(Fuzhou-style\) mahjong)/g,
              )}
            </p>
            <p>{ABOUT.variety}</p>
            <p>
              {emphasizeStyles(
                ABOUT.otherStyles,
                /(Japanese riichi|Hong Kong-style mahjong|American mahjong)/g,
              )}
            </p>
            <Link className="action-link" href="/guide/">
              New to mahjong? Start here
            </Link>
          </div>
          <figure className="about-photo">
            <ClubPhoto photo={ABOUT_PHOTO} />
          </figure>
        </div>
      </Section>

      <Section id="officers" title="Meet the officers">
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

      {PRESS && (
        <Section id="news" title="Read about us!">
          <a
            className="link-card press-card"
            href={PRESS.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>
              <b>{PRESS.outlet}</b>
              <strong>{PRESS.title}</strong>
              <small>
                <time dateTime={PRESS.date}>{formatDate(PRESS.date)}</time>
              </small>
            </span>
            <IconArrowUpRight size={22} aria-hidden="true" />
          </a>
        </Section>
      )}

      <Section id="connect" title="Join the next table">
        <div className="link-cards">
          {GROUPME_URL ? (
            <a
              className="link-card"
              href={GROUPME_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconMessageCircle size={26} aria-hidden="true" />
              <span>
                <strong>GroupMe</strong>
                <small>Reminders and last-minute changes</small>
              </span>
              <IconArrowUpRight size={20} aria-hidden="true" />
            </a>
          ) : (
            <div className="link-card">
              <IconMessageCircle size={26} aria-hidden="true" />
              <span>
                <strong>GroupMe</strong>
                <small>Ask a club officer for the invitation</small>
              </span>
            </div>
          )}
          {INSTAGRAM && (
            <a
              className="link-card"
              href={`https://instagram.com/${INSTAGRAM}`}
              rel="me noopener noreferrer"
              target="_blank"
            >
              <IconBrandInstagram size={26} aria-hidden="true" />
              <span>
                <strong>Instagram</strong>
                <small>@{INSTAGRAM}</small>
              </span>
              <IconArrowUpRight size={20} aria-hidden="true" />
            </a>
          )}
        </div>
      </Section>

      <section className="club-notes" aria-labelledby="notes">
        <div className="section-wrap">
          <h2 id="notes">Club notes</h2>
          <ol>
            <li>
              {UNIVERSITY_STATEMENT} Read the University&apos;s{" "}
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
      <BackToTop />
    </main>
  );
}
