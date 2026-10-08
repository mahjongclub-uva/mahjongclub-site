import {
  IconBrandInstagram,
  IconMessageCircle,
  IconArrowUpRight,
} from "@tabler/icons-react";
import Link from "next/link";
import {
  ABOUT,
  ABOUT_INTRO_PHOTO,
  ABOUT_PHOTO,
  GROUPME_URL,
  INSTAGRAM,
  OFFICERS,
  UNIVERSITY_STATEMENT,
} from "@/lib/site";
import Section from "@/components/Section";
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ABOUT_INTRO_PHOTO.src}
                alt={ABOUT_INTRO_PHOTO.alt}
                width={ABOUT_INTRO_PHOTO.width}
                height={ABOUT_INTRO_PHOTO.height}
                decoding="async"
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ABOUT_PHOTO.src}
              alt={ABOUT_PHOTO.alt}
              width={ABOUT_PHOTO.width}
              height={ABOUT_PHOTO.height}
              loading="lazy"
              decoding="async"
            />
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
                <small>Reminders, questions, and last-minute changes</small>
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
                <small>Photos, announcements, and meeting updates</small>
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
