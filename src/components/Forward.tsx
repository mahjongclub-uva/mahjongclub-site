import Link from "next/link";

/**
 * A moved meeting page. Static export has no server redirects, so the old
 * address (still printed on QR codes) forwards with a meta refresh, which
 * works without JavaScript, and offers a link in case it does not fire.
 */
export default function Forward({ to }: { to: string }) {
  return (
    <div className="meeting-closed">
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <h1>One moment…</h1>
      <p>This page moved. Taking you to the meeting.</p>
      <Link className="meeting-secondary" href={to}>
        Continue
      </Link>
    </div>
  );
}
