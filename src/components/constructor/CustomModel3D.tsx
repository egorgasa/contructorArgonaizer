"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { SCALE_FACTOR } from "./OrganizerModel3D";
import type { AppearanceMaterialProps } from "./useAppearanceMaterial";

/** Hard cap on the placeholder's opacity — even when the user picks an opaque
 *  finish, the bounding box stays see-through so it never looks like a real
 *  geometric prediction. */
const PLACEHOLDER_OPACITY_CAP = 0.5;

interface CustomModel3DProps {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  /** Shared material spec produced by useAppearanceMaterial in ProductModel3D. */
  materialProps: AppearanceMaterialProps;
  /** Caption text — defaults to "Кастомная форма" for the Russian UI. */
  label?: string;
}

/**
 * Placeholder model for custom / unknown shapes. Renders the part's bounding
 * box with a translucent material plus a Html overlay caption.
 *
 * Translucency telegraphs to the user that this is *not* the final shape —
 * we don't want them to mistake a confident-looking solid box for a real
 * geometric prediction. The caption reinforces the message.
 *
 * Unlike the other models, this one **does not** trust `materialProps` fully:
 * the user's colour, roughness and metalness are honoured (so live appearance
 * changes still propagate visually), but `transparent`, `opacity` and
 * `depthWrite` are forced into their placeholder-friendly values regardless
 * of the chosen finish. That keeps the "this is not the real shape" cue
 * intact even when the user picks the matte / glossy / textured finishes
 * (which would otherwise render fully opaque).
 */
export function CustomModel3D({
  widthMm,
  depthMm,
  heightMm,
  materialProps,
  label = "Кастомная форма",
}: CustomModel3DProps) {
  const { W, D, H } = useMemo(() => {
    return {
      W: Math.max(widthMm, 1) * SCALE_FACTOR,
      D: Math.max(depthMm, 1) * SCALE_FACTOR,
      H: Math.max(heightMm, 1) * SCALE_FACTOR,
    };
  }, [widthMm, depthMm, heightMm]);

  // Cap the opacity so even an opaque finish reads as a ghost box; keep the
  // user's choice when they've already gone semi-transparent and dropped
  // below the cap.
  const placeholderOpacity = Math.min(materialProps.opacity, PLACEHOLDER_OPACITY_CAP);

  return (
    <group>
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        {/* Spread the shared spec so colour / roughness / metalness stay live,
            then override the transparency-related fields so the placeholder
            stays a ghost regardless of the finish picker. */}
        <meshStandardMaterial
          {...materialProps}
          transparent
          opacity={placeholderOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Html overlay anchors to the centre of the bounding box. */}
      <Html
        position={[0, H * 0.5, 0]}
        center
        distanceFactor={Math.max(W, D, H) * 4}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(15, 23, 42, 0.78)",
            color: "white",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            letterSpacing: 0.2,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
