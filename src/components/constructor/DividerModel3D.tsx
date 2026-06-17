"use client";

import { useMemo } from "react";
import { SCALE_FACTOR } from "./OrganizerModel3D";
import type { AppearanceMaterial } from "./useAppearanceMaterial";

const VISUAL_WALL_MM_MIN = 1.5;
/** Hard cap on how many plates we'll draw — beyond this it's just noise. */
const MAX_PLATES = 8;

interface DividerModel3DProps {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  /**
   * If > 1, render that many parallel plates; otherwise render a single
   * divider plate. There is no separate `quantity` field on the form today,
   * so we treat sectionsCount as the count of plates.
   */
  sectionsCount: number;
  /** Shared material accessor — see `useAppearanceMaterial` for role rules. */
  material: AppearanceMaterial;
}

/**
 * Approximate divider: one or more thin vertical plates. When sectionsCount
 * exceeds one we evenly distribute that many plates along the X axis, which
 * matches how dividers slot into a drawer in practice.
 *
 * Each plate is `wallThicknessMm × heightMm × depthMm`. All plates share the
 * `plate` role so pattern placement (front / sides) targets them while `top`
 * keeps them un-patterned.
 */
export function DividerModel3D({
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  sectionsCount,
  material,
}: DividerModel3DProps) {
  const { plates, plateGeom } = useMemo(() => {
    const W = Math.max(widthMm, 1) * SCALE_FACTOR;
    const D = Math.max(depthMm, 1) * SCALE_FACTOR;
    const H = Math.max(heightMm, 1) * SCALE_FACTOR;
    // Make the plate a touch thicker than the literal wall thickness so a
    // single thin divider doesn't disappear in the render.
    const t = Math.max(wallThicknessMm, VISUAL_WALL_MM_MIN * 1.5) * SCALE_FACTOR;

    const count = Math.min(Math.max(sectionsCount, 1), MAX_PLATES);

    // Position N plates evenly across the W span, leaving a margin on each
    // side so they don't sit flush with the outer extents.
    const xs: number[] = [];
    if (count === 1) {
      xs.push(0);
    } else {
      const margin = W * 0.08;
      const span = W - 2 * margin;
      for (let i = 0; i < count; i++) {
        xs.push(-W / 2 + margin + (span * i) / (count - 1));
      }
    }

    return {
      plates: xs,
      plateGeom: { t, H, D, y: H / 2 },
    };
  }, [widthMm, depthMm, heightMm, wallThicknessMm, sectionsCount]);

  return (
    <group>
      {plates.map((x, i) => (
        <mesh key={i} position={[x, plateGeom.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[plateGeom.t, plateGeom.H, plateGeom.D]} />
          <meshStandardMaterial {...material.forRole("plate")} />
        </mesh>
      ))}
    </group>
  );
}
