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
  halftone = false,
  children,
}: {
  id: string;
  title: string;
  /** Lays a faint field of dots behind the section. Decorative, opt-in. */
  halftone?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={halftone ? "section section-halftone" : "section"}
      aria-labelledby={id}
    >
      <div className="section-wrap">
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
