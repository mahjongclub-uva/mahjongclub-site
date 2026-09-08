"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

/**
 * The wordmark as real geometry.
 *
 * CSS can only compose flat planes, so a tile there is a rounded front face
 * with square slabs behind it. Here each tile is an actual rounded, bevelled
 * solid, lit properly and casting a real shadow — which is the thing the
 * drawn version could only approximate.
 *
 * This never carries the club's name for accessibility. The <h1> underneath
 * stays in the DOM with the letters as text; this sits on top of it purely as
 * decoration, and if WebGL is unavailable the CSS wordmark simply stays
 * visible.
 */

const WORD = "MAHJONG";
const TILE_W = 1;
const TILE_H = 1.41;
const TILE_D = 0.42;
const GAP = 0.09;

/** Draws a letter to a canvas and hands it back as a texture. */
function useLetterTextures(letters: string[]) {
  return useMemo(() => {
    return letters.map((letter) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 362;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reads the face colours straight off the page, so the scene and the
      // CSS version cannot drift apart.
      const css = getComputedStyle(document.documentElement);
      ctx.fillStyle = css.getPropertyValue("--tile-letter").trim() || "#9d302b";
      ctx.font = `600 150px ${css.getPropertyValue("--serif").trim() || "serif"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(letter, canvas.width / 2, canvas.height / 2 + 6);
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      return texture;
    });
  }, [letters]);
}

type BeatProps = { index: number; letter: string; texture: THREE.Texture };

function Tile({ index, texture }: BeatProps) {
  const group = useRef<THREE.Group>(null);

  // R3F's clock, so every tile runs off one timeline rather than each
  // capturing its own start time.
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.getElapsedTime();

    // Beat one: rise and settle.
    const rise = clamp((t - index * 0.07) / 0.55);
    g.position.y = -0.5 * (1 - easeOut(rise));
    // Beat two: the flip, once the rise is mostly done.
    const flip = clamp((t - 0.52 - index * 0.15) / 0.9);
    g.rotation.y = Math.PI * (1 - easeInOut(flip));
  });

  return (
    <group ref={group}>
      {/* A real tile is an ivory block bonded to a green backing, sharing one
          footprint — not a slab with something stuck behind it. Two rounded
          boxes stacked in z give exactly that: ivory from the front, jade
          from the back, and the seam visible along the edge. */}
      <RoundedBox
        args={[TILE_W, TILE_H, TILE_D * 0.72]}
        radius={0.075}
        smoothness={6}
        position={[0, 0, TILE_D * 0.14]}
      >
        <meshPhysicalMaterial
          color="#f7f4ec"
          roughness={0.24}
          metalness={0}
          clearcoat={0.9}
          clearcoatRoughness={0.18}
          sheen={0.4}
          sheenColor="#fff8ea"
        />
      </RoundedBox>

      <RoundedBox
        args={[TILE_W, TILE_H, TILE_D * 0.34]}
        radius={0.075}
        smoothness={6}
        position={[0, 0, -TILE_D * 0.33]}
      >
        <meshPhysicalMaterial
          color="#33705d"
          roughness={0.35}
          metalness={0}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
        />
      </RoundedBox>

      {/* The letter, floating a hair proud of the face so it never z-fights. */}
      <mesh position={[0, 0, TILE_D * 0.5 + 0.004]}>
        <planeGeometry args={[TILE_W * 0.82, TILE_H * 0.82]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Leans the whole row toward the pointer, as the CSS version does. */
function Row({ letters }: { letters: string[] }) {
  const group = useRef<THREE.Group>(null);
  const textures = useLetterTextures(letters);
  const { pointer } = useThree();

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (pointer.x * 0.16 - g.rotation.y) * 0.06;
    g.rotation.x += (-pointer.y * 0.1 - g.rotation.x) * 0.06;
  });

  const span = letters.length * (TILE_W + GAP) - GAP;

  return (
    <group ref={group}>
      {letters.map((letter, i) => (
        <group key={i} position={[i * (TILE_W + GAP) - span / 2 + TILE_W / 2, 0, 0]}>
          <Tile index={i} letter={letter} texture={textures[i]} />
        </group>
      ))}
    </group>
  );
}

/** Fires once the scene has actually drawn a frame. */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady?.();
  });
  return null;
}

export default function TileScene({ onReady }: { onReady?: () => void }) {
  const letters = useMemo(() => WORD.split(""), []);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <Canvas
      className="tile-canvas"
      dpr={[1, 2]}
      camera={{ position: [0, 0.15, 6.4], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
      onError={() => setFailed(true)}
    >
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#fffaf0", "#c8cbbe", 1.1]} />
      <directionalLight position={[-3.5, 5, 5]} intensity={2.2} />
      <directionalLight position={[4, 1.5, 3]} intensity={0.7} />

      {/* Built locally out of light shapes, so the clearcoat has highlights to
          catch without fetching an HDR from anywhere. frames={1} bakes it once
          rather than re-rendering the probe every frame. */}
      <Environment resolution={256} frames={1}>
        <Lightformer position={[0, 3, 3]} scale={[8, 3, 1]} intensity={2.4} color="#fffaf0" />
        <Lightformer position={[-4, 1, 2]} scale={[3, 4, 1]} intensity={1.3} color="#eef3ff" />
        <Lightformer position={[4, -1, 2]} scale={[3, 3, 1]} intensity={0.9} color="#fff2dd" />
      </Environment>
      <Row letters={letters} />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
