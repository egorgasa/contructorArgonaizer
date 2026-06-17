"use client";

import { useState } from "react";
import { ProductPreview2D } from "./ProductPreview2D";
import { ProductPreview3D } from "./ProductPreview3D";
import { DesignPreview } from "./DesignPreview";
import type { AppearanceInput } from "./ProductModel3D";
import { normalizeDesign, type DesignElement } from "@/lib/design";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";
import type { PrintRequestInput } from "@/lib/validations/print-request";

interface ProductPreviewTabsProps {
  productType?: string;
  shape: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  cornerRadiusMm: number;
  sectionsCount: number;
  appearance?: AppearanceInput;
  /**
   * Unified visual scene, derived from the form in the wizard. The Design tab
   * renders from this; the 2D / 3D tabs still consume the legacy props below
   * (migrated in later slices).
   */
  scene: ConstructorVisualScene;
  /**
   * Top-view design (base shape + overlay/engrave/cutout elements). Typed as
   * the form's input shape (everything optional) because that's what RHF's
   * `watch` returns before zod normalises it. We rebuild a fully-shaped
   * `DesignSettings` at the boundary before rendering.
   */
  design?: PrintRequestInput["design"];
  /** Selected design element id (UI-only). Highlights it on the Design tab. */
  selectedElementId?: string | null;
  /** When set, the Design tab becomes interactive (click an element to select). */
  onSelectElement?: (id: string) => void;
  /** When set, the selected element on the Design tab can be dragged (x/y). */
  onUpdateElement?: (id: string, patch: Partial<DesignElement>) => void;
  /** Legacy mounting flags — shown schematically on the Design tab. */
  hasHoles?: boolean;
  hasFasteners?: boolean;
}

type Tab = "3d" | "2d" | "design";

/**
 * Side-by-side switch between the lightweight SVG 2D schematic, the new
 * three.js 3D viewer, and the top-view "design" canvas.
 *
 * Defaults to the 3D tab. The 2D variant is always rendered as a fallback
 * inside <ProductPreview3D /> when WebGL is unavailable, so picking 3D never
 * leaves the user with an empty box.
 */
export function ProductPreviewTabs(props: ProductPreviewTabsProps) {
  // Default to the Design tab: it's the unified visual editor and the only view
  // that reflects every choice (form, material, colour, surface, decor, holes).
  const [tab, setTab] = useState<Tab>("design");

  // Normalised design — still used to decide the 3D "approximate" banner below.
  const design = normalizeDesign(props.design);

  // Props shared with the 2D preview component. The top view renders from the
  // unified `scene` (same as the Design tab); only the vertical axis / walls
  // come from the legacy numeric fields. Pulled out so both the standalone
  // "2D" tab and the WebGL-failure fallback below stay in sync.
  const previewProps2D = {
    productType: props.productType,
    scene: props.scene,
    heightMm: props.heightMm,
    wallThicknessMm: props.wallThicknessMm,
    hasHoles: props.hasHoles,
    hasFasteners: props.hasFasteners,
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Тип предпросмотра"
        className="mb-2 inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs"
      >
        <TabButton active={tab === "design"} onClick={() => setTab("design")}>
          Дизайн изделия
        </TabButton>
        <TabButton active={tab === "3d"} onClick={() => setTab("3d")}>
          3D-визуализация
        </TabButton>
        <TabButton active={tab === "2d"} onClick={() => setTab("2d")}>
          2D-схема
        </TabButton>
      </div>

      <p className="mb-2 text-[11px] leading-snug text-gray-500">
        {tab === "design" &&
          "Главный редактор: форма, материал, цвет, поверхность, рисунок, декор, отверстия и крепления. Элементы дизайна можно перетаскивать прямо на схеме."}
        {tab === "3d" &&
          "3D — приближённый предпросмотр объёма. Скругление, рисунок и вырезы точнее видны на вкладке «Дизайн изделия»."}
        {tab === "2d" &&
          "2D-схема — упрощённый контур формы сверху, без редактирования. Полный вид — на вкладке «Дизайн изделия»."}
      </p>

      {tab === "3d" && (
        <>
          {/* Honest approximation notice: the 3D body now follows the chosen
              base shape, but it's still an extruded silhouette — corner radius
              is segmented and holes / cutouts / hinges are schematic markers,
              not real CAD/CSG geometry. The exact top layout lives on the
              Design tab. */}
          {design.baseShape.kind !== "rectangle" && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
              3D показывает упрощённую производственную геометрию: тело повторяет
              базовую форму, но скругление и вырезы переданы приближённо, без
              CAD/CSG. Точную форму сверху смотрите на вкладке «Дизайн изделия».
            </div>
          )}
          <ProductPreview3D
            productType={props.productType}
            widthMm={props.widthMm}
            depthMm={props.depthMm}
            heightMm={props.heightMm}
            wallThicknessMm={props.wallThicknessMm}
            cornerRadiusMm={props.cornerRadiusMm}
            sectionsCount={props.sectionsCount}
            appearance={props.appearance}
            scene={props.scene}
            hasHoles={props.hasHoles}
            hasFasteners={props.hasFasteners}
            fallback={<ProductPreview2D {...previewProps2D} />}
          />
        </>
      )}
      {tab === "2d" && <ProductPreview2D {...previewProps2D} />}
      {tab === "design" && (
        <DesignPreview
          scene={props.scene}
          selectedElementId={props.selectedElementId}
          onSelectElement={props.onSelectElement}
          onUpdateElement={props.onUpdateElement}
          hasHoles={props.hasHoles}
          hasFasteners={props.hasFasteners}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1 font-medium transition ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
