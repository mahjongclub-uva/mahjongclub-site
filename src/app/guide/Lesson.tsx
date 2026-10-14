import type { ReactNode } from "react";
import styles from "./guide.module.css";

/** One lesson as a clay card: its number, a short heading with a soft qualifier, then the content. */
export default function Lesson({
  id,
  number,
  title,
  qualifier,
  children,
}: {
  id: string;
  number: number;
  title: string;
  qualifier: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.lesson} aria-labelledby={id}>
      <span className={styles.badge}>Lesson {number}</span>
      <h2 id={id}>
        {title} <span className={styles.qualifier}>{qualifier}</span>
      </h2>
      {children}
    </section>
  );
}
