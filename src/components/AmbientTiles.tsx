"use client";

import { Dots, Bamboo } from "@/components/TileArtwork";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/** Decorative edge tiles drift with the reader, with no continuous animation. */
export default function AmbientTiles() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const left = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const right = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const turn = useTransform(scrollYProgress, [0, 1], [-15, 12]);
  return (
    <div className="ambient-tiles" aria-hidden="true">
      <motion.span style={reduce ? undefined : { y: left, rotate: turn }} />
      <motion.span style={reduce ? undefined : { y: right }} />
      <motion.span style={reduce ? undefined : { y: left }} />
      <motion.svg
        className="ambient-motif ambient-dots"
        viewBox="0 0 88 124"
        style={reduce ? undefined : { y: right, rotate: turn }}
      >
        <Dots count={3} />
      </motion.svg>
      <motion.svg
        className="ambient-motif ambient-bamboo"
        viewBox="0 0 88 124"
        style={reduce ? undefined : { y: left }}
      >
        <Bamboo count={2} />
      </motion.svg>
      <motion.div
        className="ambient-character"
        style={reduce ? undefined : { y: right }}
      >
        萬
      </motion.div>
    </div>
  );
}
