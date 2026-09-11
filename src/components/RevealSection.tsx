"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useReducedMotion,
  useTransform,
} from "motion/react";

/** One cross-browser timeline drives both the rolling tile and its heading. */
export default function RevealSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.4"],
  });
  const progress = useTransform(scrollYProgress, (value) =>
    reduce ? 1 : value,
  );
  return (
    <motion.section
      className="section section-reveal"
      aria-labelledby={id}
      style={{ "--progress": progress } as import("motion/react").MotionStyle}
    >
      <div className="section-wrap">
        <div ref={ref} className="rolling-heading">
          {lead}
          <h2 className="section-title section-title-reveal" id={id}>
            {title}
          </h2>
        </div>
        <div className="meeting-layout">{children}</div>
      </div>
    </motion.section>
  );
}
