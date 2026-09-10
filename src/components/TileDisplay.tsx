"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { TileBody, TileLights, TILE_D } from "./Tile3D";

function Display({
  texture,
  turn,
  onReady,
}: {
  texture: THREE.Texture;
  turn: number;
  onReady: () => void;
}) {
  const tile = useRef<THREE.Group>(null);
  const reported = useRef(false);
  useFrame((state, delta) => {
    if (!reported.current) {
      reported.current = true;
      onReady();
    }
    if (!tile.current) return;
    const target = turn === 0 ? -0.32 : (turn * Math.PI) / 2;
    tile.current.rotation.y = THREE.MathUtils.damp(
      tile.current.rotation.y,
      target,
      7,
      delta,
    );
    tile.current.rotation.x = THREE.MathUtils.damp(
      tile.current.rotation.x,
      0.12,
      7,
      delta,
    );
    if (
      Math.abs(tile.current.rotation.y - target) > 0.001 ||
      Math.abs(tile.current.rotation.x - 0.12) > 0.001
    )
      state.invalidate();
  });
  return (
    <group ref={tile} rotation={[0.12, -0.32, -0.09]}>
      <TileBody />
      <mesh position={[0, 0, TILE_D / 2 + 0.002]}>
        <planeGeometry args={[0.92, 1.3]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function TileDisplay({
  artwork,
  selected,
  turn,
  onReady,
}: {
  artwork: RefObject<SVGSVGElement | null>;
  selected: number;
  turn: number;
  onReady: () => void;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!artwork.current) return;
    let disposed = false;
    const colours = getComputedStyle(document.documentElement);
    const svg = new XMLSerializer()
      .serializeToString(artwork.current)
      .replace(/var\((--[\w-]+)\)/g, (_, name) =>
        colours.getPropertyValue(name).trim(),
      );
    const loaded = new THREE.TextureLoader().load(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      (value) => {
        if (disposed) {
          value.dispose();
          return;
        }
        value.colorSpace = THREE.SRGBColorSpace;
        value.anisotropy = 8;
        setTexture(value);
      },
    );
    return () => {
      disposed = true;
      loaded.dispose();
    };
  }, [artwork, selected]);
  if (!texture) return null;
  return (
    <Canvas
      className="showcase-canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.25, 4], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
    >
      <TileLights />
      <Display texture={texture} turn={turn} onReady={onReady} />
      <ContactShadows
        position={[0, -0.91, 0]}
        opacity={0.28}
        scale={5}
        blur={2.8}
        far={3}
        resolution={256}
      />
    </Canvas>
  );
}
