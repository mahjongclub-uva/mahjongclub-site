"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { TileBody, TileLights, TILE_W, TILE_H, TILE_D, cssVar } from "@/components/Tile3D";
import * as THREE from "three";

import { WORDMARK } from "@/lib/site";
const GAP = 0.09;

/** Draws a letter to a canvas and hands it back as a texture. */
function useLetterTextures(letters: string[]) {
  const textures = useMemo(() => {
    return letters.map((letter) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 362;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reads face colours off the page so the scene and CSS can't drift apart.
      ctx.fillStyle = cssVar("--tile-letter", "#9d302b");
      ctx.font = `700 150px ${cssVar("--body", "sans-serif")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(letter, canvas.width / 2, canvas.height / 2 + 6);
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      return texture;
    });
  }, [letters]);
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  return textures;
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
      <TileBody />

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
  const { pointer, viewport } = useThree();

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (pointer.x * 0.16 - g.rotation.y) * 0.06;
    g.rotation.x += (-pointer.y * 0.1 - g.rotation.x) * 0.06;
  });

  const span = letters.length * (TILE_W + GAP) - GAP;

  return (
    <group ref={group} scale={Math.min(1, viewport.width / (span + 0.5))}>
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
  const letters = useMemo(() => WORDMARK.split(""), []);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <Canvas
      className="tile-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.15, 6.4], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0);

      }}
      onError={() => setFailed(true)}
    >
      <TileLights />

      <Row letters={letters} />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
