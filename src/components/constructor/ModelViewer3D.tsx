"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ProductModel3D, type AppearanceInput } from "./ProductModel3D";
import { SCALE_FACTOR } from "./OrganizerModel3D";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";

export interface ModelViewer3DProps {
  productType?: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  cornerRadiusMm?: number;
  sectionsCount: number;
  appearance?: AppearanceInput;
  /** Unified visual scene — drives the schematic overlays in ProductModel3D. */
  scene?: ConstructorVisualScene;
  hasHoles?: boolean;
  hasFasteners?: boolean;
  /**
   * Bumped by the parent to request a camera reset. Incrementing the counter
   * triggers an effect inside the Canvas that calls `controls.reset()` —
   * see <ResetCameraEffect /> below for why this needs to live inside the
   * R3F root.
   */
  resetKey?: number;
}

/**
 * Single Canvas hosting the product mesh, ambient + key + rim lighting,
 * OrbitControls, and a faint floor grid for orientation.
 *
 * Performance notes:
 *   • `frameloop="demand"` makes R3F render only when something invalidates
 *     the scene (prop change, OrbitControls drag, etc.). For a mostly-static
 *     preview this is a large win — the GPU sits idle when the user is
 *     filling out the form rather than burning frames at 60 FPS.
 *   • `dpr={[1, 2]}` clamps device pixel ratio. Caps mobile high-DPI cost
 *     while still looking sharp on retina laptops.
 *   • Geometry / material allocation lives in the leaf model components,
 *     which already wrap heavy props in useMemo and clean up CanvasTextures
 *     in useEffect cleanup (see useAppearanceMaterial.ts).
 *
 * Camera framing: distance is derived from the part's bounding-box diagonal
 * in scene units rather than a fixed value, so a 10 mm part is framed as
 * comfortably as a 300 mm one without us re-scaling the geometry.
 */
export default function ModelViewer3D({
  productType,
  widthMm,
  depthMm,
  heightMm,
  wallThicknessMm,
  cornerRadiusMm,
  sectionsCount,
  appearance,
  scene,
  hasHoles,
  hasFasteners,
  resetKey = 0,
}: ModelViewer3DProps) {
  // Frame the mesh: pick a camera distance proportional to the bounding-box
  // diagonal so small parts don't end up specks and huge parts don't clip.
  const { cameraPosition, target, maxDistance, gridSize } = useMemo(() => {
    const w = Math.max(widthMm, 1) * SCALE_FACTOR;
    const d = Math.max(depthMm, 1) * SCALE_FACTOR;
    const h = Math.max(heightMm, 1) * SCALE_FACTOR;

    const diag = Math.sqrt(w * w + d * d + h * h);
    // Empirical factor — leaves comfortable margin around the part at fov=42.
    const dist = Math.max(diag * 1.8, 1.2);

    // Slightly above and in front of the part, looking at its centre.
    const pos: [number, number, number] = [dist * 0.7, dist * 0.6, dist * 0.95];
    const tgt: [number, number, number] = [0, h * 0.4, 0];

    // Grid extends ~4x the longest side; rounded to a sensible value so the
    // grid divisions stay visible at any scale.
    const longest = Math.max(w, d, h);
    const grid = Math.max(longest * 4, 1.5);

    // Zoom-out cap. Kept generous so the user can pull back to see the
    // whole part on tall items, but bounded so they can't lose the mesh.
    const maxDist = Math.max(grid, 6);

    return {
      cameraPosition: pos,
      target: tgt,
      maxDistance: maxDist,
      gridSize: grid,
    };
  }, [widthMm, depthMm, heightMm]);

  return (
    <Canvas
      // Render-on-demand: idle when nothing is changing (huge battery win on
      // mobile, prevents heat throttling during long form sessions).
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ background: "#f8fafc" }}
      className="h-full w-full"
    >
      <PerspectiveCamera makeDefault position={cameraPosition} fov={42} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={0.9} />
      <directionalLight position={[-3, 2, -4]} intensity={0.25} />

      <ProductModel3D
        productType={productType}
        widthMm={widthMm}
        depthMm={depthMm}
        heightMm={heightMm}
        wallThicknessMm={wallThicknessMm}
        cornerRadiusMm={cornerRadiusMm}
        sectionsCount={sectionsCount}
        appearance={appearance}
        scene={scene}
        hasHoles={hasHoles}
        hasFasteners={hasFasteners}
      />

      <gridHelper args={[gridSize, 12, "#cbd5e1", "#e2e8f0"]} position={[0, 0, 0]} />

      <Controls
        target={target}
        maxDistance={maxDistance}
        resetKey={resetKey}
      />
    </Canvas>
  );
}

/**
 * OrbitControls + the imperative "reset camera" wiring. Has to live as its
 * own component (rather than inline in <ModelViewer3D />) because the reset
 * effect needs to invalidate the R3F render loop via `useThree`, which is
 * only available inside the Canvas tree.
 *
 * Behaviour summary:
 *   • Drag to rotate, wheel / two-finger pinch to zoom, no panning (panning
 *     on a single-object preview tends to confuse first-time users).
 *   • polar angle clamped so the user can't tilt below the floor grid.
 *   • Distance clamped using the camera-framing maxDistance so the part
 *     never disappears into a dot in the distance.
 */
function Controls({
  target,
  maxDistance,
  resetKey,
}: {
  target: [number, number, number];
  maxDistance: number;
  resetKey: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    // Skip the first mount: there's nothing to reset yet, and reset() before
    // OrbitControls has captured initial state would no-op anyway.
    if (resetKey === 0) return;
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.reset();
    // frameloop="demand" means we must explicitly request a re-render after
    // imperatively mutating the camera — OrbitControls' change event won't
    // fire on reset() the same way it does for user drags.
    invalidate();
  }, [resetKey, invalidate]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={target}
      enablePan={false}
      enableZoom
      minDistance={0.6}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}
