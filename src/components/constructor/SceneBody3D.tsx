"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { effectiveCornerRadius, type BaseShapeKind } from "@/lib/design";
import type { ConstructorVisualScene, VisualPartition } from "@/lib/constructor-visual-scene";
import { SCALE_FACTOR } from "./OrganizerModel3D";
import { outlinePoints } from "./sceneShape";
import type {
  AppearanceMaterial,
  AppearanceMaterialProps,
} from "./useAppearanceMaterial";

/**
 * Shape-driven outer body for the 3D preview.
 *
 * Unlike the legacy productType-specific meshes (which were always axis-aligned
 * boxes), this builds the body from `scene.baseShape` so circle / oval / pill /
 * roundedRectangle render as the chosen footprint instead of a rectangular box.
 *
 * Geometry is an honest approximation — an extruded silhouette, no CAD/CSG:
 *   • walls: the outer footprint with an inner footprint punched out (a ring),
 *     extruded the full height → an open-top container following the shape;
 *   • floor: a thin extruded slab of the full footprint at the bottom;
 *   • dividers: schematic interior planes derived from `scene.sections`, clipped
 *     to the footprint chord so they don't poke out of round shapes.
 *
 * The open top keeps interior detail (dividers, hole recesses, cutouts) visible,
 * matching how the old box/tray/organizer bodies read. Material comes from the
 * shared `useAppearanceMaterial` accessor so colour / finish / pattern stay live.
 */
const VISUAL_WALL_MM_MIN = 1.5;

export interface SceneBody3DProps {
  scene: ConstructorVisualScene;
  /** Vertical (3rd) axis in mm — not carried by the top-view base shape. */
  heightMm: number;
  wallThicknessMm: number;
  /** Shared, placement-aware material accessor. */
  material: AppearanceMaterial;
}

export function SceneBody3D({
  scene,
  heightMm,
  wallThicknessMm,
  material,
}: SceneBody3DProps) {
  const { baseShape, sections } = scene;
  const kind = baseShape.kind;

  const W = Math.max(baseShape.widthMm, 1) * SCALE_FACTOR;
  const D = Math.max(baseShape.heightMm, 1) * SCALE_FACTOR;
  const H = Math.max(heightMm, 1) * SCALE_FACTOR;
  const t = Math.max(wallThicknessMm, VISUAL_WALL_MM_MIN) * SCALE_FACTOR;
  const r = effectiveCornerRadius(baseShape) * SCALE_FACTOR;
  const minSide = Math.min(W, D);

  // Walls (open-top ring) + floor cap. Built imperatively so we can punch the
  // inner footprint hole for the cavity and support rounded / elliptical
  // outlines. Disposed on change / unmount so GPU buffers aren't leaked.
  const geom = useMemo(() => {
    const outer = new THREE.Shape(outlinePoints(kind, W, D, r));

    // Inner footprint (cavity). Skipped when the wall is too thick relative to
    // the part — then the body is a solid extruded silhouette (still shape
    // correct, just not hollow).
    const innerW = W - 2 * t;
    const innerD = D - 2 * t;
    const hollow = innerW > minSide * 0.1 && innerD > minSide * 0.1;
    if (hollow) {
      const innerR = Math.max(r - t, 0);
      const hole = new THREE.Path(outlinePoints(kind, innerW, innerD, innerR));
      outer.holes.push(hole);
    }

    const walls = new THREE.ExtrudeGeometry(outer, {
      depth: H,
      bevelEnabled: false,
    });

    const floorShape = new THREE.Shape(outlinePoints(kind, W, D, r));
    const floor = new THREE.ExtrudeGeometry(floorShape, {
      depth: t,
      bevelEnabled: false,
    });

    return { walls, floor };
  }, [kind, W, D, H, r, t, minSide]);

  useEffect(() => {
    return () => {
      geom.walls.dispose();
      geom.floor.dispose();
    };
  }, [geom]);

  // ExtrudeGeometry assigns material group 0 to the front/back caps (rim) and
  // group 1 to the side surfaces. Sides are the dominant wall surface → use the
  // wall role so front/sides/all pattern placements land there; caps (the floor
  // top + rim) use the floor role so the top placement reads.
  const wallSide = material.forRole("wall_front");
  const capRim = material.forRole("misc");
  const floorTop = material.forRole("floor");

  // Divider planes from the section model, clipped to the footprint.
  const planeT = Math.max(t, minSide * 0.01);
  const dividerH = Math.max(H - t, t);
  const dividerY = t + dividerH / 2;

  return (
    <group>
      {/* Floor slab (full footprint) at the bottom. */}
      <mesh
        geometry={geom.floor}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial attach="material-0" {...floorTop} />
        <meshStandardMaterial attach="material-1" {...wallSide} />
      </mesh>

      {/* Open-top walls following the chosen footprint. */}
      <mesh
        geometry={geom.walls}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial attach="material-0" {...capRim} />
        <meshStandardMaterial attach="material-1" {...wallSide} />
      </mesh>

      {/* Schematic interior dividers, sized to the footprint chord. */}
      {sections.partitions.map((p) => (
        <DividerPlane
          key={p.id}
          partition={p}
          kind={kind}
          W={W}
          D={D}
          planeT={planeT}
          height={dividerH}
          y={dividerY}
          materialProps={material.forRole("divider")}
        />
      ))}
    </group>
  );
}

/**
 * One interior partition plane. Vertical walls sit at a normalized x and span
 * the depth; horizontal walls sit at a normalized z and span the width. For
 * circle / oval the span is the ellipse chord at that offset, so the plane
 * stays inside the curved footprint instead of poking out.
 */
function DividerPlane({
  partition,
  kind,
  W,
  D,
  planeT,
  height,
  y,
  materialProps,
}: {
  partition: VisualPartition;
  kind: BaseShapeKind;
  W: number;
  D: number;
  planeT: number;
  height: number;
  y: number;
  materialProps: AppearanceMaterialProps;
}) {
  const vertical = partition.orientation === "vertical";

  if (vertical) {
    const x = (partition.position - 0.5) * W;
    const span = chord(kind, x, W, D); // depth span at this x
    return (
      <mesh position={[x, y, 0]}>
        <boxGeometry args={[planeT, height, span]} />
        <meshStandardMaterial {...materialProps} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    );
  }

  const z = (partition.position - 0.5) * D;
  const span = chord(kind, z, D, W); // width span at this z
  return (
    <mesh position={[0, y, z]}>
      <boxGeometry args={[span, height, planeT]} />
      <meshStandardMaterial {...materialProps} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

/**
 * Span of the footprint perpendicular to an axis at a signed offset along it.
 * `offset` runs along `alongFull`; the returned span is measured across
 * `crossFull`. For round shapes this is the ellipse chord; everything else uses
 * the full cross extent (rounded corners are a negligible over-draw).
 */
function chord(
  kind: BaseShapeKind,
  offset: number,
  alongFull: number,
  crossFull: number,
): number {
  if (kind === "circle" || kind === "oval") {
    const rAlong = kind === "circle" ? Math.min(alongFull, crossFull) / 2 : alongFull / 2;
    const rCross = kind === "circle" ? Math.min(alongFull, crossFull) / 2 : crossFull / 2;
    if (rAlong <= 0) return crossFull;
    const frac = Math.max(-1, Math.min(1, offset / rAlong));
    return Math.max(2 * rCross * Math.sqrt(1 - frac * frac), crossFull * 0.05);
  }
  return crossFull;
}
