import Link from "next/link";
import { PHOTOS, TAGLINE, HOME, MEETING_PHOTO } from "@/lib/site";
import { asset } from "@/lib/asset";
import ClubPhotos from "@/components/ClubPhotos";
import Hero from "@/components/Hero";
import Calendar from "@/components/Calendar";
import RollingDot from "@/components/RollingDot";
import NextMeeting from "@/components/NextMeeting";
import Photos from "@/components/Photos";
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
          <div className="hero-actions" aria-label="Get started">
            <Link className="action-link action-link-primary" href="/guide/">
              Learn the basics
            </Link>
            <Link className="action-link" href="/about/">
              Meet the club
            </Link>
          </div>
        </div>
      </header>

      <Section id="first-night" title={HOME.welcomeTitle}>
        <div className="welcome">
          <div>
            <p>{HOME.welcome}</p>
            <Link className="action-link" href="/guide/#first-table">
              What should I expect?
            </Link>
          </div>
          <ClubPhotos />
        </div>
      </Section>

      <RevealSection id="when" title="When do we play?" lead={<RollingDot />}>
        <div className="meeting-summary">
          <NextMeeting />
          <figure className="meeting-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset(MEETING_PHOTO.src)}
              alt={MEETING_PHOTO.alt}
              width={MEETING_PHOTO.width}
              height={MEETING_PHOTO.height}
              loading="lazy"
              decoding="async"
            />
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
