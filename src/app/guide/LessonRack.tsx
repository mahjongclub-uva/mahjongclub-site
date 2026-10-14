"use client";

import { useEffect, useState } from "react";
import {
  IconCards,
  IconHandClick,
  IconMessageCircle,
  IconSparkles,
  IconStack2,
  IconTrophy,
} from "@tabler/icons-react";
import styles from "./guide.module.css";

// In the order of a game night. The first tile goes to the very top of the
// page, site navigation included, since Lesson 1 starts right under the title.
const LESSONS = [
  {
    id: "tiles",
    href: "#top",
    name: "Tiles",
    line: "Meet them",
    Icon: IconCards,
  },
  { id: "hand", name: "Goal", line: "5 sets + pair", Icon: IconTrophy },
  {
    id: "setup",
    name: "Setup",
    line: "Break the wall",
    Icon: IconStack2,
    game: true,
  },
  { id: "fuzhou", name: "Gold", line: "And flowers", Icon: IconSparkles },
  {
    id: "turn",
    name: "Turn",
    line: "Draw, discard",
    Icon: IconHandClick,
    game: true,
  },
  {
    id: "calls",
    name: "Calls",
    line: "Claim a tile",
    Icon: IconMessageCircle,
    game: true,
  },
];

/** The lessons as tiles on a rack, pinned at the top; the one you're reading glows. */
export default function LessonRack() {
  const [current, setCurrent] = useState("tiles");
  useEffect(() => {
    // The lesson being read is the last one whose top has passed just under
    // the rack; above all of them, the first.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 160;
      let reading = LESSONS[0].id;
      for (const { id } of LESSONS) {
        const section = document.getElementById(id)?.closest("section");
        if (section && section.getBoundingClientRect().top <= line)
          reading = id;
      }
      setCurrent(reading);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return (
    <nav className={styles.rack} aria-label="Lessons">
      <ol>
        {LESSONS.map(({ id, href, name, line, Icon, game }, i) => (
          <li key={id}>
            <a
              href={href ?? `#${id}`}
              aria-current={current === id ? "location" : undefined}
            >
              <span className={styles.rackNumber} aria-hidden="true">
                {i + 1}
              </span>
              <Icon aria-hidden="true" />
              <strong>{name}</strong>
              <small>{line}</small>
              {game && <span className={styles.rackGame}>Game</span>}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
