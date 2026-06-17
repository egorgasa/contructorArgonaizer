# Constructor Visual Layer

Developer / operator handoff documentation for the **visual layer** of the
`/constructor` wizard. Describes the unified scene view model, how every preview
renders from it, how structured elements relate to the legacy fields, what is
exact vs. schematic, the MVP limitations, and the path to a production-ready
geometry/export pipeline.

> This documents **current behavior only**. The visual layer is an MVP: it
> produces a structured, human-reviewable description of the item, not
> manufacturing-ready geometry.

---

## Overview

Every preview (Design editor, 2D schematic, 3D, and the Review summary) reads
from **one derived view model**, the `ConstructorVisualScene`, instead of
re-deriving values from raw form state. This is the central architectural
decision of the layer: **build once, render everywhere**, so previews can never
drift from each other or from the Review summary.

- `buildConstructorVisualScene(form)` (in
  `src/lib/constructor-visual-scene.ts`) is a **pure, React-free** function that
  reads the form and returns the scene. It is **never serialized** into the
  payload — it is recomputed (memoized) wherever it is needed.
- The **legacy fields are preserved** for backward compatibility with server
  validation, the admin side, and old payloads:
  - `shape` (`rectangular` / `round` / `oval` / `custom`)
  - `widthMm`, `depthMm`, `heightMm`
  - `cornerRadiusMm`
  - `hasHoles` / `hasFasteners` / `hasDecoration` (+ their description fields)
  - `appearance.textDecoration` (the structured text bridge)
- The richer structured description lives in the `design` object
  (`baseShape` + `elements`) and `appearance` (`material` look, `pattern`,
  `textDecoration`). The wizard **mirrors a subset back onto the legacy fields**
  (see [Legacy field sync](#legacy-field-sync)) so nothing downstream breaks.
- **Constructive accessories** (handles) live in their own top-level
  `accessories: Accessory[]` array (model in `src/lib/accessories.ts`), kept
  **separate from `design.elements`**: an accessory is mounted on a side/face
  with a length + profile, unlike top-surface decor. They are normalised into
  `scene.accessories` and rendered schematically in 2D / 3D / Review.
- **Lid** ("крышка") is a top-level construction option (model in
  `src/lib/lid.ts`), kept **separate** from both accessories and design
  elements. It is normalised into `scene.lid` (a `VisualLid` or `null`) and
  rendered schematically in 2D / 3D / Review.

### Lid model

`LidSettings` (form) → `VisualLid | null` (scene):

| Field | Meaning |
| --- | --- |
| `enabled` | When `false`, `scene.lid` is `null` and nothing renders. |
| `type` | `flat` / `inset` / `hinged` (style; hinges are schematic only). |
| `fit` | `overlay` (sits on top, extends beyond the body by `overhangMm`) or `inset` (drops into the opening with a `clearanceMm` gap). |
| `thicknessMm` | Lid slab thickness (mm). |
| `overhangMm` | Outward overhang for `overlay` fit (mm). |
| `clearanceMm` | Technological gap for `inset` fit (mm). |

Rendering follows the **selected base shape** (`baseShape.kind`): the 2D top
view draws the lid contour with the same shape helper as the body
(`BaseShapePath`, expanded/shrunk by overhang/clearance); the 3D view extrudes
the same `outlinePoints` footprint into a thin slab. `custom` shapes fall back
to a bounding-box approximation. Lid is recommended primarily for container
types (box / tray / organizer) but is allowed on any product type.

**Exact vs. schematic:**

- *Exact-ish:* lid footprint follows the base shape; overhang / clearance /
  thickness are honoured proportionally; overlay vs. inset vertical placement is
  correct relative to the body top.
- *Schematic:* no boolean cut into the body, no real lip / tongue-and-groove,
  hinge barrels are decorative cylinders (no axis, no swing), and the inset gap
  is visual only — not validated against wall thickness.

**Future work (lid):**

- real hinge mechanics (axis, swing, clearance to walls);
- lid-fit validation (clearance vs. wall thickness, minimum lip);
- manufacturing export of the lid as a separate body / STEP.

---

## The scene view model

Defined in `src/lib/constructor-visual-scene.ts`:

```ts
interface ConstructorVisualScene {
  baseShape: DesignBaseShape;   // top-view base geometry (always fully shaped)
  material: VisualMaterial;     // surface look of the body
  sections: VisualSections;     // internal compartments
  elements: DesignElement[];    // editable overlay / engrave / cutout elements
  warnings: VisualWarning[];    // operator notes / MVP limitations
}

interface VisualMaterial {
  fill: string; stroke: string; strokeWidth: number;
  baseOpacity: number; isGlossy: boolean; isTextured: boolean;
  isSemiTransparent: boolean; finish: MaterialFinish;
  pattern: VisualMaterialPattern;  // { active, type, color, opacity, scale, tile, placement, isCustom }
  text: VisualMaterialText;        // schematic surface text (suppressed when a structured text element exists)
}

interface VisualSections {
  count: number;
  orientation: "vertical" | "horizontal" | "grid";
  partitions: VisualPartition[];   // max(count - 1, 0) walls; id `section-v-${i}`, position i/count
}

interface VisualWarning {
  code: VisualWarningCode;   // design | rectangleRadiusIgnored | semiTransparentApprox
                             // | patternCustom | patternDominatesColor | textSchematic | schematicFeatures
  message: string;           // ready-to-render Russian operator note
}
```

`baseShape` / `elements` types live in `src/lib/design.ts` (also React-free):

```ts
interface DesignElement {
  id: string;
  type: "image" | "decor" | "shape" | "text";
  mode: "overlay" | "engrave" | "cutout";
  x: number; y: number;          // center, normalized 0..1 of base bbox
  width: number; height: number; // normalized 0..1 of base bbox
  rotation?: number;             // degrees clockwise about center; 0 if absent
  source?: DesignElementSource;  // provenance (see below); defaults to "user"
  locked?: boolean;              // system elements the user can't restructure
  // type-specific: imageDataUrl / decorShape / text / fill / stroke ...
}
```

### Element source (provenance)

`DESIGN_ELEMENT_SOURCES = ["user","holes","fasteners","decor","textDecoration","logo","legacy"]`.
`elementSource(el)` defaults to `"user"`. Labels in `DESIGN_SOURCE_LABELS`:

| Source | Label | Origin |
| --- | --- | --- |
| `user` | Элемент | Manually added in the editor (image/decor/shape/text). |
| `holes` | Отверстие | Auto-created by the **Отверстия** toggle. |
| `fasteners` | Крепление | Auto-created by the **Крепления** toggle. |
| `decor` | Декор | Auto-created by the **Декор** toggle. |
| `textDecoration` | Текст | Bridged from `appearance.textDecoration`. |
| `logo` | Логотип | Reserved for a logo bridge. |
| `legacy` | Элемент | Reconstructed from an old payload by `normalizeDesign`. |

Source drives behavior: system elements (`holes` / `fasteners`) are **locked**
(no mode/type editing); `textDecoration` is **managed** (edited via the text
block, not the element editor); deleting the last element of a source
**reverse-syncs** its legacy flag to `false`.

---

## Files

| File | Responsibility |
| --- | --- |
| `src/lib/constructor-visual-scene.ts` | **React-free** scene builder. `buildConstructorVisualScene(form)` → `{ baseShape, material, sections, elements, warnings }`. The single source of truth for all previews. |
| `src/lib/design.ts` | React-free domain module: element/shape types, source catalogue + labels, base-shape catalogue, computed helpers (`effectiveCornerRadius`, `shapeUsesCornerRadius`, `countElementsBySource`, `groupDesignElementsByMode`), legacy interop, normalization, summary helpers. |
| `src/components/constructor/visual/SceneSvgRenderer.tsx` | **Shared SVG rendering** of the scene: `BaseShapePath`, `ElementPath`, `DecorShapePath`, `SurfacePattern`, `SceneStaticLayers` (read-only defs + clipped/masked layers), `ConstructorSceneSvg` (self-contained svg). Consumed by both the Design editor and the 2D schematic so they render identically. |
| `src/components/constructor/SceneOverlays3D.tsx` | **Variant-B schematic 3D overlays** (footprint silhouette, top outline, section planes, hole/fastener markers, element box markers) layered over the product-type body. Skips `source: "textDecoration"` (drawn face-anchored by `TextDecoration3D`). |
| `src/components/constructor/DesignPreview.tsx` | Top-view **Design editor**: renders `<SceneStaticLayers>` + an interactive UI-only overlay (select / drag / resize / rotate). |
| `src/components/constructor/ProductPreview2D.tsx` | 2D schematic: top view = `<ConstructorSceneSvg>`; front view = legacy per-`productType` schematic. |
| `src/components/constructor/ProductPreview3D.tsx` | three.js viewer; WebGL detection with a 2D fallback via `ErrorBoundary`. |
| `src/components/constructor/ProductModel3D.tsx` | Dispatches the per-`productType` mesh + `SceneOverlays3D` + `TextDecoration3D`. |
| `src/components/constructor/ProductPreviewTabs.tsx` | Tab switcher: **Дизайн изделия** / **3D-визуализация** / **2D-схема**. |
| `src/components/constructor/DesignElementsEditor.tsx` | Element-list editor (add/select/edit/delete) + quick controls; respects locked/managed sources. |
| `src/components/constructor/ConstructorStepDimensions.tsx` | Dimensions + shape step; writes `design.baseShape` and mirrors to legacy fields. |
| `src/components/constructor/ConstructorStepFeatures.tsx` | Hosts the editor + the holes/fasteners/decor/pattern/text controlled toggles and bridges. |
| `src/components/constructor/ConstructorStepReview.tsx` | Final review; builds the scene and renders the summary + `DesignManufacturingSummary`. |
| `src/components/constructor/DesignManufacturingSummary.tsx` | Presentation-only manufacturing summary on the Review step; consumes the `scene`. |

---

## Base shapes

| Kind | Label | Corner radius | Notes |
| --- | --- | --- | --- |
| `rectangle` | Прямоугольник | reports "нет" | Straight corners. |
| `roundedRectangle` | Скруглённый прямоугольник | **editable** | Clamped to `[0, min(w,h)/2]`. |
| `circle` | Круг | n/a | Smaller of w/h as diameter, centered. |
| `oval` | Овал | n/a | Ellipse filling the bbox. |
| `pill` | Пилюля | **computed** | Always `min(w,h)/2`; the slider is irrelevant. |
| `custom` | Кастомная форма | n/a | **Disabled in the MVP** ("Скоро: редактор контура"). |

Helpers in `design.ts`:

- `shapeUsesCornerRadius(kind)` → `true` **only** for `roundedRectangle`. The
  corner-radius control is shown only for that kind; switching away zeroes the
  radius (with `shouldValidate`) so there is no stale validation.
- `effectiveCornerRadius(shape)` → `pill` returns `min/2`; rectangle/rounded
  clamp to `[0, min/2]`; everything else `0`.

---

## Element modes

| Mode | Label | Meaning | Rendering |
| --- | --- | --- | --- |
| `overlay` | Нанесение | Applied on top of the surface. | Clipped to the base shape so it reads as "on the surface". |
| `engrave` | Гравировка | Etched **approximation**. | Outlines; engraved images desaturated + dimmed. |
| `cutout` | Вырезы / отверстия | Material removed (a hole). | Real SVG `<mask>` hole + dashed outline; in 3D, a marker. |

Cutout semantics:

- **decor / text / shape cutouts** are real SVG `<mask>` holes (white = visible
  material, black = hole) — they genuinely punch through the rendered body.
- **image cutout** is a **bounding-box hole in the MVP**, not alpha-channel
  tracing.
- **Exact manufacturing geometry is still an operator / production step** — the
  preview is schematic.

---

## What is exact vs. schematic

**Exact (top-view 2D / Design editor):**

- Base shape outline and corner radius for the rectangular family + circle/oval.
- Element placement, size, rotation (normalized, resolution-independent).
- decor/text/shape cutouts as real mask holes.
- Surface fill colour, pattern overlay, section partition lines.

**Schematic / approximate (3D and front view):**

- The 3D body is driven by **`productType`**, not the chosen base shape — the
  base shape and corner radius are shown as a contour overlay via
  `SceneOverlays3D`, not as true geometry. A banner makes this explicit for any
  non-rectangle shape.
- Hole / fastener / element positions in 3D are **box/marker overlays**.
- `pill` 3D is approximate (its top view is exact).
- Image engrave is a grayscale approximation; image cutout is a bbox hole.
- Surface text in 3D is face-anchored via `TextDecoration3D`, schematic.
- The surface **pattern IS shown in 3D** as an approximate material texture: a
  `CanvasTexture` (`createPatternTexture`) applied via `useAppearanceMaterial`'s
  `forRole`, placement-gated (front / sides / top / all). Built-in pattern types
  only — `custom` patterns paint no texture in 3D (operator-confirmed).

---

## Avoiding double-render of text

`appearance.textDecoration` is bridged into a structured `source:"textDecoration"`
element. To avoid drawing the text twice, the scene builder computes
`hasStructuredText` and **suppresses `material.text`** when a structured text
element exists; `SceneOverlays3D` likewise **skips the text box marker** (the
text is drawn by `TextDecoration3D`). Edit the text via the text block; the
element stays in sync without a feedback loop.

---

## Legacy field sync

`ConstructorStepDimensions.tsx` keeps `design.baseShape` and the legacy fields in
step (kind ↔ `shape`, width/depth ↔ `widthMm`/`heightMm`, radius re-clamped).
`ConstructorStepFeatures.tsx` keeps the **toggle ⇄ element** relationship:

- Enabling a toggle (holes / fasteners / decor / text) **creates and selects** a
  structured element with the matching `source`.
- Disabling it **removes** that source's elements.
- Deleting the **last** element of a source in the editor **reverse-syncs** its
  legacy flag (`hasHoles` / `hasFasteners` / `hasDecoration` /
  `textDecoration.enabled`) back to `false`.

All side-effect toggles use the **controlled-toggle** pattern (`checked` +
`onCheckedChange`, writes only inside event handlers — no `useEffect`, no loops).

`legacyShapeToBaseKind` / `designFromLegacy` / `normalizeDesign` handle the
reverse direction for **old payloads** that predate the visual layer — including
reconstructing `source:"legacy"` elements and `showLegacyHole` /
`showLegacyFasteners` fallback markers (drawn only when the flag is set **and**
there is no structured element of that source, so there's no duplication).

---

## Review & payload

`ConstructorStepReview.tsx` builds the scene and **renders from it** (shape,
material, sections, warnings) so the Review can't drift from the editor.
`DesignManufacturingSummary.tsx` is presentation-only — it takes the `scene`,
groups elements by mode with counts, shows base shape / dimensions / radius /
swatches, and surfaces `scene.warnings`. **No raw image dataUrl is ever shown**
(`formatDesignElementSummary` → `[изображение]` / `[не загружен]`).

Payload (`POST /api/requests`, `JSON.stringify(data)`): contains the structured
`design` + `appearance` **and** all legacy fields. It **excludes** UI-only state
— the `scene` (recomputed, never serialized), `selectedElementId` (React
`useState`), and any interaction bookkeeping.

---

## Known limitations (MVP)

- No real CAD boolean operations; no STL / STEP / PDF export.
- 3D body follows `productType`, not the base shape (contour overlay only).
- Image cutout uses the bounding box, not alpha tracing.
- Image engrave is a grayscale approximation.
- `custom` shape is **disabled** (contour editor not yet built).
- `pill` 3D preview is approximate.
- No snapping / grid / guides; no multi-select / layers; no undo / redo.
- No backend image upload (images live in-payload as data URLs).

---

## Future roadmap

1. Real backend image upload (replace in-payload data URLs).
2. Custom-contour shape editor (enable the `custom` base shape).
3. Vectorization / alpha-mask support for image cutouts and engraves.
4. Real geometry / export layer (STL / STEP / PDF).
5. True 3D body from the base shape + boolean cutouts/engraves.
6. Snapping / grid / guides; multi-select / layers; undo / redo.
7. Admin / operator rendering of the scene + production file generation.

---

## Architecture rules

Keep these invariants when extending the visual layer:

- **`constructor-visual-scene.ts` and `design.ts` must stay React-free** (usable
  by validators, previews, and future CAD/operator tooling).
- **Every preview reads from the scene** — do not re-derive material/shape/
  section values in a component. Add to the scene builder instead.
- **UI-only state must not enter the payload** (`scene`, `selectedElementId`,
  interaction bookkeeping).
- **Keep the legacy fields** until the backend and admin read `design` directly.
- **All SVG ids must be stable** (`useId`) — no hydration mismatches.
- **No `Math.random()` / `Date.now()` / `window` / `document` in render.** Id
  generation (`generateDesignElementId`) and WebGL detection (`detectWebGL`) are
  allowed only inside event handlers / effects.
- **Do not fake a cutout with a background-coloured overlay.** Cutouts must stay
  real `<mask>` holes with `mode: "cutout"` so a real geometry step can act on
  them later.
- **`/forms/*` is out of scope** — never modify it from the constructor layer.
