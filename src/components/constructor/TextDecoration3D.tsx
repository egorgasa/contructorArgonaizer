"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { DEFAULT_TEXT_HEX, type TextPlacement } from "@/lib/appearance";
import { SCALE_FACTOR } from "./OrganizerModel3D";

/**
 * How far (mm) to push the text plane out from the chosen face. Three.js
 * depth precision is fine with ~1 µm separations in clip space, but a tangible
 * physical offset avoids z-fighting on lower-precision mobile GPUs and stays
 * invisible at typical viewing distance (1 mm vs. 60–300 mm parts).
 */
const Z_FIGHT_OFFSET_MM = 1.0;

/** Maximum allowed character count — mirrors the Zod schema constraint. */
const MAX_LEN = 40;

export interface TextDecoration3DProps {
  enabled: boolean;
  /** Live form value; `null` / empty results in nothing being rendered. */
  text: string | null | undefined;
  colorHex: string | undefined;
  /** Schema-driven 8..72; treated as millimetres of text height for the preview. */
  size: number | undefined;
  placement: TextPlacement | undefined;
  /** Outer bounding box (mm) used to anchor the text on the chosen face. */
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

/**
 * Live 3D preview of a short text label on the part's outer hull. Uses
 * drei's `<Text>` (Troika SDF text) so the label stays crisp at any zoom
 * level without the rasterisation cost of a Canvas texture.
 *
 * Positioning is anchored to the product's bounding box rather than each
 * model's specific geometry — that lets the same component work for every
 * shape (organizer, box, tray, stand, divider, custom) without per-product
 * placement code. The trade-off: for the stand the bbox is taller than the
 * actual geometry, so the text floats slightly above the inclined plate
 * rather than sitting flush. That's acceptable for a preview.
 *
 * Important: this is *not* engraving. It's a visual hint to the user — and
 * to the operator who reviews the request — about where the requested label
 * should go. The Zod schema rejects empty text when `enabled` so a properly-
 * submitted request always carries a valid label.
 */
export function TextDecoration3D({
  enabled,
  text,
  colorHex,
  size,
  placement,
  widthMm,
  depthMm,
  heightMm,
}: TextDecoration3DProps) {
  const trimmed = (text ?? "").trim();

  // Layout is memoised independently of the text so font kerning re-runs only
  // when geometry / size / placement change — typing into the text field
  // doesn't reflow the entire bounding box math.
  const layout = useMemo(() => {
    const W = Math.max(widthMm, 1) * SCALE_FACTOR;
    const D = Math.max(depthMm, 1) * SCALE_FACTOR;
    const H = Math.max(heightMm, 1) * SCALE_FACTOR;
    const off = Z_FIGHT_OFFSET_MM * SCALE_FACTOR;

    // size value from form is treated as millimetres of glyph height.
    // SCALE_FACTOR keeps it in the same unit system as the geometry.
    const sizeMm = Math.max(typeof size === "number" ? size : 16, 4);
    const fontSize = sizeMm * SCALE_FACTOR;

    // Cap maxWidth so long labels wrap onto the face rather than spilling off.
    const horizontalMaxW = W * 0.9;
    const depthMaxW = D * 0.9;

    const place: TextPlacement = placement ?? "front";

    switch (place) {
      case "front":
        return {
          position: [0, H / 2, D / 2 + off] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          fontSize,
          maxWidth: horizontalMaxW,
        };
      case "back":
        return {
          position: [0, H / 2, -(D / 2 + off)] as [number, number, number],
          // Flip so the front of the glyphs faces -Z (out of the back wall).
          rotation: [0, Math.PI, 0] as [number, number, number],
          fontSize,
          maxWidth: horizontalMaxW,
        };
      case "left":
        return {
          position: [-(W / 2 + off), H / 2, 0] as [number, number, number],
          // Rotate so glyphs face -X.
          rotation: [0, -Math.PI / 2, 0] as [number, number, number],
          fontSize,
          maxWidth: depthMaxW,
        };
      case "right":
        return {
          position: [W / 2 + off, H / 2, 0] as [number, number, number],
          // Rotate so glyphs face +X.
          rotation: [0, Math.PI / 2, 0] as [number, number, number],
          fontSize,
          maxWidth: depthMaxW,
        };
      case "top":
        return {
          position: [0, H + off, 0] as [number, number, number],
          // Lay flat against the top of the bbox, glyphs facing +Y.
          rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
          fontSize,
          maxWidth: Math.min(horizontalMaxW, depthMaxW),
        };
      default:
        return {
          position: [0, H / 2, D / 2 + off] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          fontSize,
          maxWidth: horizontalMaxW,
        };
    }
  }, [widthMm, depthMm, heightMm, size, placement]);

  // Bail out *after* the hook so the hook count stays stable across renders.
  if (!enabled) return null;
  if (!trimmed) return null;

  // Defensive char limit even though Zod enforces it — the form may briefly
  // hold longer input before the user blurs the field.
  const safeText = trimmed.slice(0, MAX_LEN);
  const safeColor = colorHex || DEFAULT_TEXT_HEX;

  return (
    <Text
      position={layout.position}
      rotation={layout.rotation}
      fontSize={layout.fontSize}
      color={safeColor}
      anchorX="center"
      anchorY="middle"
      maxWidth={layout.maxWidth}
      // No outline / no stroke — this is a flat label preview, not a sticker.
      outlineWidth={0}
    >
      {safeText}
    </Text>
  );
}
