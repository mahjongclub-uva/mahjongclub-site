"use client";

import { RoundedBox, Environment, Lightformer } from "@react-three/drei";

/**
 * The tile itself, and the light it sits in.
 *
 * Shared by the wordmark and the Instagram mark so the two cannot drift apart:
 * change the porcelain here and both change.
 */

export const TILE_W = 1;
export const TILE_H = 1.41;
export const TILE_D = 0.42;

/**
 * An ivory block bonded to a jade backing over one footprint, as a tile is.
 *
 * `depth` is adjustable because a row of seven wants to read lighter than a
 * single tile shown on its own — a real tile is about 20 x 30 x 15mm, which is
 * chunkier than looks right repeated across a wordmark.
 */
export function TileBody({ depth = TILE_D }: { depth?: number }) {
  return (
    <>
      <RoundedBox
        args={[TILE_W, TILE_H, depth * 0.72]}
        radius={0.055}
        smoothness={6}
        position={[0, 0, depth * 0.14]}
      >
        <meshPhysicalMaterial
          color="#f7f4ec"
          roughness={0.3}
          metalness={0}
          clearcoat={0.9}
          clearcoatRoughness={0.18}
          sheen={0.4}
          sheenColor="#fff8ea"
        />
      </RoundedBox>

      <RoundedBox
        args={[TILE_W, TILE_H, depth * 0.34]}
        radius={0.055}
        smoothness={6}
        position={[0, 0, -depth * 0.33]}
      >
        <meshPhysicalMaterial
          color="#33705d"
          roughness={0.35}
          metalness={0}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
        />
      </RoundedBox>
    </>
  );
}

/**
 * Lights, plus an environment built here out of light shapes.
 *
 * drei's `preset` environments fetch an HDR from a CDN and suspend the whole
 * canvas until it arrives — which renders nothing at all while looking
 * perfectly healthy. This one is local. frames={1} bakes it once instead of
 * re-rendering the probe every frame.
 */
export function TileLights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#fffaf0", "#c8cbbe", 0.7]} />
      <directionalLight position={[-3.5, 5, 5]} intensity={1.7} />
      <directionalLight position={[4, 1.5, 3]} intensity={0.7} />
      <Environment resolution={256} frames={1}>
        <Lightformer position={[0, 3, 3]} scale={[8, 3, 1]} intensity={2.4} color="#fffaf0" />
        <Lightformer position={[-4, 1, 2]} scale={[3, 4, 1]} intensity={1.3} color="#eef3ff" />
        <Lightformer position={[4, -1, 2]} scale={[3, 3, 1]} intensity={0.9} color="#fff2dd" />
      </Environment>
    </>
  );
}

/** Reads a CSS custom property off the page so the scene matches the page. */
export function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
