import Link from "next/link";
import { FULL_NAME } from "@/lib/site";

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
          {FULL_NAME}. All rights reserved.
        </p>

        <p className="footer-links">
          <Link href="/about/#connect">Join the club</Link>
          <Link href="/about/#notes">Club notes</Link>
        </p>
      </div>
    </footer>
  );
}
