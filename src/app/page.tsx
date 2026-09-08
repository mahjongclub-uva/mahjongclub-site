import { TAGLINE } from "@/lib/site";
import Hero from "@/components/Hero";
import Calendar from "@/components/Calendar";
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
        </div>
      </header>

      {/* Alternating grounds do the work the little dividers used to. */}
      <Section id="table" title="At the table">
        <Photos />
      </Section>

      <Section id="when" title="When we play">
        <Calendar />
      </Section>

      <Section id="follow" title="Keep up with us">
        <FollowUs />
      </Section>
    </main>
  );
}
