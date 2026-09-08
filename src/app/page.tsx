import { TAGLINE } from "@/lib/site";
import Hero from "@/components/Hero";
import Calendar from "@/components/Calendar";
import Photos from "@/components/Photos";
import FollowUs from "@/components/FollowUs";
import TileMark from "@/components/TileMark";
import Rule from "@/components/Rule";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <Hero />
        <p className="tagline">{TAGLINE}</p>
        <TileMark className="hero-mark" height={78} />
      </header>

      <Rule />

      {/* Photographs come first after the hero: they say what the club is
          faster than any sentence, and each frame arrives on scroll. */}
      <section className="section" aria-labelledby="table">
        <h2 className="section-title reveal" id="table">
          At the table
        </h2>
        <Photos />
      </section>

      <Rule />

      <section className="section reveal" aria-labelledby="when">
        <h2 className="section-title" id="when">
          When we play
        </h2>
        <Calendar />
      </section>

      <Rule />

      <section className="section reveal" aria-labelledby="follow">
        <h2 className="section-title" id="follow">
          Keep up with us
        </h2>
        <FollowUs />
      </section>
    </main>
  );
}
