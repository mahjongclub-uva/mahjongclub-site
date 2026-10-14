import type { ReactNode } from "react";
import styles from "./guide.module.css";

/** One lesson as a clay card: its number, a short heading, then the content. */
export default function Lesson({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.lesson} aria-labelledby={id}>
      <span className={styles.badge}>Lesson {number}</span>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
