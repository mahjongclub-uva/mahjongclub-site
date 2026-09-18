import type { ReactNode } from "react";

/** Full-bleed section; content stays inside the reading column. */
export default function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section" aria-labelledby={id}>
      <div className="section-wrap">
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
