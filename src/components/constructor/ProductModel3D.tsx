"use client";

import type { PrintRequestInput } from "@/lib/validations/print-request";
import type { TextPlacement } from "@/lib/appearance";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";
import { BoxModel3D } from "./BoxModel3D";
import { OrganizerModel3D } from "./OrganizerModel3D";
import { TrayModel3D } from "./TrayModel3D";
import { StandModel3D } from "./StandModel3D";
import { DividerModel3D } from "./DividerModel3D";
import { CustomModel3D } from "./CustomModel3D";
import { TextDecoration3D } from "./TextDecoration3D";
import { SceneOverlays3D } from "./SceneOverlays3D";
import { SceneBody3D } from "./SceneBody3D";
import { useAppearanceMaterial } from "./useAppearanceMaterial";

/**
 * Form-side appearance shape (Zod input type). Every inner field is optional
 * because the schema fills defaults on parse — we re-use it here so the
 * components match react-hook-form's `watch()` output exactly.
 */
export type AppearanceInput = PrintRequestInput["appearance"];

export interface ProductModel3DProps {
  /** One of the productType enum values from the form. Unknown values fall
   *  through to a generic bounding box so the canvas never goes blank. */
  productType?: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  /** Carried for completeness; not represented in the 3D mesh (Layer 4 leaves
   *  corner-radius to the 2D layer per spec). */
  cornerRadiusMm?: number;
  sectionsCount: number;
  appearance?: AppearanceInput;
  /**
   * Unified visual scene. Drives the schematic overlays (footprint silhouette,
   * top outline, section planes, design-element markers) layered on top of the
   * productType-specific body so the 3D view reacts to base shape / radius /
   * sections / elements the same way the Design and 2D tabs do.
   */
  scene?: ConstructorVisualScene;
  /** Legacy mounting flags — drawn as schematic markers by SceneOverlays3D. */
  hasHoles?: boolean;
  hasFasteners?: boolean;
}

/**
 * Dispatches to the right 3D mesh based on `productType` and resolves a
 * single shared material spec from the current appearance state. The text
 * decoration (Layer 8) is layered on top — it's the same component regardless
 * of product type since positioning is anchored to the outer bounding box.
 *
 * The shared material lives at this level (not inside every leaf model) so:
 *  1. all meshes of a part share the same look without recomputing the spec
 *     inside every sub-component;
 *  2. R3F can diff a single, stable props object against its underlying
 *     THREE.Material instance, mutating roughness / opacity / map / etc. in
 *     place when the user moves a slider — no material churn, no GPU buffer
 *     reallocation;
 *  3. pattern placement (front / sides / top / all) is resolved per mesh
 *     via `material.forRole(...)` so the same hook drives both face-aware
 *     pattern targeting and the plain finish picker.
 *
 * Unrecognised types ("other" and legacy values) fall through to the
 * translucent CustomModel3D placeholder so the canvas stays informative
 * without claiming we've guessed the geometry.
 */
export function ProductModel3D({
  productType,
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  sectionsCount,
  appearance,
  scene,
  hasHoles,
  hasFasteners,
}: ProductModel3DProps) {
  const material = useAppearanceMaterial(appearance);
  const textDecoration = appearance?.textDecoration;

  // The body now follows `scene.baseShape` (shape-driven extruded body) so a
  // circle / oval / pill no longer renders as a rectangular box. The legacy
  // productType-specific meshes below are kept only as a fallback for when no
  // scene is supplied. `custom` falls back to the translucent bounding-box
  // ghost, since the custom shape editor is disabled.
  const sceneBody =
    scene && scene.baseShape.kind !== "custom" ? (
      <SceneBody3D
        scene={scene}
        heightMm={heightMm}
        wallThicknessMm={wallThicknessMm}
        material={material}
      />
    ) : scene && scene.baseShape.kind === "custom" ? (
      <CustomModel3D
        widthMm={widthMm}
        depthMm={depthMm}
        heightMm={heightMm}
        materialProps={material.forRole("misc")}
      />
    ) : null;

  // Whether the shape-driven body draws its own interior dividers — when it
  // does, the overlay section planes must be suppressed to avoid doubling.
  const bodyDrawsSections = !!scene && scene.baseShape.kind !== "custom";

  const legacyMesh = (() => {
    switch (productType) {
      case "organizer":
        return (
          <OrganizerModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            wallThicknessMm={wallThicknessMm}
            sectionsCount={sectionsCount}
            material={material}
          />
        );
      case "box":
        return (
          <BoxModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            wallThicknessMm={wallThicknessMm}
            material={material}
          />
        );
      case "tray":
        return (
          <TrayModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            wallThicknessMm={wallThicknessMm}
            material={material}
          />
        );
      case "stand":
        return (
          <StandModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            wallThicknessMm={wallThicknessMm}
            material={material}
          />
        );
      case "divider":
        return (
          <DividerModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            wallThicknessMm={wallThicknessMm}
            sectionsCount={sectionsCount}
            material={material}
          />
        );
      case "custom":
        return (
          <CustomModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            materialProps={material.forRole("misc")}
          />
        );
      default:
        return (
          <CustomModel3D
            widthMm={widthMm}
            depthMm={depthMm}
            heightMm={heightMm}
            materialProps={material.forRole("misc")}
            label="Форма уточняется"
          />
        );
    }
  })();

  return (
    <>
      {sceneBody ?? legacyMesh}
      {scene && (
        <SceneOverlays3D
          scene={scene}
          heightMm={heightMm}
          productType={productType}
          hasHoles={hasHoles}
          hasFasteners={hasFasteners}
          bodyDrawsSections={bodyDrawsSections}
        />
      )}
      <TextDecoration3D
        enabled={!!textDecoration?.enabled}
        text={textDecoration?.text}
        colorHex={textDecoration?.colorHex}
        size={textDecoration?.size}
        placement={textDecoration?.placement as TextPlacement | undefined}
        widthMm={widthMm}
        depthMm={depthMm}
        heightMm={heightMm}
      />
    </>
  );
}
