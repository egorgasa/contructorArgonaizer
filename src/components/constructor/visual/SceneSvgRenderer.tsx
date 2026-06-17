"use client";

import { useId } from "react";
import {
  type DecorShapeKind,
  type DesignBaseShape,
  type DesignElement,
  effectiveCornerRadius,
  elementSource,
} from "@/lib/design";
import { type PatternType } from "@/lib/appearance";
import type {
  ConstructorVisualScene,
  VisualAccessory,
} from "@/lib/constructor-visual-scene";

// ---------------------------------------------------------------------------
// Shared, read-only top-view SVG renderer for the constructor previews.
//
// This module is the single source of truth for *how the scene looks from
// above*. Both the interactive Design tab (`DesignPreview`) and the static
// 2D schematic (`ProductPreview2D`) render their top view from here, so the
// two can never drift apart — they are the same pixels by construction.
//
// It is pure presentation: it reads a derived `ConstructorVisualScene` and
// draws it. It never mutates form state and carries no interaction logic
// (selection / drag / resize live in `DesignPreview` on top of this layer).
// ---------------------------------------------------------------------------

export interface PathStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

// ---- Base shape -----------------------------------------------------------

export function BaseShapePath({
  shape,
  fill,
  stroke,
  strokeWidth,
  strokeDasharray,
}: { shape: DesignBaseShape } & PathStyle) {
  const w = shape.widthMm;
  const h = shape.heightMm;

  switch (shape.kind) {
    case "rectangle":
      return (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
    case "roundedRectangle": {
      const r = effectiveCornerRadius(shape);
      return (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={r}
          ry={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
    }
    case "pill": {
      const r = effectiveCornerRadius(shape); // always h/2 for pill
      return (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={r}
          ry={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
    }
    case "circle": {
      // A real circle: pick the smaller axis as diameter, centred in the box.
      const d = Math.min(w, h);
      const cx = w / 2;
      const cy = h / 2;
      return (
        <circle
          cx={cx}
          cy={cy}
          r={d / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
    }
    case "oval":
      return (
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      );
    case "custom":
      // Bounding box with a dashed border — operator confirms the real outline
      // separately. We still respect the requested fill/stroke for masks.
      return (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray ?? "5,4"}
        />
      );
  }
}

// ---- Elements -------------------------------------------------------------

export function ElementPath({
  element,
  baseShape,
  fill,
  stroke,
  strokeWidth,
  strokeDasharray,
  imageEngraveFilterId,
}: {
  element: DesignElement;
  baseShape: DesignBaseShape;
  /** When set, image elements in `engrave` mode render the bitmap through this
   *  grayscale filter instead of a flat rectangle. */
  imageEngraveFilterId?: string;
} & PathStyle) {
  // Translate normalized [0..1] coordinates into mm-space of the SVG.
  const cxMm = element.x * baseShape.widthMm;
  const cyMm = element.y * baseShape.heightMm;
  const wMm = element.width * baseShape.widthMm;
  const hMm = element.height * baseShape.heightMm;

  // Rotate around the element centre. Identity transform when no rotation set.
  const transform =
    element.rotation && element.rotation !== 0
      ? `rotate(${element.rotation} ${cxMm} ${cyMm})`
      : undefined;

  if (element.type === "image") {
    if (!element.imageDataUrl) {
      // No image picked yet: render a dashed bounding-box placeholder so the
      // user can still see "where" the element will go. For cutout-mode
      // images this becomes the dashed outline of the hole.
      return (
        <rect
          x={cxMm - wMm / 2}
          y={cyMm - hMm / 2}
          width={wMm}
          height={hMm}
          fill="none"
          stroke={stroke === "none" ? "#9ca3af" : stroke}
          strokeWidth={Math.max(strokeWidth, 0.8)}
          strokeDasharray="3,2"
          transform={transform}
        />
      );
    }
    // Overlay-mode images draw the bitmap in full colour.
    if (element.mode === "overlay") {
      return (
        <image
          href={element.imageDataUrl}
          x={cxMm - wMm / 2}
          y={cyMm - hMm / 2}
          width={wMm}
          height={hMm}
          // Fill the element's bounding box (no letterboxing) so the visible
          // bitmap matches the draggable/resizable selection box exactly and
          // stays consistent with the 3D decal, which also fills its plane.
          preserveAspectRatio="none"
          transform={transform}
        />
      );
    }
    // Engrave-mode images draw the bitmap desaturated + dimmed, with a dashed
    // border, so it reads as an "etched" layer clearly different from overlay.
    // (No true alpha tracing — this is an honest visual approximation.)
    if (element.mode === "engrave" && imageEngraveFilterId) {
      return (
        <g transform={transform}>
          <image
            href={element.imageDataUrl}
            x={cxMm - wMm / 2}
            y={cyMm - hMm / 2}
            width={wMm}
            height={hMm}
            preserveAspectRatio="none"
            filter={`url(#${imageEngraveFilterId})`}
            opacity={0.55}
          />
          <rect
            x={cxMm - wMm / 2}
            y={cyMm - hMm / 2}
            width={wMm}
            height={hMm}
            fill="none"
            stroke={stroke === "none" ? "#1f2937" : stroke}
            strokeWidth={Math.max(strokeWidth, 0.8)}
            strokeDasharray="2,2"
          />
        </g>
      );
    }
    // Cutout (and engrave fallback) — solid rectangle in the requested colour.
    // In the mask this rectangle (black) punches a rectangular hole using the
    // image's bounding box; the dashed outline pass shows where it is.
    return (
      <rect
        x={cxMm - wMm / 2}
        y={cyMm - hMm / 2}
        width={wMm}
        height={hMm}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        transform={transform}
      />
    );
  }

  if (element.type === "text") {
    const txt = element.text ?? "";
    // Pick a glyph height proportional to the element box. SVG <text> can't
    // be filled with an image, so we just respect fill/stroke.
    const fontSize = Math.max(Math.min(hMm, wMm) * 0.6, 4);
    return (
      <text
        x={cxMm}
        y={cyMm + fontSize / 3}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={600}
        fill={fill}
        stroke={stroke === "none" ? undefined : stroke}
        strokeWidth={stroke === "none" ? undefined : strokeWidth}
        transform={transform}
      >
        {txt}
      </text>
    );
  }

  // decor / shape — driven by `decorShape`.
  return (
    <DecorShapePath
      kind={element.decorShape ?? "circle"}
      cx={cxMm}
      cy={cyMm}
      w={wMm}
      h={hMm}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      transform={transform}
    />
  );
}

interface DecorPathProps extends PathStyle {
  kind: DecorShapeKind;
  cx: number;
  cy: number;
  w: number;
  h: number;
  transform?: string;
}

export function DecorShapePath({
  kind,
  cx,
  cy,
  w,
  h,
  fill,
  stroke,
  strokeWidth,
  strokeDasharray,
  transform,
}: DecorPathProps) {
  const common = { fill, stroke, strokeWidth, strokeDasharray, transform };

  switch (kind) {
    case "circle":
      return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} {...common} />;
    case "square":
      return (
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} {...common} />
      );
    case "triangle": {
      const x1 = cx;
      const y1 = cy - h / 2;
      const x2 = cx - w / 2;
      const y2 = cy + h / 2;
      const x3 = cx + w / 2;
      const y3 = cy + h / 2;
      return <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...common} />;
    }
    case "star": {
      const points = starPoints(cx, cy, w / 2, h / 2, 5, 0.5);
      return <polygon points={points} {...common} />;
    }
    case "heart": {
      // Cubic-bezier heart inscribed in (w × h). Centred at (cx, cy).
      const x = cx - w / 2;
      const y = cy - h / 2;
      const d = [
        `M ${cx} ${y + h * 0.95}`,
        `C ${x - w * 0.05} ${y + h * 0.6}, ${x} ${y + h * 0.1}, ${cx} ${y + h * 0.3}`,
        `C ${x + w} ${y + h * 0.1}, ${x + w * 1.05} ${y + h * 0.6}, ${cx} ${y + h * 0.95}`,
        `Z`,
      ].join(" ");
      return <path d={d} {...common} />;
    }
  }
}

// Build a regular star polygon with `points` outer points and inner radius
// equal to `outerR * innerRatio`. Centred at (cx, cy).
export function starPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points: number,
  innerRatio: number,
): string {
  const out: string[] = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const isOuter = i % 2 === 0;
    const r = isOuter ? 1 : innerRatio;
    // Start at the top (−π/2) and walk clockwise.
    const a = -Math.PI / 2 + i * step;
    out.push(`${cx + rx * r * Math.cos(a)},${cy + ry * r * Math.sin(a)}`);
  }
  return out.join(" ");
}

// ---- Surface pattern ------------------------------------------------------

// A repeating SVG <pattern> tile for the surface-pattern finish. One tile of
// side `tile` (mm), stroked in `color`. Painted into the body via a clipped +
// masked rect so it follows the shape and respects cutouts. Visual only — the
// real pattern is confirmed with the operator; this is a schematic preview.
export function SurfacePattern({
  id,
  type,
  color,
  tile,
}: {
  id: string;
  type: PatternType;
  color: string;
  tile: number;
}) {
  const sw = Math.max(tile * 0.08, 0.4);
  const mid = tile / 2;

  let content: React.ReactNode;
  switch (type) {
    case "stripes":
      content = (
        <path
          d={`M 0 ${tile} L ${tile} 0 M ${-mid} ${mid} L ${mid} ${-mid} M ${mid} ${tile + mid} L ${tile + mid} ${mid}`}
          stroke={color}
          strokeWidth={sw}
          fill="none"
        />
      );
      break;
    case "dots":
      content = (
        <circle cx={mid} cy={mid} r={Math.max(tile * 0.14, 0.4)} fill={color} />
      );
      break;
    case "grid":
      content = (
        <path
          d={`M 0 0 L ${tile} 0 M 0 0 L 0 ${tile}`}
          stroke={color}
          strokeWidth={sw}
          fill="none"
        />
      );
      break;
    case "honeycomb": {
      const r = tile / 2;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${mid + r * 0.92 * Math.cos(a)},${mid + r * 0.92 * Math.sin(a)}`);
      }
      content = (
        <polygon points={pts.join(" ")} stroke={color} strokeWidth={sw} fill="none" />
      );
      break;
    }
    case "waves":
      content = (
        <path
          d={`M 0 ${mid} Q ${tile * 0.25} 0 ${mid} ${mid} T ${tile} ${mid}`}
          stroke={color}
          strokeWidth={sw}
          fill="none"
        />
      );
      break;
    default:
      content = null;
  }

  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={tile} height={tile}>
      {content}
    </pattern>
  );
}

// ---- Static scene layers --------------------------------------------------

interface SceneStaticLayersProps {
  scene: ConstructorVisualScene;
  /** Legacy "has mounting holes" flag — shown schematically as a dashed hole. */
  hasHoles?: boolean;
  /** Legacy "has fasteners" flag — shown schematically as dashed corner marks. */
  hasFasteners?: boolean;
}

/**
 * The complete read-only top-view of the scene: defs + every visual layer
 * (filled body with punched holes, surface pattern / texture / sheen,
 * sections, outline, engrave + overlay elements, surface text, cutout
 * outlines, mounting markers).
 *
 * Returned as a fragment so the caller owns the `<svg>` element (and, in the
 * Design tab, can add an interactive overlay after these layers using the
 * same `0 0 widthMm heightMm` viewBox). All ids derive from `useId()` so SSR
 * and client agree and multiple instances on a page never collide.
 */
export function SceneStaticLayers({
  scene,
  hasHoles,
  hasFasteners,
}: SceneStaticLayersProps) {
  const reactId = useId();
  const ids = {
    mask: `sc-mask-${reactId}`,
    baseClip: `sc-baseClip-${reactId}`,
    engrave: `sc-engrave-${reactId}`,
    surfacePattern: `sc-pat-${reactId}`,
    texture: `sc-tex-${reactId}`,
    sheen: `sc-sheen-${reactId}`,
  };

  const { baseShape, material, elements, sections, accessories } = scene;
  const { widthMm, heightMm } = baseShape;

  const cutouts = elements.filter((e) => e.mode === "cutout");
  const engraves = elements.filter((e) => e.mode === "engrave");
  const overlays = elements.filter((e) => e.mode === "overlay");

  // When structured hole / fastener elements exist they're already drawn as
  // real cutouts above, so the legacy schematic markers below are FALLBACK-ONLY
  // — shown only for old payloads where the boolean flag is set but no
  // `source` element was ever created.
  const hasHoleElements = elements.some((e) => elementSource(e) === "holes");
  const hasFastenerElements = elements.some(
    (e) => elementSource(e) === "fasteners",
  );
  const showLegacyHole = !!hasHoles && !hasHoleElements;
  const showLegacyFasteners = !!hasFasteners && !hasFastenerElements;

  const { fill, stroke, strokeWidth, baseOpacity, isGlossy, isTextured } =
    material;
  const minSide = Math.min(widthMm, heightMm);

  const patternActive = material.pattern.active;
  const patternType = material.pattern.type;
  const patternColor = material.pattern.color;
  const patternOpacity = material.pattern.opacity;
  const patternTile = material.pattern.tile;

  const textActive = material.text.active;
  const textValue = material.text.value;
  const textColor = material.text.color;
  const textSizeMm = material.text.sizeMm;
  const textPos = { x: material.text.x, y: material.text.y };

  // Derived partition walls (count - 1 of them). Each maps to a single line in
  // mm-space across the whole box; the clipped + masked group below trims it to
  // the silhouette (circle / oval / pill) and keeps it off any cutout hole.
  const partitions = sections.partitions;

  return (
    <>
      <defs>
        {/* Mask: white = visible material, black = punched hole. */}
        <mask id={ids.mask} maskUnits="userSpaceOnUse">
          <BaseShapePath shape={baseShape} fill="white" stroke="white" strokeWidth={0} />
          {cutouts.map((el) => (
            <ElementPath
              key={el.id}
              element={el}
              baseShape={baseShape}
              fill="black"
              stroke="black"
              strokeWidth={0}
            />
          ))}
        </mask>

        {/* Clip path: keeps overlays/engraves/sections inside the base shape. */}
        <clipPath id={ids.baseClip} clipPathUnits="userSpaceOnUse">
          <BaseShapePath shape={baseShape} fill="white" stroke="none" strokeWidth={0} />
        </clipPath>

        {/* Desaturate filter — engraved images render as flat grayscale. */}
        <filter id={ids.engrave}>
          <feColorMatrix type="saturate" values="0" />
        </filter>

        {/* Surface pattern tile — only emitted when a pattern is active. */}
        {patternActive && (
          <SurfacePattern
            id={ids.surfacePattern}
            type={patternType}
            color={patternColor}
            tile={patternTile}
          />
        )}

        {/* Subtle grain for the "textured" finish — faint gray dots. */}
        {isTextured && (
          <pattern
            id={ids.texture}
            patternUnits="userSpaceOnUse"
            width={Math.max(minSide * 0.045, 1.4)}
            height={Math.max(minSide * 0.045, 1.4)}
          >
            <circle
              cx={Math.max(minSide * 0.045, 1.4) / 2}
              cy={Math.max(minSide * 0.045, 1.4) / 2}
              r={Math.max(minSide * 0.006, 0.25)}
              fill="#000000"
            />
          </pattern>
        )}

        {/* Diagonal sheen for the "glossy" finish — a soft white highlight. */}
        {isGlossy && (
          <linearGradient
            id={ids.sheen}
            x1="0"
            y1="0"
            x2={widthMm}
            y2={heightMm}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
            <stop offset="45%" stopColor="#ffffff" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        )}
      </defs>

      {/* Filled body with holes punched through. baseOpacity dims it for the
          semi-transparent finish so "light passes through" reads visually. */}
      <g mask={`url(#${ids.mask})`} opacity={baseOpacity}>
        <BaseShapePath shape={baseShape} fill={fill} stroke="none" strokeWidth={0} />
      </g>

      {/* Surface decoration — pattern / texture / glossy sheen. Clipped to the
          body and masked by the cutouts so it never spills past the edge or
          paints over a hole. Pointer-transparent (purely visual). */}
      {(patternActive || isTextured || isGlossy) && (
        <g
          clipPath={`url(#${ids.baseClip})`}
          mask={`url(#${ids.mask})`}
          pointerEvents="none"
        >
          {patternActive && (
            <rect
              x={0}
              y={0}
              width={widthMm}
              height={heightMm}
              fill={`url(#${ids.surfacePattern})`}
              opacity={patternOpacity}
            />
          )}
          {isTextured && (
            <rect
              x={0}
              y={0}
              width={widthMm}
              height={heightMm}
              fill={`url(#${ids.texture})`}
              opacity={0.5}
            />
          )}
          {isGlossy && (
            <rect
              x={0}
              y={0}
              width={widthMm}
              height={heightMm}
              fill={`url(#${ids.sheen})`}
            />
          )}
        </g>
      )}

      {/* Section partition walls — clipped to the body + masked by cutouts so
          they follow circle / oval / pill silhouettes and never cross a hole.
          Vertical walls span the depth at a normalized x; horizontal walls span
          the width at a normalized y. */}
      {partitions.length > 0 && (
        <g
          clipPath={`url(#${ids.baseClip})`}
          mask={`url(#${ids.mask})`}
          pointerEvents="none"
        >
          {partitions.map((p) => {
            const vertical = p.orientation === "vertical";
            const x1 = vertical ? p.position * widthMm : 0;
            const y1 = vertical ? 0 : p.position * heightMm;
            const x2 = vertical ? p.position * widthMm : widthMm;
            const y2 = vertical ? heightMm : p.position * heightMm;
            return (
              <line
                key={p.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#6b7280"
                strokeWidth={Math.max(strokeWidth, 0.8)}
                strokeDasharray="3,2"
              />
            );
          })}
        </g>
      )}

      {/* Outline drawn on top so cutouts don't visually shave the border. */}
      <BaseShapePath shape={baseShape} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* Engrave + overlay layers — clipped to the base shape body. */}
      <g clipPath={`url(#${ids.baseClip})`}>
        {engraves.map((el) => (
          <ElementPath
            key={el.id}
            element={el}
            baseShape={baseShape}
            fill="none"
            stroke={el.strokeColor ?? "#1f2937"}
            strokeWidth={el.strokeWidth ?? 1.5}
            strokeDasharray={undefined}
            imageEngraveFilterId={ids.engrave}
          />
        ))}
        {overlays.map((el) => (
          <ElementPath
            key={el.id}
            element={el}
            baseShape={baseShape}
            fill={el.fillColor ?? "#111827"}
            stroke={el.strokeColor ?? "none"}
            strokeWidth={el.strokeWidth ?? 0}
          />
        ))}
      </g>

      {/* Surface text decoration — schematic top-view label. Clipped + masked
          so it never spills past the edge or paints over a hole. */}
      {textActive && (
        <g
          clipPath={`url(#${ids.baseClip})`}
          mask={`url(#${ids.mask})`}
          pointerEvents="none"
        >
          <text
            x={textPos.x}
            y={textPos.y + textSizeMm / 3}
            textAnchor="middle"
            fontSize={textSizeMm}
            fontWeight={700}
            fill={textColor}
          >
            {textValue}
          </text>
        </g>
      )}

      {/* Dashed outlines for cutouts — drawn last so the user can still see
          where the hole is even though the body is gone there. */}
      {cutouts.map((el) => (
        <ElementPath
          key={`outline-${el.id}`}
          element={el}
          baseShape={baseShape}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={Math.max(strokeWidth, 0.8)}
          strokeDasharray="3,2"
        />
      ))}

      {/* Schematic mounting markers for the legacy hasHoles / hasFasteners
          flags. No exact geometry in the MVP, so they're drawn as dashed guides
          (an operator note covers the rest) — pointer-transparent and outside
          the mask so they never punch real holes. */}
      {(showLegacyHole || showLegacyFasteners) && (
        <g pointerEvents="none">
          {showLegacyHole && (
            <circle
              cx={widthMm / 2}
              cy={heightMm * 0.13}
              r={Math.max(minSide * 0.05, 1.5)}
              fill="none"
              stroke="#6b7280"
              strokeWidth={Math.max(strokeWidth, 0.8)}
              strokeDasharray="3,2"
            />
          )}
          {showLegacyFasteners &&
            [
              { cx: widthMm * 0.12, cy: heightMm * 0.88 },
              { cx: widthMm * 0.88, cy: heightMm * 0.88 },
            ].map((p, i) => (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={Math.max(minSide * 0.035, 1.2)}
                fill="none"
                stroke="#6b7280"
                strokeWidth={Math.max(strokeWidth, 0.8)}
                strokeDasharray="2,2"
              />
            ))}
        </g>
      )}

      {/* Constructive handles (accessories). Drawn hugging the inner edge of
          the side they're mounted on, in a teal palette distinct from the gray
          dashed holes/markers so they never read as a cutout or decor.
          Pointer-transparent — this is a read-only schematic. */}
      {accessories.length > 0 && (
        <g pointerEvents="none">
          {accessories.map((a) => (
            <Handle2D
              key={a.id}
              accessory={a}
              widthMm={widthMm}
              heightMm={heightMm}
              minSide={minSide}
            />
          ))}
        </g>
      )}
    </>
  );
}

/**
 * Schematic top-view marker for a single handle. The top view can't show the
 * handle's vertical position, so we render it as a bar / knob / recessed inset
 * hugging the inner edge of its side, centred along the side by `x` and sized
 * by `length`. front = bottom edge, back = top, left = left edge, right = right.
 */
function Handle2D({
  accessory,
  widthMm,
  heightMm,
  minSide,
}: {
  accessory: VisualAccessory;
  widthMm: number;
  heightMm: number;
  minSide: number;
}) {
  const FILL = "#0d9488";
  const STROKE = "#0f766e";
  const thickness = Math.max(minSide * 0.05, 1.4);
  const inset = thickness * 0.7;
  const horizontal = accessory.side === "front" || accessory.side === "back";
  const along = horizontal ? widthMm : heightMm;
  const span = Math.max(accessory.length * along, thickness);
  const center = accessory.x * along;
  const start = Math.max(0, Math.min(along - span, center - span / 2));

  // Position of the bar's near edge (the one toward the body interior).
  let x: number;
  let y: number;
  let w: number;
  let h: number;
  if (accessory.side === "front") {
    // bottom edge (y = heightMm)
    x = start;
    y = heightMm - inset - thickness;
    w = span;
    h = thickness;
  } else if (accessory.side === "back") {
    // top edge (y = 0)
    x = start;
    y = inset;
    w = span;
    h = thickness;
  } else if (accessory.side === "left") {
    x = inset;
    y = start;
    w = thickness;
    h = span;
  } else {
    // right edge (x = widthMm)
    x = widthMm - inset - thickness;
    y = start;
    w = thickness;
    h = span;
  }

  if (accessory.profile === "knob") {
    // A single knob centred on the side instead of a bar.
    const r = thickness;
    const cx = horizontal ? center : x + w / 2;
    const cy = horizontal ? y + h / 2 : center;
    return <circle cx={cx} cy={cy} r={r} fill={FILL} stroke={STROKE} strokeWidth={0.8} />;
  }

  if (accessory.profile === "recessed") {
    // Inset (sunk) handle — dashed outline, no solid fill.
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={Math.min(w, h) / 2}
        ry={Math.min(w, h) / 2}
        fill="none"
        stroke={STROKE}
        strokeWidth={1}
        strokeDasharray="3,2"
      />
    );
  }

  // bar — rounded solid bar.
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={Math.min(w, h) / 2}
      ry={Math.min(w, h) / 2}
      fill={FILL}
      stroke={STROKE}
      strokeWidth={0.8}
    />
  );
}

/**
 * Top-view lid contour. The lid is drawn over the base shape in a distinct
 * indigo so it never reads as the body, a hole or a handle:
 *   • `overlay` → an outer contour expanded by `overhangMm` around the shape;
 *   • `inset`   → an inner contour shrunk by `clearanceMm`;
 *   • `hinged`  → the fit-appropriate contour plus a schematic hinge line on
 *                 the back edge (top edge in the top view, y = 0).
 * Pointer-transparent (read-only schematic). The wrapping <svg>'s viewBox is
 * padded for an overlay lid so the overhang isn't clipped (see ConstructorSceneSvg).
 */
function Lid2D({
  scene,
}: {
  scene: ConstructorVisualScene;
}) {
  const lid = scene.lid;
  if (!lid) return null;

  const { baseShape } = scene;
  const { widthMm, heightMm } = baseShape;
  const STROKE = "#4f46e5";
  const minSide = Math.min(widthMm, heightMm);

  // Build a derived base shape for the lid footprint + the offset to centre it.
  const overlay = lid.fit === "overlay";
  const delta = overlay ? lid.overhangMm : -Math.min(lid.clearanceMm, minSide / 2 - 1);
  const lidShape: DesignBaseShape = {
    ...baseShape,
    widthMm: Math.max(widthMm + 2 * delta, 1),
    heightMm: Math.max(heightMm + 2 * delta, 1),
  };
  const tx = -delta;
  const ty = -delta;

  // Hinge line sits on the back edge (top of the top view). Span most of the
  // width, inset from the corners; draw a few hinge ticks along it.
  const hingeY = overlay ? -lid.overhangMm : Math.min(lid.clearanceMm, minSide / 4);
  const hingeMargin = widthMm * 0.12;
  const tickCount = 3;

  return (
    <g pointerEvents="none">
      {/* Lid footprint: a faint fill so it reads as a covering panel plus a
          solid contour. Group-level opacity (in ConstructorSceneSvg) keeps the
          body visible underneath. */}
      <g transform={`translate(${tx}, ${ty})`} fillOpacity={0.18}>
        <BaseShapePath
          shape={lidShape}
          fill={STROKE}
          stroke={STROKE}
          strokeWidth={Math.max(minSide * 0.01, 0.8)}
          strokeDasharray={overlay ? undefined : "4,3"}
        />
      </g>
      {lid.hinged && (
        <g>
          <line
            x1={hingeMargin}
            y1={hingeY}
            x2={widthMm - hingeMargin}
            y2={hingeY}
            stroke={STROKE}
            strokeWidth={Math.max(minSide * 0.012, 1)}
          />
          {Array.from({ length: tickCount }).map((_, i) => {
            const t = (i + 1) / (tickCount + 1);
            const x = hingeMargin + t * (widthMm - 2 * hingeMargin);
            const r = Math.max(minSide * 0.02, 1.2);
            return (
              <circle key={i} cx={x} cy={hingeY} r={r} fill={STROKE} />
            );
          })}
        </g>
      )}
    </g>
  );
}

// ---- Self-contained SVG ---------------------------------------------------

interface ConstructorSceneSvgProps extends SceneStaticLayersProps {
  className?: string;
  ariaLabel?: string;
}

/**
 * A complete, read-only `<svg>` of the scene's top view. Convenience wrapper
 * around `SceneStaticLayers` for non-interactive consumers (the 2D schematic).
 * Renders nothing when the base shape has collapsed to zero size.
 */
export function ConstructorSceneSvg({
  scene,
  hasHoles,
  hasFasteners,
  className,
  ariaLabel,
}: ConstructorSceneSvgProps) {
  const { widthMm, heightMm } = scene.baseShape;
  if (widthMm <= 0 || heightMm <= 0) return null;

  // Pad the viewBox for an overlay lid (and its hinge) so the overhang that
  // extends beyond the body footprint isn't clipped. Inset lids stay inside.
  const lid = scene.lid;
  const pad =
    lid && lid.fit === "overlay" ? lid.overhangMm + Math.min(widthMm, heightMm) * 0.04 : 0;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${widthMm + 2 * pad} ${heightMm + 2 * pad}`}
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label={ariaLabel ?? "Схема изделия — вид сверху"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <SceneStaticLayers
        scene={scene}
        hasHoles={hasHoles}
        hasFasteners={hasFasteners}
      />
      {/* Lid contour drawn on top of the body, inside the (possibly padded)
          viewBox so an overlay overhang stays visible. */}
      <g opacity={0.55}>
        <Lid2D scene={scene} />
      </g>
    </svg>
  );
}
