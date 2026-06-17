"use client";

import { useMemo } from "react";
import { effectiveCornerRadius, isApproximateLegacyShape } from "@/lib/design";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";
import { ConstructorSceneSvg } from "./visual/SceneSvgRenderer";

interface Props {
  productType?: string;
  /**
   * Unified visual scene. The top view ("вид сверху") is rendered straight
   * from here via the shared <ConstructorSceneSvg>, so the 2D schematic and the
   * interactive Design tab show the exact same silhouette, colour, surface,
   * sections, holes and design elements — they can never drift apart.
   */
  scene: ConstructorVisualScene;
  /**
   * Vertical (3rd) axis + wall thickness. These are NOT carried by the scene's
   * top-view base shape, so the front view still reads them from the form.
   */
  heightMm: number;
  wallThicknessMm: number;
  /** Legacy mounting flags — drawn schematically on the top view. */
  hasHoles?: boolean;
  hasFasteners?: boolean;
}

/**
 * Simple SVG 2D preview: a shared top view (вид сверху) plus a per-product-type
 * front view (вид спереди) showing the vertical axis and walls. The top view is
 * the unified scene; the front view is a lightweight schematic of height/walls.
 *
 * Read-only: no selection, drag, resize or rotate — that lives on the Design
 * tab. This is a confirmation schematic, not an editor.
 */
export function ProductPreview2D({
  productType,
  scene,
  heightMm,
  wallThicknessMm,
  hasHoles,
  hasFasteners,
}: Props) {
  const { baseShape, sections } = scene;
  const widthMm = baseShape.widthMm;
  const depthMm = baseShape.heightMm;
  const kind = baseShape.kind;
  const isCustomShape = kind === "custom";
  const radiusMm = effectiveCornerRadius(baseShape);

  // Front view lives in its own pixel-space SVG (the top view is mm-space inside
  // ConstructorSceneSvg). We scale the vertical axis the same way the old
  // combined preview did so stroke widths stay readable.
  const front = useMemo(() => {
    const PAD = 20;
    const maxSide = Math.max(widthMm || 1, heightMm || 1, 100);
    const scale = 200 / maxSide;
    const w = Math.max(widthMm * scale, 20);
    const h = Math.max(heightMm * scale, 20);
    const wall = Math.max(wallThicknessMm * scale, 2);
    return {
      viewBox: `0 0 ${PAD * 2 + w} ${PAD * 2 + h}`,
      box: { x: PAD, y: PAD, w, h, wall },
    };
  }, [widthMm, heightMm, wallThicknessMm]);

  const frontShape = renderFrontShape({
    productType,
    front: front.box,
    isCustomShape,
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          2D-предпросмотр
        </div>
        <div className="text-xs text-gray-500">{productTypeLabel(productType)}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Top view — the shared scene. */}
        <figure className="m-0">
          <figcaption className="mb-1 text-[11px] text-gray-500">
            Вид сверху · Ш {Math.round(widthMm) || 0} × Г {Math.round(depthMm) || 0} мм
          </figcaption>
          <ConstructorSceneSvg
            scene={scene}
            hasHoles={hasHoles}
            hasFasteners={hasFasteners}
            ariaLabel="2D-схема: вид сверху"
          />
        </figure>

        {/* Front view — vertical axis + walls (not part of the top-view scene). */}
        <figure className="m-0">
          <figcaption className="mb-1 text-[11px] text-gray-500">
            Вид спереди · В {Math.round(heightMm) || 0} мм · стенка{" "}
            {wallThicknessMm || 0} мм
          </figcaption>
          <svg
            viewBox={front.viewBox}
            className="h-auto w-full"
            role="img"
            aria-label="2D-схема: вид спереди"
            xmlns="http://www.w3.org/2000/svg"
          >
            {frontShape}
          </svg>
        </figure>
      </div>

      <div className="mt-2 space-y-0.5 text-xs text-gray-500">
        {radiusMm > 0 && <div>Скругление углов: {Math.round(radiusMm)} мм</div>}
        {sections.count > 1 && (
          <div>
            Секций: {sections.count} ({sections.partitions.length} перегородок)
          </div>
        )}
        {productType === "stand" && (
          <div>Поверхность подставки показана условно с наклоном</div>
        )}
        {productType === "box" && <div>Тонкая линия сверху — крышка</div>}
        {productType === "tray" && <div>Невысокие борта показаны редуцированно</div>}
        {(productType === "custom" || productType === "other" || isCustomShape) && (
          <div>Произвольная форма — показана как габаритный бокс</div>
        )}
        {isApproximateLegacyShape(kind) && (
          <div>Форма «пилюля»: вид сверху точный, вид спереди и 3D — приближённо.</div>
        )}
      </div>
    </div>
  );
}

/** Front-view rendering — varies by product type. */
function renderFrontShape(args: {
  productType?: string;
  front: { x: number; y: number; w: number; h: number; wall: number };
  isCustomShape: boolean;
}) {
  const { productType, front, isCustomShape } = args;

  if (isCustomShape || productType === "custom" || productType === "other") {
    return (
      <g>
        <rect
          x={front.x}
          y={front.y}
          width={front.w}
          height={front.h}
          className="fill-white stroke-gray-400"
          strokeWidth={1.25}
          strokeDasharray="5,4"
        />
      </g>
    );
  }

  if (productType === "stand") {
    // Tilted plate: parallelogram.
    const tilt = Math.min(front.w * 0.18, 24);
    const baseY = front.y + front.h;
    const points = [
      [front.x, baseY],
      [front.x + front.w - tilt, baseY],
      [front.x + front.w, front.y + tilt * 0.5],
      [front.x + tilt, front.y + tilt * 0.5],
    ]
      .map((p) => p.join(","))
      .join(" ");
    return (
      <g>
        <polygon
          points={points}
          className="fill-white stroke-brand-600"
          strokeWidth={1.5}
        />
        {/* base line */}
        <line
          x1={front.x}
          y1={baseY}
          x2={front.x + front.w}
          y2={baseY}
          className="stroke-gray-400"
          strokeWidth={0.75}
        />
      </g>
    );
  }

  if (productType === "tray") {
    // Low walls — visually clamp the front height to a low strip.
    const lowH = Math.max(front.h * 0.35, 14);
    const lowY = front.y + front.h - lowH;
    return (
      <g>
        <rect
          x={front.x}
          y={lowY}
          width={front.w}
          height={lowH}
          className="fill-white stroke-brand-600"
          strokeWidth={1.5}
        />
        {/* base hint */}
        <line
          x1={front.x + 2}
          y1={lowY + lowH - front.wall}
          x2={front.x + front.w - 2}
          y2={lowY + lowH - front.wall}
          className="stroke-brand-400"
          strokeWidth={1}
          strokeDasharray="3,2"
        />
      </g>
    );
  }

  if (productType === "divider") {
    // A thin slab.
    const slabW = Math.max(front.w * 0.18, 10);
    const slabX = front.x + (front.w - slabW) / 2;
    return (
      <g>
        <rect
          x={slabX}
          y={front.y}
          width={slabW}
          height={front.h}
          className="fill-white stroke-brand-600"
          strokeWidth={1.5}
        />
      </g>
    );
  }

  if (productType === "box") {
    // Outer rect + thin lid line near the top.
    const lidGap = Math.min(front.h * 0.12, 10);
    return (
      <g>
        <rect
          x={front.x}
          y={front.y}
          width={front.w}
          height={front.h}
          className="fill-white stroke-brand-600"
          strokeWidth={1.5}
        />
        <line
          x1={front.x}
          y1={front.y + lidGap}
          x2={front.x + front.w}
          y2={front.y + lidGap}
          className="stroke-brand-500"
          strokeWidth={1}
          strokeDasharray="4,3"
        />
        {front.wall > 2 &&
          front.w > 2 * front.wall + 6 &&
          front.h > front.wall + lidGap + 6 && (
            <rect
              x={front.x + front.wall}
              y={front.y + lidGap + front.wall}
              width={front.w - 2 * front.wall}
              height={front.h - lidGap - front.wall}
              className="fill-gray-100 stroke-brand-400"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
          )}
      </g>
    );
  }

  // organizer / default: outer rect + inner cavity hint.
  return (
    <g>
      <rect
        x={front.x}
        y={front.y}
        width={front.w}
        height={front.h}
        className="fill-white stroke-brand-600"
        strokeWidth={1.5}
      />
      {front.wall > 2 &&
        front.w > 2 * front.wall + 6 &&
        front.h > front.wall + 6 && (
          <rect
            x={front.x + front.wall}
            y={front.y + front.wall}
            width={front.w - 2 * front.wall}
            height={front.h - front.wall}
            className="fill-gray-100 stroke-brand-400"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
    </g>
  );
}

function productTypeLabel(value?: string): string {
  switch (value) {
    case "organizer":
      return "Органайзер";
    case "box":
      return "Коробка";
    case "tray":
      return "Лоток";
    case "stand":
      return "Подставка";
    case "divider":
      return "Разделитель";
    case "custom":
      return "Кастомная фигура";
    case "other":
      return "Другое";
    default:
      return "";
  }
}
