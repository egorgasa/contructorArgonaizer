"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  effectiveCornerRadius,
  elementSource,
  type BaseShapeKind,
  type DesignElement,
} from "@/lib/design";
import type {
  ConstructorVisualScene,
  VisualAccessory,
  VisualLid,
} from "@/lib/constructor-visual-scene";
import { SCALE_FACTOR } from "./OrganizerModel3D";
import { outlinePoints } from "./sceneShape";

/**
 * Scene-driven schematic overlays layered on top of the productType-specific
 * body mesh. This is the bridge that makes the 3D preview react to the same
 * `ConstructorVisualScene` the Design tab and 2D schematic already use.
 *
 * It is deliberately *schematic* (Variant B of the Slice 4 spec): rather than
 * re-deriving real CAD geometry per base shape, it draws
 *   • a filled footprint silhouette on the ground + a matching outline loop at
 *     the top, so base shape + corner radius visibly change the 3D view;
 *   • interior divider planes for multi-section parts whose body mesh doesn't
 *     already show structural dividers;
 *   • marker geometry for mounting holes / fasteners;
 *   • thin marker planes for user-placed design elements (overlay / engrave /
 *     cutout / image / decor / text), positioned from the same normalized
 *     coordinates the 2D / Design views use.
 *
 * No boolean cutouts, no rounded extrusion of the body — those stay an honest
 * approximation (an inline note in ProductPreview3D explains this).
 */
export interface SceneOverlays3DProps {
  scene: ConstructorVisualScene;
  /** Vertical (3rd) axis in mm — not carried by the top-view base shape. */
  heightMm: number;
  /** Used only to skip section planes for bodies that already draw dividers. */
  productType?: string;
  hasHoles?: boolean;
  hasFasteners?: boolean;
  /** When the shape-driven body renders its own interior dividers, suppress the
   *  schematic overlay section planes here so they aren't drawn twice. */
  bodyDrawsSections?: boolean;
}

/**
 * Marker colour for a *surface* element (overlay / engrave decor, shape or
 * text). Cutouts / holes / images are handled by their own dedicated markers,
 * so this only needs a friendly, intentional-looking accent (a flat near-black
 * read as a visual artefact in testing). Honours a user-picked fill.
 */
function surfaceMarkerColor(el: DesignElement): string {
  if (el.fillColor) return el.fillColor;
  if (el.mode === "engrave") return "#6b7280";
  return "#6366f1";
}

/** Whether an element should read as a through-opening (recessed dark marker)
 *  rather than a surface marker. */
function isOpening(el: DesignElement): boolean {
  const src = elementSource(el);
  return src === "holes" || src === "fasteners" || el.mode === "cutout";
}

export function SceneOverlays3D({
  scene,
  heightMm,
  productType,
  hasHoles,
  hasFasteners,
  bodyDrawsSections,
}: SceneOverlays3DProps) {
  const { baseShape, sections, elements, material, accessories } = scene;

  const W = Math.max(baseShape.widthMm, 1) * SCALE_FACTOR;
  const D = Math.max(baseShape.heightMm, 1) * SCALE_FACTOR;
  const H = Math.max(heightMm, 1) * SCALE_FACTOR;
  const r = effectiveCornerRadius(baseShape) * SCALE_FACTOR;
  const minSide = Math.min(W, D);

  // Footprint (filled silhouette) + top outline loop geometries. Built
  // imperatively so we can support rounded / elliptical silhouettes, and
  // disposed on change / unmount to avoid leaking GPU buffers.
  const geom = useMemo(() => {
    const pts = outlinePoints(baseShape.kind, W, D, r);
    const shape = new THREE.Shape(pts);
    const footprint = new THREE.ShapeGeometry(shape);

    const outline = new THREE.BufferGeometry().setFromPoints(
      pts.map((p) => new THREE.Vector3(p.x, H, -p.y)),
    );
    return { footprint, outline };
  }, [baseShape.kind, W, D, r, H]);

  useEffect(() => {
    return () => {
      geom.footprint.dispose();
      geom.outline.dispose();
    };
  }, [geom]);

  const fill = material.fill;
  const stroke = material.stroke;

  // Section partition planes only for bodies that don't already render
  // structural dividers. The shape-driven body (SceneBody3D) draws its own
  // dividers, so `bodyDrawsSections` suppresses these; the legacy organizer /
  // divider meshes build their own too. Otherwise (e.g. the custom bounding-box
  // fallback) the overlay draws them.
  const showSectionPlanes =
    !bodyDrawsSections &&
    productType !== "organizer" &&
    productType !== "divider";
  const partitions = showSectionPlanes ? sections.partitions : [];
  const planeT = Math.max(minSide * 0.012, 0.004);

  // Mounting markers reuse the same normalized positions as the 2D / Design
  // views: a single hole near the top edge, fasteners at the two front corners.
  const holeR = Math.max(minSide * 0.05, 0.012);
  const fastenerR = Math.max(minSide * 0.04, 0.01);
  const fastenerPositions: Array<[number, number]> = [
    [(0.12 - 0.5) * W, (0.88 - 0.5) * D],
    [(0.88 - 0.5) * W, (0.88 - 0.5) * D],
  ];

  const markerThickness = Math.max(H * 0.03, 0.004);
  // Depth that openings (holes / cutouts) sink into the top surface, so they
  // read as drilled recesses rather than flat dark disks on top.
  const recessDepth = Math.max(H * 0.15, markerThickness * 2);

  // Structured hole / fastener elements already render as cutout markers in the
  // elements loop below, so the legacy hole / fastener marker geometry is
  // FALLBACK-ONLY — drawn only when the boolean flag is set but no `source`
  // element exists (old payloads).
  const hasHoleElements = elements.some((e) => elementSource(e) === "holes");
  const hasFastenerElements = elements.some(
    (e) => elementSource(e) === "fasteners",
  );
  const showLegacyHole = !!hasHoles && !hasHoleElements;
  const showLegacyFasteners = !!hasFasteners && !hasFastenerElements;

  return (
    <group>
      {/* Base-shape footprint silhouette on the ground. */}
      <mesh
        geometry={geom.footprint}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.0015, 0]}
      >
        <meshBasicMaterial
          color={fill}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Top outline loop tracing the same silhouette at body height. Kept
          faint so it reads as a guide following the chosen shape / size, not a
          hard black frame. It updates live with the base shape now that the
          scene is rebuilt on every edit. */}
      <lineLoop geometry={geom.outline}>
        <lineBasicMaterial color={stroke} transparent opacity={0.45} />
      </lineLoop>

      {/* Schematic interior partition planes for multi-section parts. Vertical
          walls sit at a normalized x and span the depth; horizontal walls sit
          at a normalized z and span the width. */}
      {partitions.map((p) => {
        const vertical = p.orientation === "vertical";
        if (vertical) {
          const x = (p.position - 0.5) * W;
          return (
            <mesh key={p.id} position={[x, H / 2, 0]}>
              <boxGeometry args={[planeT, H, D]} />
              <meshStandardMaterial
                color="#94a3b8"
                transparent
                opacity={0.4}
                depthWrite={false}
              />
            </mesh>
          );
        }
        const z = (p.position - 0.5) * D;
        return (
          <mesh key={p.id} position={[0, H / 2, z]}>
            <boxGeometry args={[W, H, planeT]} />
            <meshStandardMaterial
              color="#94a3b8"
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Legacy mounting hole (old payloads only) — a dark circular recess so
          it reads as a drilled opening, not a flat disk lying on the surface. */}
      {showLegacyHole && (
        <HoleRecess
          x={0}
          z={(0.13 - 0.5) * D}
          surfaceY={H}
          radius={holeR}
          depth={recessDepth}
        />
      )}

      {/* Legacy fastener rings (old payloads only) — countersink-style markers. */}
      {showLegacyFasteners &&
        fastenerPositions.map(([x, z], i) => (
          <FastenerMarker
            key={`fast-${i}`}
            x={x}
            z={z}
            surfaceY={H}
            radius={fastenerR}
          />
        ))}

      {/* User-placed design elements. Each renders as the kind of marker that
          best communicates its intent:
            • holes / fasteners / cutouts → dark recessed opening (looks like a
              real hole, not a floating black box);
            • images → the actual bitmap as a flat top-surface decal (overlay in
              full colour, engrave dimmed);
            • decor / shape / text overlays → a thin coloured surface marker.
          The `textDecoration` element is skipped — it's drawn as crisp,
          face-anchored drei text by <TextDecoration3D>. */}
      {elements.map((el) => {
        const src = elementSource(el);
        if (src === "textDecoration") return null;
        const x = (el.x - 0.5) * W;
        const z = (el.y - 0.5) * D;
        const sx = Math.max(el.width * W, minSide * 0.03);
        const sz = Math.max(el.height * D, minSide * 0.03);
        const rotY = -((el.rotation ?? 0) * Math.PI) / 180;

        if (src === "fasteners") {
          return (
            <FastenerMarker
              key={el.id}
              x={x}
              z={z}
              surfaceY={H}
              radius={Math.max(Math.min(sx, sz) / 2, fastenerR)}
            />
          );
        }

        if (isOpening(el)) {
          const radius = Math.max(Math.min(sx, sz) / 2, minSide * 0.02);
          const circular = src === "holes" || el.decorShape === "circle";
          return circular ? (
            <HoleRecess
              key={el.id}
              x={x}
              z={z}
              surfaceY={H}
              radius={radius}
              depth={recessDepth}
            />
          ) : (
            <mesh key={el.id} position={[x, H - recessDepth / 2, z]} rotation={[0, rotY, 0]}>
              <boxGeometry args={[sx, recessDepth, sz]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          );
        }

        if (el.type === "image") {
          return (
            <ImageMarker
              key={el.id}
              el={el}
              x={x}
              z={z}
              surfaceY={H}
              sx={sx}
              sz={sz}
              lift={markerThickness}
              rotY={rotY}
            />
          );
        }

        // decor / shape / text overlay or engrave → thin coloured surface marker.
        const yCenter =
          el.mode === "engrave" ? H - markerThickness / 2 : H + markerThickness;
        return (
          <mesh key={el.id} position={[x, yCenter, z]} rotation={[0, rotY, 0]}>
            <boxGeometry args={[sx, markerThickness, sz]} />
            <meshStandardMaterial color={surfaceMarkerColor(el)} />
          </mesh>
        );
      })}

      {/* Constructive handles (accessories), mounted on the chosen side. They
          rebuild every render from the scene, so slider / select edits update
          live. Geometry is schematic per profile — no real CAD fastening. */}
      {accessories.map((a) => (
        <Handle3D key={a.id} accessory={a} W={W} D={D} H={H} minSide={minSide} />
      ))}

      {/* Lid — a shape-accurate slab following the base footprint. overlay sits
          on top (expanded by overhang), inset drops into the opening (shrunk by
          clearance), hinged adds schematic hinge cylinders on the back edge. */}
      {scene.lid && (
        <Lid3D
          lid={scene.lid}
          kind={baseShape.kind}
          W={W}
          D={D}
          H={H}
          r={r}
          minSide={minSide}
          fill={fill}
          stroke={stroke}
        />
      )}
    </group>
  );
}

/**
 * Schematic 3D lid. The footprint follows the base shape (reusing the same
 * `outlinePoints` as the body silhouette) and is extruded by the lid thickness.
 * No boolean ops, no real fastening / hinge mechanics — it just has to read as
 * a lid covering the item.
 */
function Lid3D({
  lid,
  kind,
  W,
  D,
  H,
  r,
  minSide,
  fill,
  stroke,
}: {
  lid: VisualLid;
  kind: BaseShapeKind;
  W: number;
  D: number;
  H: number;
  r: number;
  minSide: number;
  fill: string;
  stroke: string;
}) {
  const oh = lid.overhangMm * SCALE_FACTOR;
  const cl = lid.clearanceMm * SCALE_FACTOR;
  const th = Math.max(lid.thicknessMm * SCALE_FACTOR, minSide * 0.02, 0.01);
  const overlay = lid.fit === "overlay";

  const geom = useMemo(() => {
    const lw = overlay ? W + 2 * oh : Math.max(W - 2 * cl, minSide * 0.2);
    const ld = overlay ? D + 2 * oh : Math.max(D - 2 * cl, minSide * 0.2);
    const lr = overlay ? r + oh : Math.max(r - cl, 0);
    const pts = outlinePoints(kind, lw, ld, lr);
    const shape = new THREE.Shape(pts);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: th,
      bevelEnabled: false,
    });
    return extruded;
  }, [kind, W, D, r, oh, cl, th, overlay, minSide]);

  useEffect(() => {
    return () => geom.dispose();
  }, [geom]);

  // overlay rests on top of the body (bottom at H); inset is flush at the top
  // (bottom at H - th, so it sits just inside the opening).
  const bottomY = overlay ? H : H - th;

  // Hinge cylinders on the back edge (z = -D/2). Oriented along X (rotated
  // about Z by 90°). A few evenly spaced barrels, schematic only.
  const hingeR = Math.max(th * 0.6, minSide * 0.015);
  const hingeZ = -D / 2 - (overlay ? oh : 0) + hingeR;
  const hingeY = bottomY + th / 2;
  const hingeCount = 3;
  const hingeLen = Math.max(W * 0.14, hingeR * 3);

  return (
    <group>
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, bottomY, 0]}>
        <meshStandardMaterial
          color={fill}
          transparent
          opacity={0.72}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
      {lid.hinged &&
        Array.from({ length: hingeCount }).map((_, i) => {
          const t = (i + 1) / (hingeCount + 1);
          const x = (t - 0.5) * (W * 0.7);
          return (
            <mesh key={i} position={[x, hingeY, hingeZ]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[hingeR, hingeR, hingeLen, 16]} />
              <meshStandardMaterial color={stroke} roughness={0.5} metalness={0.3} />
            </mesh>
          );
        })}
    </group>
  );
}

/**
 * Schematic 3D handle on a side of the item.
 *
 * Side → face: front = +Z, back = -Z, left = -X, right = +X (matches the 2D
 * top view where front is the bottom edge). `x` runs along the side, `z` is the
 * normalized vertical position, `length` the span along the side, `height` the
 * vertical extent. Profiles: `bar` protrudes outward, `recessed` sinks into the
 * face, `knob` is a sphere pushed off the face.
 */
function Handle3D({
  accessory,
  W,
  D,
  H,
  minSide,
}: {
  accessory: VisualAccessory;
  W: number;
  D: number;
  H: number;
  minSide: number;
}) {
  const BAR_COLOR = "#0d9488";
  const RECESS_COLOR = "#115e59";

  const horizontal = accessory.side === "front" || accessory.side === "back";
  const along = horizontal ? W : D;
  const protr = Math.max(minSide * 0.06, 0.02);
  const barLen = Math.max(accessory.length * along, protr);
  const crossH = Math.max(accessory.height * H, protr);

  // Centre along the side, and vertical centre clamped so the bar stays on body.
  const alongCenter = (accessory.x - 0.5) * along;
  const vy = Math.max(crossH / 2, Math.min(H - crossH / 2, accessory.z * H));

  // Outward normal sign + which face plane the handle sits on.
  const facePos = horizontal ? D / 2 : W / 2;

  if (accessory.profile === "knob") {
    const r = Math.max(crossH / 2, protr);
    let pos: [number, number, number];
    switch (accessory.side) {
      case "front":
        pos = [alongCenter, vy, facePos + r];
        break;
      case "back":
        pos = [alongCenter, vy, -facePos - r];
        break;
      case "left":
        pos = [-facePos - r, vy, alongCenter];
        break;
      default: // right
        pos = [facePos + r, vy, alongCenter];
        break;
    }
    return (
      <mesh position={pos}>
        <sphereGeometry args={[r, 20, 16]} />
        <meshStandardMaterial color={BAR_COLOR} roughness={0.5} metalness={0.1} />
      </mesh>
    );
  }

  const recessed = accessory.profile === "recessed";
  // bar protrudes outward (+protr/2 beyond the face); recessed sinks inward.
  const offset = recessed ? -protr / 2 : protr / 2;

  let pos: [number, number, number];
  let size: [number, number, number];
  switch (accessory.side) {
    case "front":
      pos = [alongCenter, vy, facePos + offset];
      size = [barLen, crossH, protr];
      break;
    case "back":
      pos = [alongCenter, vy, -facePos - offset];
      size = [barLen, crossH, protr];
      break;
    case "left":
      pos = [-facePos - offset, vy, alongCenter];
      size = [protr, crossH, barLen];
      break;
    default: // right
      pos = [facePos + offset, vy, alongCenter];
      size = [protr, crossH, barLen];
      break;
  }

  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={recessed ? RECESS_COLOR : BAR_COLOR}
        roughness={recessed ? 0.85 : 0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

/** A dark cylindrical recess sunk into the top surface — reads as a drilled
 *  round hole rather than a disk sitting on top. */
function HoleRecess({
  x,
  z,
  surfaceY,
  radius,
  depth,
}: {
  x: number;
  z: number;
  surfaceY: number;
  radius: number;
  depth: number;
}) {
  return (
    <mesh position={[x, surfaceY - depth / 2, z]}>
      <cylinderGeometry args={[radius, radius, depth, 24]} />
      <meshStandardMaterial color="#1f2937" roughness={0.9} />
    </mesh>
  );
}

/** A countersink-style fastener marker: a ring at the rim plus a sunk dark
 *  centre, so it reads as a screw hole. */
function FastenerMarker({
  x,
  z,
  surfaceY,
  radius,
}: {
  x: number;
  z: number;
  surfaceY: number;
  radius: number;
}) {
  return (
    <group position={[x, surfaceY, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, radius * 0.32, 10, 20]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, -radius * 0.5, 0]}>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, radius, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * A user image rendered as a flat decal on the top surface using the bitmap
 * itself (not a placeholder box). The texture is created imperatively from the
 * data URL and disposed on change / unmount; `invalidate()` is called once the
 * bitmap decodes so the on-demand render loop repaints it. Engrave mode dims +
 * desaturates the decal so it reads as etched; a missing bitmap falls back to a
 * faint placeholder plane.
 */
function ImageMarker({
  el,
  x,
  z,
  surfaceY,
  sx,
  sz,
  lift,
  rotY,
}: {
  el: DesignElement;
  x: number;
  z: number;
  surfaceY: number;
  sx: number;
  sz: number;
  lift: number;
  rotY: number;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const texture = useMemo(() => {
    if (!el.imageDataUrl) return null;
    const tex = new THREE.TextureLoader().load(el.imageDataUrl, () => invalidate());
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [el.imageDataUrl, invalidate]);

  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  const engrave = el.mode === "engrave";

  return (
    <group position={[x, surfaceY + lift, z]} rotation={[0, rotY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[sx, sz]} />
        {texture ? (
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={engrave ? 0.55 : 1}
            color={engrave ? "#9aa0a6" : "#ffffff"}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            color="#9ca3af"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>
    </group>
  );
}
