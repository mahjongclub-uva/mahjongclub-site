"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TileBody, TileLights, TILE_W, TILE_H, TILE_D, cssVar } from "@/components/Tile3D";

/**
 * The Instagram mark on a real tile, matching the wordmark.
 *
 * frameloop is "demand": this sits far down the page and has nothing to
 * animate on its own, so it draws once and then only when the pointer moves
 * over it. A second always-on render loop for a decorative 64px mark would
 * cost battery for nothing.
 */

/** The Instagram glyph, drawn to a canvas so it can be a texture. */
function useMarkTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = cssVar("--tile-letter", "#9d302b");
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 15;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.roundRect(46, 46, 164, 164, 48);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(128, 128, 44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(175, 81, 11, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }, []);
}

function Tile({ onReady }: { onReady?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMarkTexture();
  const { pointer, invalidate } = useThree();
  const announced = useRef(false);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // Rest slightly turned, so it reads as an object rather than a picture.
    const targetY = -0.22 + pointer.x * 0.3;
    const targetX = 0.12 + -pointer.y * 0.2;
    g.rotation.y += (targetY - g.rotation.y) * 0.12;
    g.rotation.x += (targetX - g.rotation.x) * 0.12;

    // Keep drawing while it is still settling, then stop.
    if (Math.abs(targetY - g.rotation.y) > 0.001) invalidate();

    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
  });

  return (
    <group ref={group} rotation={[0.12, -0.22, 0]}>
      <TileBody />
      <mesh position={[0, 0, TILE_D * 0.5 + 0.004]}>
        <planeGeometry args={[TILE_W * 0.78, TILE_H * 0.78 * (TILE_W / TILE_H)]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function InstagramTileScene({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.1], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0);
        setTimeout(() => onReady?.(), 0);
      }}
    >
      <TileLights />
      <Tile onReady={onReady} />
    </Canvas>
  );
}
