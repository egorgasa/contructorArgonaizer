"use client";

import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import {
  DEFAULT_BASE_HEX,
  DEFAULT_PATTERN_HEX,
  HEX_COLOR_RE,
  type MaterialFinish,
  type PatternPlacement,
} from "@/lib/appearance";
import { createPatternTexture } from "@/lib/patternTexture";
import type { AppearanceInput } from "./ProductModel3D";

/**
 * Per-face role used by leaf models to fetch a placement-aware material spec.
 *
 * `wall_front` is the outer wall on +Z, `wall_back` is -Z, `wall_left` / `_right`
 * are -X / +X respectively. `floor` is the bottom slab, `base` is the supporting
 * pedestal of the stand, `plate` is the dominant inclined / divider plate.
 * Anything that doesn't naturally fit one of these (custom placeholder, future
 * shapes) uses `misc` and only receives the pattern under `placement: all`.
 */
export type MeshRole =
  | "floor"
  | "wall_front"
  | "wall_back"
  | "wall_left"
  | "wall_right"
  | "divider"
  | "plate"
  | "base"
  | "misc";

/**
 * Plain-object material spec consumed by `<meshStandardMaterial {...} />`.
 * Kept as a structural type rather than a THREE.Material instance: react-
 * three-fiber's reconciler will diff these props and mutate the underlying
 * material in place on change, which is cheaper than allocating + disposing
 * material instances on every appearance edit.
 *
 * `map` is optional so non-patterned faces (or all faces when patterns are
 * off) can omit the texture without falling back to a separate prop shape.
 */
export interface AppearanceMaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  map?: THREE.Texture | null;
}

/**
 * Public hook return: a single `forRole` accessor that merges finish-driven
 * material props with the placement-driven pattern texture for the requested
 * mesh role.
 *
 * Why a function and not a per-role object? It keeps the API small and lets
 * future roles (or roles introduced by a new model) just call `forRole(...)`
 * without forcing the hook to know every role up-front.
 */
export interface AppearanceMaterial {
  forRole: (role: MeshRole) => AppearanceMaterialProps;
}

/**
 * Finish → physical material parameter map.
 *
 * Numbers are tuned for a neutral key + ambient light setup in ModelViewer3D.
 * The mapping is intentionally coarse (one value per finish) — that's enough
 * to make the differences obvious in the viewport without trying to simulate
 * the actual physics of PLA / PETG / ABS / TPU (per spec).
 */
const FINISH_PARAMS: Record<
  MaterialFinish,
  Omit<AppearanceMaterialProps, "color" | "map">
> = {
  matte: {
    roughness: 0.85,
    metalness: 0.02,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  },
  glossy: {
    roughness: 0.2,
    metalness: 0.1,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  },
  // Slight roughness bump vs. matte; later layers can swap in a noise map.
  textured: {
    roughness: 0.95,
    metalness: 0.04,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  },
  // Translucent finish — opacity is per-form. depthWrite=false avoids the
  // single-mesh sorting artefacts you'd otherwise see on the back walls
  // of the organizer / tray.
  semi_transparent: {
    roughness: 0.45,
    metalness: 0.05,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  },
};

const DEFAULT_PLACEMENT: PatternPlacement = "all";

/**
 * Whether a given placement decision should paint the pattern onto the
 * specified mesh role. Misses fall through to `false` so unknown / future
 * roles stay un-patterned unless the user explicitly chose `all`.
 */
function placementCoversRole(
  placement: PatternPlacement,
  role: MeshRole,
): boolean {
  switch (placement) {
    case "all":
      return true;
    case "front":
      // The visible "face" of the part — front wall on containers, the
      // inclined surface on a stand.
      return role === "wall_front" || role === "plate";
    case "sides":
      // All vertical wall faces around the perimeter, including front/back —
      // matches the everyday meaning of "по бокам" on a tray-shaped part.
      return (
        role === "wall_left" ||
        role === "wall_right" ||
        role === "wall_front" ||
        role === "wall_back" ||
        role === "plate"
      );
    case "top":
      // Horizontal upper surface. Floors on containers (visible from above
      // through the open top) and base slabs on the stand.
      return role === "floor" || role === "base";
    default:
      return false;
  }
}

/**
 * Compute material props from the form's appearance state.
 *
 * Two layered useMemos:
 *  1. `baseProps` covers finish + colour + opacity. Narrow deps — pattern
 *     changes won't churn this.
 *  2. `patternTexture` is a `CanvasTexture` (or null) built from the pattern
 *     config. Disposed when replaced or on unmount so the WebGL backing
 *     store isn't leaked when the user toggles patterns frequently.
 *
 * The returned `forRole` looks up whether `placement` covers the role and
 * returns the patterned spec for matching roles, or the base spec otherwise.
 * When a texture is attached, the material `color` is forced to white so the
 * canvas pixels (which already include the user's base colour) aren't double-
 * tinted by the material's own colour channel.
 */
export function useAppearanceMaterial(
  appearance: AppearanceInput | undefined,
): AppearanceMaterial {
  const baseColorHex = appearance?.baseColorHex;
  const materialFinish = appearance?.materialFinish;
  const opacity = appearance?.opacity;

  const patternEnabled = appearance?.pattern?.enabled;
  const patternType = appearance?.pattern?.type;
  const patternColorHex = appearance?.pattern?.colorHex;
  const patternScale = appearance?.pattern?.scale;
  const patternOpacity = appearance?.pattern?.opacity;
  const patternPlacement = appearance?.pattern?.placement ?? DEFAULT_PLACEMENT;

  // ─── 1. Finish-driven base props (no texture) ───
  const baseProps = useMemo<AppearanceMaterialProps>(() => {
    const color =
      baseColorHex && HEX_COLOR_RE.test(baseColorHex)
        ? baseColorHex
        : DEFAULT_BASE_HEX;

    const finish: MaterialFinish = materialFinish ?? "matte";
    const params = FINISH_PARAMS[finish] ?? FINISH_PARAMS.matte;

    // Only semi_transparent reads the user's opacity slider — the other
    // finishes are opaque by design so we keep opacity=1 regardless of what's
    // in the form (the slider stays hidden in the UI for those finishes).
    let resolvedOpacity = params.opacity;
    if (finish === "semi_transparent") {
      resolvedOpacity =
        typeof opacity === "number" ? Math.max(0.1, Math.min(1, opacity)) : 1;
    }

    return {
      color,
      roughness: params.roughness,
      metalness: params.metalness,
      transparent: params.transparent,
      opacity: resolvedOpacity,
      depthWrite: params.depthWrite,
      map: null,
    };
  }, [baseColorHex, materialFinish, opacity]);

  // ─── 2. Pattern texture (or null) ───
  //
  // Dependency list is the union of fields that change the canvas pixels —
  // base colour is included because it's painted *into* the canvas before
  // the pattern is stamped on top.
  const resolvedBaseColor =
    baseColorHex && HEX_COLOR_RE.test(baseColorHex)
      ? baseColorHex
      : DEFAULT_BASE_HEX;
  const resolvedPatternColor =
    patternColorHex && HEX_COLOR_RE.test(patternColorHex)
      ? patternColorHex
      : DEFAULT_PATTERN_HEX;

  const patternTexture = useMemo<THREE.Texture | null>(() => {
    if (!patternEnabled) return null;
    if (!patternType || patternType === "none" || patternType === "custom") {
      return null;
    }
    return createPatternTexture({
      type: patternType,
      baseColor: resolvedBaseColor,
      patternColor: resolvedPatternColor,
      scale: typeof patternScale === "number" ? patternScale : 1,
      opacity: typeof patternOpacity === "number" ? patternOpacity : 1,
    });
  }, [
    patternEnabled,
    patternType,
    resolvedBaseColor,
    resolvedPatternColor,
    patternScale,
    patternOpacity,
  ]);

  // Dispose old textures when they're replaced or on unmount. Each successive
  // useMemo run gets its own cleanup attached, so the texture object captured
  // here is the one that's leaving — the new one is owned by the next effect.
  useEffect(() => {
    return () => {
      if (patternTexture) patternTexture.dispose();
    };
  }, [patternTexture]);

  // ─── 3. Patterned material spec (when texture is active) ───
  const patternedProps = useMemo<AppearanceMaterialProps | null>(() => {
    if (!patternTexture) return null;
    return {
      ...baseProps,
      // Texture pixels already encode the base + pattern colours, so paint
      // through them with white instead of multiplying by the user's hex.
      color: "#ffffff",
      map: patternTexture,
    };
  }, [patternTexture, baseProps]);

  // ─── 4. forRole accessor ───
  return useMemo<AppearanceMaterial>(
    () => ({
      forRole: (role: MeshRole) =>
        patternedProps && placementCoversRole(patternPlacement, role)
          ? patternedProps
          : baseProps,
    }),
    [baseProps, patternedProps, patternPlacement],
  );
}
