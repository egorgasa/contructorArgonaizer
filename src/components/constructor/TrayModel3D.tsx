"use client";

import { useMemo } from "react";
import { computeOrganizerGeometry } from "./OrganizerModel3D";
import type { AppearanceMaterial } from "./useAppearanceMaterial";

interface TrayModel3DProps {
  widthMm: number;
  depthMm: number;
  /**
   * For trays the user-entered height drives the side-wall height directly —
   * a tray is, geometrically, a box with low walls, and the "lowness" lives
   * in the user's input rather than a hard-coded factor.
   */
  heightMm: number;
  wallThicknessMm: number;
  /** Shared material accessor — see `useAppearanceMaterial` for role rules. */
  material: AppearanceMaterial;
}

/**
 * Approximate tray: a floor with four short side walls and an open top.
 *
 * Geometry is the same as BoxModel3D — they share computeOrganizerGeometry —
 * but kept as a separate file so future layers can differentiate the look
 * (e.g. slightly outward-sloping walls or a rounded inner pocket) without
 * touching the closed-box path. Each face uses a role-specific material so
 * pattern placement targets the right surfaces.
 */
export function TrayModel3D({
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  material,
}: TrayModel3DProps) {
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
      <mesh position={[0, g.floor.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[g.W, g.t, g.D]} />
        <meshStandardMaterial {...material.forRole("floor")} />
      </mesh>
      <mesh position={[0, g.wall.y, g.D / 2 - g.t / 2]} castShadow receiveShadow>
        <boxGeometry args={[g.W, g.wall.h, g.t]} />
        <meshStandardMaterial {...material.forRole("wall_front")} />
      </mesh>
      <mesh position={[0, g.wall.y, -(g.D / 2 - g.t / 2)]} castShadow receiveShadow>
        <boxGeometry args={[g.W, g.wall.h, g.t]} />
        <meshStandardMaterial {...material.forRole("wall_back")} />
      </mesh>
      <mesh position={[-(g.W / 2 - g.t / 2), g.wall.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[g.t, g.wall.h, g.D - 2 * g.t]} />
        <meshStandardMaterial {...material.forRole("wall_left")} />
      </mesh>
      <mesh position={[g.W / 2 - g.t / 2, g.wall.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[g.t, g.wall.h, g.D - 2 * g.t]} />
        <meshStandardMaterial {...material.forRole("wall_right")} />
      </mesh>
    </group>
  );
}
