"use client";

import { useRef, useState } from "react";
import {
  DESIGN_MODE_LABELS,
  type DesignBaseShape,
  type DesignElement,
} from "@/lib/design";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";
import { SceneStaticLayers } from "./visual/SceneSvgRenderer";

interface Props {
  /**
   * Unified, derived visual scene (base shape + material + elements +
   * warnings). The preview reads everything it draws from here rather than
   * re-deriving it from raw form state.
   */
  scene: ConstructorVisualScene;
  /** Optional outer wrapper className — controls the rendered size. */
  className?: string;
  /**
   * Id of the currently-selected element (UI-only). When set, that element
   * gets a dashed highlight outline. Not part of the design payload.
   */
  selectedElementId?: string | null;
  /**
   * When provided, the preview becomes interactive: each element gets a
   * clickable hit-area that calls this to select it. Omit it (the default for
   * print/admin views) and the preview renders exactly as before.
   */
  onSelectElement?: (id: string) => void;
  /**
   * When provided, the selected element can be dragged with the pointer to
   * change its x/y. Only x/y are ever patched. Omit it and the preview is
   * select-only (or fully static when onSelectElement is also omitted).
   */
  onUpdateElement?: (id: string, patch: Partial<DesignElement>) => void;
  /** Legacy "has mounting holes" flag — shown schematically as a dashed hole. */
  hasHoles?: boolean;
  /** Legacy "has fasteners" flag — shown schematically as dashed corner marks. */
  hasFasteners?: boolean;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";

/**
 * UI-only pointer interaction bookkeeping. Never persisted. One of three modes:
 * dragging the whole element, resizing from a corner, or rotating.
 */
type Interaction =
  | {
      type: "drag";
      id: string;
      pointerId: number;
      /** Pointer→centre offset in normalized [0..1] units, frozen at down. */
      offsetX: number;
      offsetY: number;
    }
  | {
      type: "resize";
      id: string;
      pointerId: number;
      handle: ResizeHandle;
      /** Element centre + size + pointer pos (normalized) frozen at down. */
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
      startPointerX: number;
      startPointerY: number;
    }
  | {
      type: "rotate";
      id: string;
      pointerId: number;
      /** Element centre in mm-space (rotation pivot). */
      centerX: number;
      centerY: number;
      /** Pointer angle (deg) at down + the element's rotation at down. */
      startAngle: number;
      startRotation: number;
    };

// SVG-based top-view preview of the future printed item.
//
// Pipeline:
//   1. Render the base shape filled with the chosen colour, but masked so
//      that cutout elements punch real holes through it.
//   2. Render engrave elements as outlined / darker overlays on top of the
//      filled shape.
//   3. Render overlay elements (image + decor + text) on top of everything.
//   4. Render a dashed outline for each cutout so the user can still tell
//      *where* the hole was placed, even though it's transparent.
//
// All ids are derived from `useId()` so SSR and client agree and there are no
// hydration warnings.
export function DesignPreview({
  scene,
  className,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  hasHoles,
  hasFasteners,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  const { baseShape, elements, warnings } = scene;
  const { widthMm, heightMm } = baseShape;

  // Defensive: render an empty placeholder if the shape collapsed to zero.
  // The wizard's validation prevents this in normal use, but we don't want
  // the preview to throw if the user blanks the inputs mid-edit.
  if (widthMm <= 0 || heightMm <= 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-xs text-gray-500 ${className ?? ""}`}
      >
        Введите размеры формы, чтобы увидеть превью.
      </div>
    );
  }

  // Element counts for the legend below the canvas. The actual element
  // graphics are drawn by the shared <SceneStaticLayers> renderer.
  const cutouts = elements.filter((e) => e.mode === "cutout");
  const engraves = elements.filter((e) => e.mode === "engrave");
  const overlays = elements.filter((e) => e.mode === "overlay");

  // Translate a pointer event into normalized [0..1] coordinates of the base
  // shape box. Uses the SVG CTM (not clientWidth math) so it's correct under
  // any CSS scaling. Returns null if the matrix isn't available yet.
  const pointerToNormalized = (
    e: React.PointerEvent,
  ): { nx: number; ny: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { nx: local.x / widthMm, ny: local.y / heightMm };
  };

  // Capture the pointer on the svg root so move/up keep flowing even when the
  // cursor leaves the small handle/element. All three interaction modes share
  // this single move/up path on the root.
  //
  // Both calls are wrapped: setPointerCapture throws NotFoundError if the
  // pointer isn't active, and releasePointerCapture throws InvalidPointerId if
  // capture was already released (the browser auto-releases on pointercancel,
  // which our pointerup handler also runs). Guard so neither logs a console
  // error mid-interaction.
  const capture = (pointerId: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      svg.setPointerCapture(pointerId);
    } catch {
      /* pointer no longer active — interaction still tracks via root events */
    }
  };

  const releaseCapture = (pointerId: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (svg.hasPointerCapture(pointerId)) {
        svg.releasePointerCapture(pointerId);
      }
    } catch {
      /* already released (e.g. after pointercancel) — nothing to do */
    }
  };

  // ── Drag (whole element) — started from the element hit-rect.
  const handleElementPointerDown = (
    e: React.PointerEvent,
    element: DesignElement,
  ) => {
    // Always select on press; only begin a drag when updates are allowed.
    onSelectElement?.(element.id);
    if (!onUpdateElement) return;
    const p = pointerToNormalized(e);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    capture(e.pointerId);
    setInteraction({
      type: "drag",
      id: element.id,
      pointerId: e.pointerId,
      offsetX: p.nx - element.x,
      offsetY: p.ny - element.y,
    });
  };

  // ── Resize (corner handle) — from centre, keeps x/y fixed.
  const handleResizePointerDown = (
    e: React.PointerEvent,
    element: DesignElement,
    handle: ResizeHandle,
  ) => {
    if (!onUpdateElement) return;
    const p = pointerToNormalized(e);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    capture(e.pointerId);
    setInteraction({
      type: "resize",
      id: element.id,
      pointerId: e.pointerId,
      handle,
      startX: element.x,
      startY: element.y,
      startWidth: element.width,
      startHeight: element.height,
      startPointerX: p.nx,
      startPointerY: p.ny,
    });
  };

  // ── Rotate (top handle) — angle measured in mm-space about the centre.
  const handleRotatePointerDown = (
    e: React.PointerEvent,
    element: DesignElement,
  ) => {
    if (!onUpdateElement) return;
    const p = pointerToNormalized(e);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    capture(e.pointerId);
    const centerX = element.x * widthMm;
    const centerY = element.y * heightMm;
    const startAngle =
      (Math.atan2(p.ny * heightMm - centerY, p.nx * widthMm - centerX) * 180) /
      Math.PI;
    setInteraction({
      type: "rotate",
      id: element.id,
      pointerId: e.pointerId,
      centerX,
      centerY,
      startAngle,
      startRotation: element.rotation ?? 0,
    });
  };

  // ── Shared move — routes to the active interaction.
  const handleRootPointerMove = (e: React.PointerEvent) => {
    if (!interaction || !onUpdateElement || e.pointerId !== interaction.pointerId)
      return;
    const el = elements.find((x) => x.id === interaction.id);
    if (!el) return;
    const p = pointerToNormalized(e);
    if (!p) return;
    e.preventDefault();

    if (interaction.type === "drag") {
      const w = clamp01(el.width || 0.2);
      const h = clamp01(el.height || 0.2);
      onUpdateElement(interaction.id, {
        x: clampCenter(p.nx - interaction.offsetX, w),
        y: clampCenter(p.ny - interaction.offsetY, h),
      });
      return;
    }

    if (interaction.type === "resize") {
      const dx = p.nx - interaction.startPointerX;
      const dy = p.ny - interaction.startPointerY;
      const dirX = interaction.handle.includes("e") ? 1 : -1;
      const dirY = interaction.handle.includes("s") ? 1 : -1;
      // Resize from centre: the corner moves twice the centre→corner delta.
      const w = clampSize(interaction.startWidth + dx * dirX * 2);
      const h = clampSize(interaction.startHeight + dy * dirY * 2);
      onUpdateElement(interaction.id, {
        width: w,
        height: h,
        x: clampCenter(interaction.startX, w),
        y: clampCenter(interaction.startY, h),
      });
      return;
    }

    // rotate
    const angle =
      (Math.atan2(
        p.ny * heightMm - interaction.centerY,
        p.nx * widthMm - interaction.centerX,
      ) *
        180) /
      Math.PI;
    onUpdateElement(interaction.id, {
      rotation: normalizeAngle(
        interaction.startRotation + (angle - interaction.startAngle),
      ),
    });
  };

  const handleRootPointerUp = (e: React.PointerEvent) => {
    if (!interaction || e.pointerId !== interaction.pointerId) return;
    releaseCapture(e.pointerId);
    setInteraction(null);
  };

  const interactive = !!onSelectElement || !!onUpdateElement;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50 p-4 ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Дизайн-превью
        </div>
        <div className="text-xs text-gray-500">
          {Math.round(widthMm)} × {Math.round(heightMm)} мм
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        className="h-auto w-full"
        style={interactive ? { touchAction: "none" } : undefined}
        role="img"
        aria-label="Дизайн-превью формы изделия"
        xmlns="http://www.w3.org/2000/svg"
        onPointerMove={onUpdateElement ? handleRootPointerMove : undefined}
        onPointerUp={onUpdateElement ? handleRootPointerUp : undefined}
        onPointerCancel={onUpdateElement ? handleRootPointerUp : undefined}
      >
        {/* Static top-view of the scene (base body, surface look, sections,
            elements, cutout outlines, mounting markers). Shared verbatim with
            the 2D schematic via <SceneStaticLayers>, so the two views can never
            visually diverge. */}
        <SceneStaticLayers
          scene={scene}
          hasHoles={hasHoles}
          hasFasteners={hasFasteners}
        />

        {/* Interactive selection layer — purely a screen overlay. Rendered last
            and OUTSIDE the mask/clip groups, so it never punches holes or gets
            clipped. Only mounted when the preview is interactive or has a
            selection, keeping print/admin views byte-identical to before. */}
        {(interactive || selectedElementId) && (
          <g>
            {elements.map((el, i) => (
              <ElementHit
                key={`hit-${el.id}`}
                element={el}
                index={i + 1}
                baseShape={baseShape}
                selected={el.id === selectedElementId}
                interactive={interactive}
                editable={!!onUpdateElement}
                dragging={interaction?.id === el.id && interaction.type === "drag"}
                onSelect={(id) => onSelectElement?.(id)}
                onElementPointerDown={handleElementPointerDown}
                onResizePointerDown={handleResizePointerDown}
                onRotatePointerDown={handleRotatePointerDown}
              />
            ))}
          </g>
        )}
      </svg>

      <Legend
        cutouts={cutouts.length}
        engraves={engraves.length}
        overlays={overlays.length}
      />

      <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
        {onUpdateElement && elements.length > 0 && (
          <p>
            Перетащите элемент, чтобы переместить. Угловые маркеры меняют размер,
            верхний — поворачивают.
          </p>
        )}
        {/* Operator notes / MVP limitations are derived once in the scene and
            rendered here uniformly. */}
        {warnings.map((w, i) => (
          <p key={`${w.code}-${i}`}>{w.message}</p>
        ))}
      </div>
    </div>
  );
}

// ---- Drag / resize / rotate math ------------------------------------------

/** Normalized element size bounds — never zero-size, never bigger than box. */
const MIN_ELEMENT_SIZE = 0.03;
const MAX_ELEMENT_SIZE = 1;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Clamp a normalized width/height into [MIN_ELEMENT_SIZE, MAX_ELEMENT_SIZE]. */
function clampSize(v: number): number {
  if (!Number.isFinite(v)) return MIN_ELEMENT_SIZE;
  return Math.max(MIN_ELEMENT_SIZE, Math.min(MAX_ELEMENT_SIZE, v));
}

/** Wrap a rotation (degrees) into the (-180, 180] range. */
function normalizeAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
  return wrapped;
}

/**
 * Clamp a centre coordinate so an element of normalized `size` stays fully
 * inside the [0..1] base-shape box. Falls back to 0.5 when the element is as
 * large as the box (no valid range).
 */
function clampCenter(center: number, size: number): number {
  if (!Number.isFinite(center)) return 0.5;
  const half = size / 2;
  const lo = half;
  const hi = 1 - half;
  if (hi <= lo) return 0.5;
  return Math.max(lo, Math.min(hi, center));
}

// ---- Selection overlay ----------------------------------------------------

// A transparent, clickable hit-rectangle over an element's bounding box, plus
// a dashed highlight + corner markers when selected. Geometry mirrors
// ElementPath (centre-based, rotated about the centre) so the outline lines up
// with the rendered element. The outline itself is pointer-transparent so it
// never blocks the hit-rect underneath.
function ElementHit({
  element,
  index,
  baseShape,
  selected,
  interactive,
  editable,
  dragging,
  onSelect,
  onElementPointerDown,
  onResizePointerDown,
  onRotatePointerDown,
}: {
  element: DesignElement;
  index: number;
  baseShape: DesignBaseShape;
  selected: boolean;
  interactive: boolean;
  /** True when drag/resize/rotate are available (onUpdateElement present). */
  editable: boolean;
  dragging: boolean;
  onSelect: (id: string) => void;
  onElementPointerDown: (e: React.PointerEvent, element: DesignElement) => void;
  onResizePointerDown: (
    e: React.PointerEvent,
    element: DesignElement,
    handle: ResizeHandle,
  ) => void;
  onRotatePointerDown: (e: React.PointerEvent, element: DesignElement) => void;
}) {
  const cxMm = element.x * baseShape.widthMm;
  const cyMm = element.y * baseShape.heightMm;
  const wMm = element.width * baseShape.widthMm;
  const hMm = element.height * baseShape.heightMm;
  const x = cxMm - wMm / 2;
  const y = cyMm - hMm / 2;

  const transform =
    element.rotation && element.rotation !== 0
      ? `rotate(${element.rotation} ${cxMm} ${cyMm})`
      : undefined;

  // Stroke + marker sizing scales with the shape so it reads the same at any
  // physical size of the preview.
  const unit = Math.max(Math.min(baseShape.widthMm, baseShape.heightMm) * 0.006, 0.6);
  const handleR = unit * 2.2;
  const label = `Элемент ${index}: ${element.type}, ${DESIGN_MODE_LABELS[element.mode]}`;
  const cursor = editable ? (dragging ? "grabbing" : "grab") : "pointer";

  // Corner positions + the matching CSS resize cursor (in the unrotated frame).
  const corners: { handle: ResizeHandle; px: number; py: number; cur: string }[] =
    [
      { handle: "nw", px: x, py: y, cur: "nwse-resize" },
      { handle: "ne", px: x + wMm, py: y, cur: "nesw-resize" },
      { handle: "sw", px: x, py: y + hMm, cur: "nesw-resize" },
      { handle: "se", px: x + wMm, py: y + hMm, cur: "nwse-resize" },
    ];
  const rotateY = y - handleR * 4;

  return (
    <g transform={transform}>
      {interactive && (
        <rect
          x={x}
          y={y}
          width={wMm}
          height={hMm}
          fill="transparent"
          pointerEvents="all"
          role="button"
          tabIndex={0}
          aria-label={label}
          aria-pressed={selected}
          style={{ cursor, touchAction: "none" }}
          onPointerDown={(e) => onElementPointerDown(e, element)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(element.id);
            }
          }}
        />
      )}
      {selected && (
        <>
          {/* Highlight outline — pointer-transparent so it never blocks the
              hit-rect or the handles underneath/around it. */}
          <rect
            x={x}
            y={y}
            width={wMm}
            height={hMm}
            fill="none"
            stroke="#7c3aed"
            strokeWidth={unit}
            strokeDasharray={`${unit * 3},${unit * 2}`}
            pointerEvents="none"
          />

          {editable && (
            <>
              {/* Connector + rotate handle above the top edge. */}
              <line
                x1={cxMm}
                y1={y}
                x2={cxMm}
                y2={rotateY}
                stroke="#7c3aed"
                strokeWidth={unit}
                pointerEvents="none"
              />
              <circle
                cx={cxMm}
                cy={rotateY}
                r={handleR}
                fill="#ffffff"
                stroke="#7c3aed"
                strokeWidth={unit}
                pointerEvents="all"
                role="button"
                tabIndex={-1}
                aria-label="Повернуть элемент"
                style={{ cursor: "grab", touchAction: "none" }}
                onPointerDown={(e) => onRotatePointerDown(e, element)}
              />

              {/* Corner resize handles. */}
              {corners.map((c) => (
                <rect
                  key={c.handle}
                  x={c.px - handleR}
                  y={c.py - handleR}
                  width={handleR * 2}
                  height={handleR * 2}
                  fill="#ffffff"
                  stroke="#7c3aed"
                  strokeWidth={unit}
                  pointerEvents="all"
                  role="button"
                  tabIndex={-1}
                  aria-label={`Изменить размер: ${c.handle}`}
                  style={{ cursor: c.cur, touchAction: "none" }}
                  onPointerDown={(e) =>
                    onResizePointerDown(e, element, c.handle)
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </g>
  );
}

// ---- Legend ---------------------------------------------------------------

function Legend({
  cutouts,
  engraves,
  overlays,
}: {
  cutouts: number;
  engraves: number;
  overlays: number;
}) {
  if (cutouts === 0 && engraves === 0 && overlays === 0) {
    return (
      <p className="mt-2 text-[11px] text-gray-500">
        Добавьте элементы дизайна — они появятся на этой схеме.
      </p>
    );
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
      {overlays > 0 && <li>Накладок: {overlays}</li>}
      {engraves > 0 && <li>Гравировок: {engraves}</li>}
      {cutouts > 0 && <li>Вырезов: {cutouts}</li>}
    </ul>
  );
}
