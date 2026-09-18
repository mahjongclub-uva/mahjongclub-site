"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TileBody, TileLights, TILE_W, cssVar } from "@/components/Tile3D";

/** Thicker than the wordmark's tiles: a real tile is ~20x30x15mm, which
 * looks heavy repeated seven times but correct shown singly. */
const DEPTH = 0.62;

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

    // Front-facing at rest; on hover/focus makes one settled turn toward the
    // cursor rather than tracking it (tracking never settles, reads as
    // jitter). Both axes negate the pointer coordinate so the edge nearest
    // the cursor comes forward: rotation.y and rotation.x both need a
    // negative sign for this, don't "fix" one without the other.
    const reach = 0.34;
    const { x, y } = active ? pointer.current : { x: 0, y: 0 };
    const targetY = -x * reach;
    const targetX = -y * reach * 0.7;
    const targetZ = active ? 0.5 : 0;

    g.rotation.y += (targetY - g.rotation.y) * 0.12;
    g.rotation.x += (targetX - g.rotation.x) * 0.12;
    g.position.z += (targetZ - g.position.z) * 0.12;

    // frameloop is "demand": keep asking for frames until settled.
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
      // Continuous only while pointed at; a permanent loop for a 64px
      // decorative mark would cost battery for nothing.
      frameloop={active ? "always" : "demand"}
      dpr={[1, 2]}
      // Raised and angled back at the tile enough to reveal its top face
      // without stretching the near edge or rotating it off square.
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
