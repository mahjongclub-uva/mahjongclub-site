import type { ReactNode } from "react";

/**
 * A full-bleed page section.
 *
 * The background spans the whole viewport while the content stays inside the
 * reading column — which is what lets consecutive sections sit on different
 * grounds without the page turning into a stack of cards.
 *
 * `tone` picks the ground. Alternate them; two touching sections should never
 * share one.
 */
export default function Section({
  id,
  title,
  tone = "paper",
  children,
}: {
  id: string;
  title: string;
  tone?: "paper" | "sage" | "cream";
  children: ReactNode;
}) {
  return (
    <section className={`section tone-${tone}`} aria-labelledby={id}>
      <div className="section-wrap">
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
