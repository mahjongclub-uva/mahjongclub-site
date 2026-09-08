"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TileBody, TileLights, TILE_W, cssVar } from "@/components/Tile3D";

/**
 * Thicker than the wordmark's tiles. A real tile is roughly 20 x 30 x 15mm —
 * genuinely chunky — which looks heavy repeated seven times but correct on a
 * single tile shown by itself.
 */
const DEPTH = 0.62;

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

function Tile({
  active,
  pointer,
  onReady,
}: {
  active: boolean;
  pointer: React.RefObject<{ x: number; y: number }>;
  onReady?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const texture = useMarkTexture();
  const { invalidate } = useThree();
  const announced = useRef(false);

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    // Front-facing at rest. On hover or keyboard focus it makes one deliberate
    // turn and lifts toward you — a single settled gesture rather than
    // following the pointer around, which never settles and reads as jitter.
    //
    // Leans toward the pointer in whichever direction it happens to be —
    // pointer.x drives the vertical axis, pointer.y the horizontal one, so the
    // tile pivots on any corner or edge rather than one fixed hinge.
    //
    // Signs: a positive rotation.y brings the LEFT edge forward, so the tile
    // must turn the same sign as pointer.x to lean toward the cursor. A
    // positive rotation.x brings the TOP forward, so y is negated.
    const reach = 0.34;
    const { x, y } = active ? pointer.current : { x: 0, y: 0 };
    const targetY = x * reach;
    const targetX = -y * reach * 0.7;
    const targetZ = active ? 0.5 : 0;

    g.rotation.y += (targetY - g.rotation.y) * 0.12;
    g.rotation.x += (targetX - g.rotation.x) * 0.12;
    g.position.z += (targetZ - g.position.z) * 0.12;

    // frameloop is "demand", so keep asking for frames until it has settled.
    if (
      Math.abs(targetY - g.rotation.y) > 0.0005 ||
      Math.abs(targetX - g.rotation.x) > 0.0005 ||
      Math.abs(targetZ - g.position.z) > 0.0005
    ) {
      invalidate();
    }

    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
  });

  return (
    <group ref={group}>
      <TileBody depth={DEPTH} />
      <mesh position={[0, 0, DEPTH * 0.5 + 0.004]}>
        <planeGeometry args={[TILE_W * 0.78, TILE_W * 0.78]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function InstagramTileScene({
  active = false,
  pointer,
  onReady,
}: {
  active?: boolean;
  pointer: React.RefObject<{ x: number; y: number }>;
  onReady?: () => void;
}) {
  return (
    <Canvas
      /* Continuous only while it is being pointed at. The rest of the time
         there is nothing moving, and a permanent render loop for a 64px mark
         would cost battery for nothing. */
      frameloop={active ? "always" : "demand"}
      dpr={[1, 2]}
      /* A moderate lens, raised a little and aimed back at the tile. Long
         enough that turning it does not stretch the near edge, short enough
         that you can still see it has a body — and the slight height reveals
         the top face without rotating the tile off square. */
      camera={{ position: [0, 0.85, 6.1], fov: 21 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl, camera }) => {
        gl.setClearAlpha(0);
        camera.lookAt(0, 0, 0);
        setTimeout(() => onReady?.(), 0);
      }}
    >
      <TileLights />
      <Tile active={active} pointer={pointer} onReady={onReady} />
    </Canvas>
  );
}
