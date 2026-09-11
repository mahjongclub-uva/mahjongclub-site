import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { IconMapPin } from "@tabler/icons-react";
import {
  CONTACT_EMAIL,
  LOCATION,
  LOCATION_URL,
  FULL_NAME,
  LOGO,
} from "@/lib/site";

/**
 * Appears on every page.
 *
 * The longer CIO and leaderboard consent notes live on About. This footer
 * keeps them reachable from every route without repeating legal copy beneath
 * every page.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link
          className="footer-brand"
          href="/"
          aria-label={`${FULL_NAME} home`}
        >
          {LOGO && <Image src={asset(LOGO)} width={34} height={34} alt="" />}
          <span>{FULL_NAME}</span>
        </Link>
        <nav className="footer-pages" aria-label="Footer pages">
          <Link href="/">Home</Link>
          <Link href="/about/">About</Link>
          <Link href="/guide/">Guide</Link>
          <Link href="/leaderboard/">Leaderboard</Link>
        </nav>

        <address className="footer-contact">
          <a href={LOCATION_URL} target="_blank" rel="noopener noreferrer">
            <IconMapPin size={20} aria-hidden="true" />
            {LOCATION}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Image
              className="outlook-color-icon"
              src={asset("/icons/outlook-color.svg")}
              width={20}
              height={20}
              alt=""
            />
            {CONTACT_EMAIL}
          </a>
        </address>
        <p className="footer-disclaimer">© 2026 {FULL_NAME}</p>
        <p className="footer-links">
          <Link href="/about/#connect">Join the club</Link>
          <Link href="/about/#notes">Club notes</Link>
        </p>
      </div>
    </footer>
  );
}
