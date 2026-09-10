import Link from "next/link";
import { PHOTOS, TAGLINE } from "@/lib/site";
import Hero from "@/components/Hero";
import Calendar from "@/components/Calendar";
import InspectTile from "@/components/InspectTile";
import NextMeeting from "@/components/NextMeeting";
import Photos from "@/components/Photos";
import FollowUs from "@/components/FollowUs";
import Section from "@/components/Section";

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

      <Section id="first-night" title="Come to our meetings!">
        <div className="welcome">
          <div>
          <p>
            You do not need to know the rules or bring a set! Come to learn, play, and just hang out, whether you’re studying, socializing, or just vibing, there’s a seat for you at the table. Grab your friends and join us for a relaxing (and maybe a little competitive 👀) mahjong session!
          </p>
          <Link className="text-link" href="/guide/#first-table">
            What should I expect?
          </Link>
          </div>
        </div>
      </Section>

      <InspectTile />

      <Section id="when" title="When do we play?">
        <NextMeeting />
        <Calendar />
      </Section>

      {PHOTOS.length > 0 && (
        <Section id="table" title="At the table">
          <Photos />
        </Section>
      )}

      <Section id="follow" title="Follow us on social media!">
        <FollowUs />
      </Section>
    </main>
  );
}
