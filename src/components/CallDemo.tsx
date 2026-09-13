"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import PlayingTile from "@/components/PlayingTile";

export default function CallDemo({ kind }: { kind: "pung" | "chow" }) {
  const [joined, setJoined] = useState(false);
  const reducedMotion = useReducedMotion();
  const ranks = kind === "pung" ? [8, 8, 8] : [5, 6, 7];

  return (
    <div className="call-demo">
      <motion.div
        role="group"
        className="tile-row"
        aria-label={kind === "pung" ? "Three eight-dot tiles" : "Five, six and seven bamboo"}
        animate={joined ? "joined" : "apart"}
      >
        {ranks.map((rank, index) => (
            <motion.ul
              key={index}
              style={{ listStyle: "none", padding: 0, margin: 0 }}
              variants={{
                apart: { x: reducedMotion ? 0 : (index - 1) * 10, rotate: reducedMotion ? 0 : (index - 1) * 7 },
                joined: { x: 0, rotate: 0 },
              }}
              transition={{ type: "spring", stiffness: 380, damping: 25, delay: reducedMotion ? 0 : index * 0.045 }}
            >
              <PlayingTile suit={kind === "pung" ? "dots" : "bamboo"} rank={rank} />
            </motion.ul>
        ))}
      </motion.div>
      <motion.button
        type="button"
        className="action-link action-link-primary"
        onClick={() => setJoined(!joined)}
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        aria-pressed={joined}
      >
        {joined ? "Try again" : `Make a ${kind}`}
      </motion.button>
      <span className="call-demo-status" role="status">
        {joined ? (kind === "pung" ? "碰 · Three of a kind." : "吃 · A sequence.") : "Bring the tiles together."}
      </span>
    </div>
  );
}
