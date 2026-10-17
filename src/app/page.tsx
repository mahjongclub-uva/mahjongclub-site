import Link from "next/link";
import { PHOTOS, TAGLINE, HOME, MEETING_PHOTO } from "@/lib/site";
import Hero from "@/components/Hero";
import Calendar from "@/components/Calendar";
import RollingDot from "@/components/RollingDot";
import NextMeeting from "@/components/NextMeeting";
import { HomeMeeting } from "@/components/MeetingLinks";
import { getMeetings } from "@/lib/data";
import Photos, { ClubPhoto } from "@/components/Photos";
import FollowUs from "@/components/FollowUs";
import Section from "@/components/Section";
import RevealSection from "@/components/RevealSection";

export default function Home() {
  return (
    <main className="home-page">
      <header className="hero">
        <div className="section-wrap">
          <Hero />
          <p className="tagline">{TAGLINE}</p>
          <HomeMeeting schedule={getMeetings()}>
            <div className="hero-actions" aria-label="Get started">
              <Link className="action-link action-link-primary" href="/guide/">
                Learn the basics
              </Link>
              <Link className="action-link" href="/about/">
                Meet the club
              </Link>
            </div>
          </HomeMeeting>
        </div>
      </header>

      <Section id="first-night" title={HOME.welcomeTitle}>
        <div className="welcome">
          <div>
            <p>{HOME.welcome}</p>
            <Link className="action-link" href="/guide/">
              What should I expect?
            </Link>
          </div>
          {/* The first two approved photos sit beside the welcome. */}
          <div className="club-photos">
            {PHOTOS.length ? (
              <Photos photos={PHOTOS.slice(0, 2)} />
            ) : (
              <div className="club-photo-placeholder">
                <span
                  className="photo-corner photo-corner-top"
                  aria-hidden="true"
                />
                <p>{HOME.photosPending}</p>
                <span
                  className="photo-corner photo-corner-bottom"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>
      </Section>

      <RevealSection id="when" title="When do we play?" lead={<RollingDot />}>
        <div className="meeting-summary">
          <NextMeeting />
          <figure className="meeting-photo">
            <ClubPhoto photo={MEETING_PHOTO} />
          </figure>
        </div>
        <Calendar />
      </RevealSection>

      {PHOTOS.length > 2 && (
        <Section id="table" title="At the table">
          <Photos photos={PHOTOS.slice(2)} />
        </Section>
      )}

      <Section id="follow" title="Keep up with us!">
        <FollowUs />
      </Section>
    </main>
  );
}
