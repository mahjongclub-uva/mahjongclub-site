import type { ReactNode } from "react";

/**
 * A full-bleed page section.
 *
 * The background spans the whole viewport while the content stays inside the
 * reading column. There is one ground across the site now, so sections are
 * separated by their headings rather than by alternating colour.
 */
export default function Section({
  id,
  title,
  lead,
  reveal = false,
  children,
}: {
  id: string;
  title: string;
  /** Rendered above the heading. Decorative — the rolling dot lives here. */
  lead?: ReactNode;
  /**
   * Uncovers the heading as the section arrives, on a timeline the lead can
   * read too, so the two move together rather than merely near each other.
   */
  reveal?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={reveal ? "section section-reveal" : "section"}
      aria-labelledby={id}
    >
      <div className="section-wrap">
        {lead}
        <h2
          className={reveal ? "section-title section-title-reveal" : "section-title"}
          id={id}
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
