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
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useTransform(scrollYProgress, (value) =>
    reduce ? 1 : value,
  );
  return (
    <motion.section
      ref={ref}
      className="section section-reveal"
      aria-labelledby={id}
      style={{ "--progress": progress } as import("motion/react").MotionStyle}
    >
      <div className="section-wrap">
        {lead}
        <h2 className="section-title section-title-reveal" id={id}>
          {title}
        </h2>
        <div className="meeting-layout">{children}</div>
      </div>
    </motion.section>
  );
}
