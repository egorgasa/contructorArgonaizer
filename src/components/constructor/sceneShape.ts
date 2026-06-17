"use client";

import * as THREE from "three";
import type { BaseShapeKind } from "@/lib/design";

/**
 * Shared top-view footprint sampler for the 3D preview. Returns a closed
 * silhouette polygon (centered at origin) in the local XY plane, where x spans
 * width and y spans depth. Units are scene units (already scaled).
 *
 * One source of truth so the extruded body (`SceneBody3D`), the schematic
 * overlays (`SceneOverlays3D`) and the lid (`Lid3D`) all trace the exact same
 * outline for a given base shape — no per-shape drift between layers.
 */
export function outlinePoints(
  kind: BaseShapeKind,
  W: number,
  D: number,
  r: number,
): THREE.Vector2[] {
  const hw = W / 2;
  const hd = D / 2;

  if (kind === "circle" || kind === "oval") {
    const rx = kind === "circle" ? Math.min(hw, hd) : hw;
    const ry = kind === "circle" ? Math.min(hw, hd) : hd;
    const seg = 48;
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector2(rx * Math.cos(a), ry * Math.sin(a)));
    }
    return pts;
  }

  if (kind === "roundedRectangle" || kind === "pill") {
    const rr = Math.min(r, hw, hd);
    if (rr <= 0) return rectPoints(hw, hd);
    const seg = 8;
    const pts: THREE.Vector2[] = [];
    const arc = (cx: number, cy: number, start: number, end: number) => {
      for (let i = 0; i <= seg; i++) {
        const a = start + (end - start) * (i / seg);
        pts.push(new THREE.Vector2(cx + rr * Math.cos(a), cy + rr * Math.sin(a)));
      }
    };
    arc(hw - rr, -hd + rr, -Math.PI / 2, 0); // bottom-right
    arc(hw - rr, hd - rr, 0, Math.PI / 2); // top-right
    arc(-hw + rr, hd - rr, Math.PI / 2, Math.PI); // top-left
    arc(-hw + rr, -hd + rr, Math.PI, 1.5 * Math.PI); // bottom-left
    return pts;
  }

  // rectangle / custom → plain bounding rectangle.
  return rectPoints(hw, hd);
}

export function rectPoints(hw: number, hd: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(-hw, -hd),
    new THREE.Vector2(hw, -hd),
    new THREE.Vector2(hw, hd),
    new THREE.Vector2(-hw, hd),
  ];
}
