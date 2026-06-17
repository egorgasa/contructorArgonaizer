"use client";

import { useMemo } from "react";
import type { AppearanceMaterial } from "./useAppearanceMaterial";

/**
 * Scale factor: 1 mm = 0.01 Three.js units. Keeping this constant across all
 * product models means dimensions, wall thickness and the camera-fitting logic
 * in ModelViewer3D all share the same units of measure.
 */
export const SCALE_FACTOR = 0.01;

/**
 * Minimum visual wall thickness in millimetres. Very thin walls (the user can
 * enter values close to 1 mm) can disappear or shimmer at typical viewport
 * sizes — we exaggerate slightly so the form stays legible.
 */
const VISUAL_WALL_MM_MIN = 1.5;

interface OrganizerModel3DProps {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  /** Total compartments. 0 or 1 disables interior dividers. */
  sectionsCount: number;
  /** Shared material accessor — picks per-role / per-placement material props
   *  so the pattern texture only lands on the faces the user selected. */
  material: AppearanceMaterial;
}

/**
 * Approximate organizer: a 5-sided open-top tray (floor + 4 outer walls) plus
 * interior dividers laid out on a ceil(sqrt(N)) x ceil(N/cols) grid when more
 * than one section is requested.
 *
 * Geometry is intentionally a composite of axis-aligned BoxGeometries — no
 * boolean ops, no rounded corners. The corner-radius parameter is preserved
 * in the form/2D layer but ignored here per Layer 4 requirements.
 *
 * Each mesh asks the shared `material` for its own role-aware props. That
 * gives placement-aware patterning (front / sides / top / all) for free while
 * preserving R3F's in-place material mutation — only the props for affected
 * faces change between renders.
 */
export function OrganizerModel3D({
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  sectionsCount,
  material,
}: OrganizerModel3DProps) {
  const geometry = useMemo(
    () =>
      computeOrganizerGeometry({
        widthMm,
        depthMm,
        heightMm,
        wallThicknessMm,
        sectionsCount,
      }),
    [widthMm, depthMm, heightMm, wallThicknessMm, sectionsCount],
  );

  return (
    <group>
      {/* Floor. Plays the role of "top" face for pattern placement: when the
          user looks down into the open container the floor is the dominant
          horizontal surface. */}
      <mesh position={[0, geometry.floor.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[geometry.W, geometry.t, geometry.D]} />
        <meshStandardMaterial {...material.forRole("floor")} />
      </mesh>

      {/* Front wall (positive Z). */}
      <mesh
        position={[0, geometry.wall.y, geometry.D / 2 - geometry.t / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[geometry.W, geometry.wall.h, geometry.t]} />
        <meshStandardMaterial {...material.forRole("wall_front")} />
      </mesh>
      {/* Back wall (negative Z). */}
      <mesh
        position={[0, geometry.wall.y, -(geometry.D / 2 - geometry.t / 2)]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[geometry.W, geometry.wall.h, geometry.t]} />
        <meshStandardMaterial {...material.forRole("wall_back")} />
      </mesh>
      {/* Left wall (negative X). */}
      <mesh
        position={[-(geometry.W / 2 - geometry.t / 2), geometry.wall.y, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[geometry.t, geometry.wall.h, geometry.D - 2 * geometry.t]} />
        <meshStandardMaterial {...material.forRole("wall_left")} />
      </mesh>
      {/* Right wall (positive X). */}
      <mesh
        position={[geometry.W / 2 - geometry.t / 2, geometry.wall.y, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[geometry.t, geometry.wall.h, geometry.D - 2 * geometry.t]} />
        <meshStandardMaterial {...material.forRole("wall_right")} />
      </mesh>

      {/* Inner vertical dividers (parallel to depth axis). Dividers count as
          "divider" role — they're patterned only under placement: all. */}
      {geometry.dividers.vertical.map((x, i) => (
        <mesh
          key={`v-${i}`}
          position={[x, geometry.divider.y, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[geometry.t, geometry.divider.h, geometry.D - 2 * geometry.t]} />
          <meshStandardMaterial {...material.forRole("divider")} />
        </mesh>
      ))}

      {/* Inner horizontal dividers (parallel to width axis). */}
      {geometry.dividers.horizontal.map((z, j) => (
        <mesh
          key={`h-${j}`}
          position={[0, geometry.divider.y, z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[geometry.W - 2 * geometry.t, geometry.divider.h, geometry.t]} />
          <meshStandardMaterial {...material.forRole("divider")} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pure dimension math, factored out so BoxModel3D can reuse the wall/floor
 * layout without duplicating the conversions. Returns scene-unit values plus
 * the divider X / Z positions when relevant.
 */
export function computeOrganizerGeometry({
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  sectionsCount,
}: {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  sectionsCount: number;
}) {
  const W = Math.max(widthMm, 1) * SCALE_FACTOR;
  const D = Math.max(depthMm, 1) * SCALE_FACTOR;
  const H = Math.max(heightMm, 1) * SCALE_FACTOR;
  const t = Math.max(wallThicknessMm, VISUAL_WALL_MM_MIN) * SCALE_FACTOR;

  // Walls rest on top of the floor; their height is the full H minus the floor.
  const wallHeight = Math.max(H - t, t);

  const vertical: number[] = [];
  const horizontal: number[] = [];
  if (sectionsCount > 1) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(sectionsCount)));
    const rows = Math.max(1, Math.ceil(sectionsCount / cols));
    for (let i = 1; i < cols; i++) {
      vertical.push(-W / 2 + (W * i) / cols);
    }
    for (let j = 1; j < rows; j++) {
      horizontal.push(-D / 2 + (D * j) / rows);
    }
  }

  return {
    W,
    D,
    H,
    t,
    floor: { y: t / 2 },
    wall: { y: t + wallHeight / 2, h: wallHeight },
    divider: { y: t + wallHeight / 2, h: wallHeight },
    dividers: { vertical, horizontal },
  };
}
