"use client";

import { useMemo } from "react";
import { computeOrganizerGeometry } from "./OrganizerModel3D";
import type { AppearanceMaterial } from "./useAppearanceMaterial";

interface BoxModel3DProps {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  /** Shared material accessor — see `useAppearanceMaterial` for role rules. */
  material: AppearanceMaterial;
}

/**
 * Approximate box: floor + 4 outer walls with an open top.
 *
 * There's no `hasLid` field on the form yet, so we deliberately leave the
 * top open. Once that field exists, an additional thin slab at y = H - t/2
 * can render a lid; for now keeping the model open keeps interior visible,
 * which is more informative for a configurator.
 *
 * Geometry math is shared with OrganizerModel3D via computeOrganizerGeometry
 * (with sectionsCount = 0 to suppress dividers). Each wall asks the shared
 * `material` for its own role-aware props so pattern placement targets the
 * correct face.
 */
export function BoxModel3D({
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  material,
}: BoxModel3DProps) {
  const g = useMemo(
    () =>
      computeOrganizerGeometry({
        widthMm,
        depthMm,
        heightMm,
        wallThicknessMm,
        sectionsCount: 0,
      }),
    [widthMm, depthMm, heightMm, wallThicknessMm],
  );

  return (
    <group>
      {/* Floor. */}
      <mesh position={[0, g.floor.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[g.W, g.t, g.D]} />
        <meshStandardMaterial {...material.forRole("floor")} />
      </mesh>

      {/* Front wall (positive Z). */}
      <mesh position={[0, g.wall.y, g.D / 2 - g.t / 2]} castShadow receiveShadow>
        <boxGeometry args={[g.W, g.wall.h, g.t]} />
        <meshStandardMaterial {...material.forRole("wall_front")} />
      </mesh>

      {/* Back wall (negative Z). */}
      <mesh position={[0, g.wall.y, -(g.D / 2 - g.t / 2)]} castShadow receiveShadow>
        <boxGeometry args={[g.W, g.wall.h, g.t]} />
        <meshStandardMaterial {...material.forRole("wall_back")} />
      </mesh>

      {/* Left wall (negative X). */}
      <mesh
        position={[-(g.W / 2 - g.t / 2), g.wall.y, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[g.t, g.wall.h, g.D - 2 * g.t]} />
        <meshStandardMaterial {...material.forRole("wall_left")} />
      </mesh>

      {/* Right wall (positive X). */}
      <mesh
        position={[g.W / 2 - g.t / 2, g.wall.y, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[g.t, g.wall.h, g.D - 2 * g.t]} />
        <meshStandardMaterial {...material.forRole("wall_right")} />
      </mesh>
    </group>
  );
}
