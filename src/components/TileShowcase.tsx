"use client";

import WebGLBoundary from "./WebGLBoundary";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Dots, Bamboo } from "@/components/TileArtwork";
import { TileFaceArt } from "@/components/TileArt";

const TileDisplay = dynamic(() => import("./TileDisplay"), { ssr: false });
const SUITS = [
  { name: "Dots", description: "Little circles. A whole lot of possibility." },
  { name: "Bamboo", description: "One bamboo wears feathers. Meet the bird." },
  { name: "Characters", description: "A number above, ten thousand below." },
];

export default function TileShowcase() {
  const [selected, setSelected] = useState(0);
  const [turn, setTurn] = useState(0);
  const [ready, setReady] = useState(false);
  const artwork = useRef<SVGSVGElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInView(stage, { margin: "100px", once: true });
  const reduce = useReducedMotion();
  const onError = useCallback(() => setReady(false), []);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className="tile-showcase" ref={stage}>
      <div className="showcase-viewport" data-ready={ready && !reduce}>
        <div className="showcase-fallback" aria-hidden="true">
          <TileFaceArt />
          <svg
            ref={artwork}
            className="showcase-art"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 88 124"
            width="528"
            height="744"
          >
            {selected === 0 ? (
              <Dots count={1} />
            ) : selected === 1 ? (
              <Bamboo count={1} />
            ) : (
              <>
                <text
                  x="44"
                  y="51"
                  textAnchor="middle"
                  fontSize="37"
                  fontWeight="700"
                  fill="var(--ink)"
                >
                  三
                </text>
                <text
                  x="44"
                  y="95"
                  textAnchor="middle"
                  fontSize="34"
                  fontWeight="700"
                  fill="var(--tile-letter)"
                >
                  萬
                </text>
              </>
            )}
          </svg>
        </div>
        {!reduce && visible && (
          <WebGLBoundary onError={onError}>
            <TileDisplay
              artwork={artwork}
              selected={selected}
              turn={turn}
              onReady={onReady}
            />
          </WebGLBoundary>
        )}
      </div>
      <div className="showcase-controls">
        <div
          className="suit-selector"
          role="group"
          aria-label="Explore tile suits"
        >
          {SUITS.map((suit, i) => (
            <motion.button
              key={suit.name}
              type="button"
              aria-pressed={selected === i}
              onClick={() => {
                setSelected(i);
                setTurn(0);
              }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
            >
              {suit.name}
            </motion.button>
          ))}
        </div>
        <p aria-live="polite">{SUITS[selected].description}</p>
        <div className="showcase-turn">
          {!reduce && ready && (
            <button
              className="turn-tile"
              type="button"
              onClick={() => setTurn((n) => n + 1)}
            >
              Turn the tile <span aria-hidden="true">↻</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
