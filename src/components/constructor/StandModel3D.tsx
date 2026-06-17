"use client";

import { useMemo } from "react";
import { SCALE_FACTOR } from "./OrganizerModel3D";
import type { AppearanceMaterial } from "./useAppearanceMaterial";

/** Default tilt of the inclined surface when no angle field exists yet. */
const DEFAULT_TILT_DEG = 15;

const VISUAL_WALL_MM_MIN = 1.5;

interface StandModel3DProps {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  /** Optional explicit tilt angle (degrees). Falls back to 15° when omitted. */
  tiltDeg?: number;
  /** Shared material accessor — see `useAppearanceMaterial` for role rules. */
  material: AppearanceMaterial;
}

/**
 * Approximate stand: a low base slab on the floor plus an inclined plate
 * above it, tilted around the X axis by `tiltDeg` (default 15°).
 *
 * The base footprint is `widthMm × depthMm`, kept short (~25% of height) so
 * the tilted surface visually dominates — typical of phone / book stands.
 *
 * Roles: the base slab counts as `base` (matches `placement: top` on a stand,
 * which is the horizontal support pad) and the inclined plate is `plate`
 * (matches both `front` and `sides`, since it's the dominant visible face).
 */
export function StandModel3D({
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  tiltDeg,
  material,
}: StandModel3DProps) {
  const geometry = useMemo(() => {
    const W = Math.max(widthMm, 1) * SCALE_FACTOR;
    const D = Math.max(depthMm, 1) * SCALE_FACTOR;
    const H = Math.max(heightMm, 1) * SCALE_FACTOR;
    const t = Math.max(wallThicknessMm, VISUAL_WALL_MM_MIN) * SCALE_FACTOR;

    // The base is a low slab — 25% of total height, capped so it never gets
    // taller than the inclined plate itself.
    const baseH = Math.min(Math.max(H * 0.25, t * 2), H * 0.5);

    // Plate sits centred at the top of the stand and tilts backward — we
    // tilt around the X axis, so the front edge dips and the back edge rises.
    const plateY = baseH + (H - baseH) * 0.5;
    // Plate is full-width but slightly shorter in depth so the silhouette
    // reads as "thing leaning against something".
    const plateD = D * 0.92;

    const tilt = ((tiltDeg ?? DEFAULT_TILT_DEG) * Math.PI) / 180;

    return {
      base: { W, D, h: baseH, y: baseH / 2 },
      plate: { W, D: plateD, t, y: plateY, tilt },
    };
  }, [widthMm, depthMm, heightMm, wallThicknessMm, tiltDeg]);

  return (
    <group>
      {/* Base slab. */}
      <mesh position={[0, geometry.base.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[geometry.base.W, geometry.base.h, geometry.base.D]} />
        <meshStandardMaterial {...material.forRole("base")} />
      </mesh>

      {/* Inclined plate — rotated around its own X axis so it leans backward. */}
      <mesh
        position={[0, geometry.plate.y, 0]}
        rotation={[-geometry.plate.tilt, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[geometry.plate.W, geometry.plate.t, geometry.plate.D]} />
        <meshStandardMaterial {...material.forRole("plate")} />
      </mesh>
    </group>
  );
}
