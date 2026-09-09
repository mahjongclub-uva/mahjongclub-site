import Link from "next/link";
import { PHOTOS, TAGLINE } from "@/lib/site";
import Hero from "@/components/Hero";
import Calendar from "@/components/Calendar";
import Photos from "@/components/Photos";
import FollowUs from "@/components/FollowUs";
import Section from "@/components/Section";
import SuitTiles from "@/components/SuitTiles";

export default function Home() {
  return (
    <main>
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

      <Section id="first-night" title="Your first night">
        <div className="welcome">
          <div>
          <p>
            You do not need to know the rules or bring a set. We will teach
            you through a practice hand before anything is scored.
          </p>
          <Link className="text-link" href="/guide/#first-table">
            What beginners can expect
          </Link>
          </div>
          <SuitTiles />
        </div>
      </Section>

      <Section id="when" title="When we play">
        <Calendar />
      </Section>

      {PHOTOS.length > 0 && (
        <Section id="table" title="At the table">
          <Photos />
        </Section>
      )}

      <Section id="follow" title="Keep up with us">
        <FollowUs />
      </Section>
    </main>
  );
}
