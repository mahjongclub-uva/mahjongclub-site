import Link from "next/link";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { IconMapPin } from "@tabler/icons-react";
import { CONTACT_EMAIL, LOCATION, LOCATION_URL, FULL_NAME } from "@/lib/site";

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
        <p className="footer-disclaimer">
          2026 {FULL_NAME}. All rights reserved.
        </p>

        <address className="footer-contact">
          <a href={LOCATION_URL} target="_blank" rel="noopener noreferrer">
            <IconMapPin size={20} aria-hidden="true" />
            {LOCATION}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Image
              className="outlook-icon"
              src={asset("/icons/outlook.svg")}
              width={20}
              height={20}
              alt=""
            />
            {CONTACT_EMAIL}
          </a>
        </address>
        <p className="footer-links">
          <Link href="/about/#connect">Join the club</Link>
          <Link href="/about/#notes">Club notes</Link>
        </p>
      </div>
    </footer>
  );
}
