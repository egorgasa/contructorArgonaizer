import * as THREE from "three";
import type { PatternType } from "@/lib/appearance";

/**
 * Canvas dimension used for every procedural pattern tile. A power of two keeps
 * mipmapping happy on most GPUs without being so large that small previews
 * (mobile, low-DPI) waste GPU memory.
 */
const CANVAS_SIZE = 256;

/**
 * Default repeat factor at `scale = 1`. The user's `scale` slider modulates
 * this inversely so a bigger scale = bigger pattern features = fewer repeats.
 */
const BASE_REPEAT = 2;

export interface CreatePatternTextureOptions {
  type: PatternType;
  /** Hex literal "#RRGGBB" — filled before the pattern is drawn on top. */
  baseColor: string;
  /** Hex literal "#RRGGBB" — used as the pattern's foreground colour. */
  patternColor: string;
  /** 0.5 .. 5 — larger values produce larger features. */
  scale: number;
  /** 0 .. 1 — alpha used when stamping the pattern over the base fill. */
  opacity: number;
}

/**
 * Build a procedural `THREE.CanvasTexture` for one of the supported patterns.
 *
 * Returns `null` for `none` (and `custom`, which has no procedural meaning) so
 * callers can branch on the result and skip the texture path entirely when
 * the user has no pattern selected.
 *
 * Notes:
 *  - The base colour is painted *into* the canvas before the pattern, so the
 *    resulting texture can be used as a `map` on a material whose own colour
 *    is set to white. That avoids double-tinting the user's chosen base hex.
 *  - `wrapS` / `wrapT` are set to `RepeatWrapping` so callers don't have to
 *    remember; `repeat` is pre-scaled by the user's `scale` slider.
 *  - When called in a non-DOM environment (SSR / tests) we bail out and let
 *    the caller fall back to the plain material spec.
 */
export function createPatternTexture(
  opts: CreatePatternTextureOptions,
): THREE.CanvasTexture | null {
  if (opts.type === "none" || opts.type === "custom") return null;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Base fill — the underlying body colour shows through wherever the
  //    pattern doesn't paint over it.
  ctx.fillStyle = opts.baseColor;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 2. Pattern. globalAlpha modulates the stamping intensity so the user's
  //    opacity slider visibly blends the pattern colour with the base.
  ctx.globalAlpha = clamp01(opts.opacity);
  ctx.fillStyle = opts.patternColor;
  ctx.strokeStyle = opts.patternColor;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Safety clamp — the Zod schema guarantees [0.5, 5] but defensive math here
  // lets us survive a stale form snapshot or a server-rendered payload.
  const s = clamp(opts.scale, 0.3, 6);

  switch (opts.type) {
    case "stripes":
      drawStripes(ctx, s);
      break;
    case "dots":
      drawDots(ctx, s);
      break;
    case "grid":
      drawGrid(ctx, s);
      break;
    case "honeycomb":
      drawHoneycomb(ctx, s);
      break;
    case "waves":
      drawWaves(ctx, s);
      break;
    default:
      // Unknown / future pattern type — leave the canvas as a plain base fill
      // so the caller still gets a usable texture rather than null.
      break;
  }

  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // Higher scale → fewer repeats per UV unit (bigger pattern). Clamped so even
  // extreme values keep the texture tiling rather than stretching infinitely.
  const repeats = clamp(BASE_REPEAT / s, 0.5, 8);
  texture.repeat.set(repeats, repeats);
  texture.needsUpdate = true;
  texture.anisotropy = 4;

  return texture;
}

// ───────────────────────── pattern renderers ─────────────────────────

function drawStripes(ctx: CanvasRenderingContext2D, s: number) {
  // Diagonal stripes. Period and stripe width scale with the user's slider.
  const period = Math.max(8, Math.round(32 * s));
  const stripeWidth = Math.max(2, period / 2);

  ctx.save();
  ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  ctx.rotate(Math.PI / 4); // 45° — visually unambiguous as "stripes"
  // Cover the diagonal extent so the rotated rectangles paint over the whole
  // (un-rotated) canvas.
  const extent = CANVAS_SIZE * 1.6;
  for (let x = -extent; x < extent; x += period) {
    ctx.fillRect(x, -extent, stripeWidth, extent * 2);
  }
  ctx.restore();
}

function drawDots(ctx: CanvasRenderingContext2D, s: number) {
  const spacing = Math.max(12, Math.round(40 * s));
  const radius = Math.max(2, spacing * 0.18);
  // Offset by half-spacing so the dot grid centres cleanly inside the canvas.
  for (let y = spacing / 2; y < CANVAS_SIZE + spacing; y += spacing) {
    for (let x = spacing / 2; x < CANVAS_SIZE + spacing; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, s: number) {
  const spacing = Math.max(12, Math.round(40 * s));
  // Line thickness scales lightly with spacing so a coarse grid still reads.
  ctx.lineWidth = Math.max(1, Math.round(spacing * 0.06));
  for (let x = 0; x <= CANVAS_SIZE; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CANVAS_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_SIZE; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(CANVAS_SIZE, y + 0.5);
    ctx.stroke();
  }
}

function drawHoneycomb(ctx: CanvasRenderingContext2D, s: number) {
  // Flat-bottom hexagons in a brick-style staggered grid. Side = 16*s,
  // horizontal step = sqrt(3)*side, vertical step = 1.5*side.
  const side = Math.max(6, Math.round(16 * s));
  const w = Math.sqrt(3) * side; // hex width (flat-to-flat / row stride)
  const h = 1.5 * side; // vertical centre-to-centre distance between rows
  ctx.lineWidth = Math.max(1, Math.round(side * 0.1));

  // Iterate one row past each edge so partial cells along borders still draw.
  const rowsExtent = Math.ceil(CANVAS_SIZE / h) + 2;
  const colsExtent = Math.ceil(CANVAS_SIZE / w) + 2;
  for (let row = -1; row < rowsExtent; row++) {
    const cy = row * h;
    const offset = row % 2 === 0 ? 0 : w / 2;
    for (let col = -1; col < colsExtent; col++) {
      const cx = col * w + offset;
      drawHexagon(ctx, cx, cy, side);
    }
  }
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  side: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    // Pointy-top hexagons: angles at 30°, 90°, 150°, ... (clockwise).
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const px = cx + side * Math.cos(a);
    const py = cy + side * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawWaves(ctx: CanvasRenderingContext2D, s: number) {
  const amplitude = Math.max(4, 10 * s);
  const wavelength = Math.max(20, 48 * s);
  const rowSpacing = Math.max(16, 32 * s);
  ctx.lineWidth = Math.max(1, Math.round(1 + s * 0.8));
  for (let y0 = 0; y0 <= CANVAS_SIZE + rowSpacing; y0 += rowSpacing) {
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_SIZE; x += 2) {
      const y = y0 + Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// ───────────────────────── helpers ─────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v: number) {
  return clamp(v, 0, 1);
}
