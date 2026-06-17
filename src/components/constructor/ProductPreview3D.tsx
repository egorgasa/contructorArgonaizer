"use client";

import {
  Component,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import type { AppearanceInput } from "./ProductModel3D";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";

/**
 * three.js + @react-three/fiber rely on browser-only APIs (WebGL, window).
 * We dynamic-import the leaf viewer with ssr:false so Next.js doesn't try to
 * render it on the server, and so the heavy three.js bundle stays out of the
 * initial page payload.
 */
const ModelViewer3D = dynamic(() => import("./ModelViewer3D"), {
  ssr: false,
  loading: () => <ViewerSkeleton message="Загрузка 3D-предпросмотра…" />,
});

interface ProductPreview3DProps {
  productType?: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  wallThicknessMm: number;
  cornerRadiusMm?: number;
  sectionsCount: number;
  appearance?: AppearanceInput;
  /**
   * Unified visual scene. Drives the schematic overlays (base-shape footprint,
   * sections, holes/fasteners, design-element markers) so the 3D view reacts to
   * the same choices as the Design / 2D tabs.
   */
  scene?: ConstructorVisualScene;
  hasHoles?: boolean;
  hasFasteners?: boolean;
  /**
   * Rendered if the viewer fails to load (no WebGL / runtime error). The
   * caller typically passes a <ProductPreview2D> so users still see something
   * useful.
   */
  fallback?: ReactNode;
}

/**
 * Feature-detect WebGL once on the client. We can't do this during render
 * (SSR has no `document`) so we return `null` while detection is pending and
 * the caller renders a skeleton — this avoids a flash of the fallback before
 * the canvas mounts on machines that actually do support WebGL.
 */
function detectWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    // Try both WebGL2 and WebGL1; some older mobile browsers only expose v1.
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      // Legacy iOS Safari name; rare but cheap to check.
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

function useWebGLAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    setAvailable(detectWebGL());
  }, []);
  return available;
}

/**
 * Wraps the dynamic-imported ModelViewer3D in:
 *   1. a WebGL feature-detection gate (so unsupported browsers go straight to
 *      the 2D fallback without mounting three.js),
 *   2. an ErrorBoundary (so a runtime crash inside the Canvas tree degrades
 *      gracefully to the fallback instead of taking down the form),
 *   3. a Reset Camera overlay (UX affordance — drag-rotate is not obvious on
 *      touch devices).
 *
 * Mobile-conscious sizing: the canvas container is 320px tall on phones (the
 * Layer 10 spec asks for 300–360px) and grows on larger screens. `touch-none`
 * prevents page scrolling from stealing OrbitControls pinch/drag gestures.
 */
export function ProductPreview3D({
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
  fallback,
}: ProductPreview3DProps) {
  const webglAvailable = useWebGLAvailable();
  // Bumping this counter triggers a `controls.reset()` inside ModelViewer3D.
  // Kept as a number (not a boolean) so repeated clicks always re-run the
  // effect — a boolean toggle would no-op on the second click of a pair.
  const [resetCounter, setResetCounter] = useState(0);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          3D-предпросмотр
        </span>
        <span className="text-[11px] text-gray-400">Модель можно вращать</span>
      </div>

      <div className="relative h-[320px] w-full touch-none overflow-hidden rounded-lg bg-slate-50 sm:h-[380px] lg:h-[420px]">
        {webglAvailable === null ? (
          <ViewerSkeleton message="Проверяем поддержку 3D…" />
        ) : webglAvailable === false ? (
          <WebGLUnavailable fallback={fallback} />
        ) : (
          <ViewerErrorBoundary fallback={fallback}>
            <ModelViewer3D
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
              resetKey={resetCounter}
            />
            {/*
              Overlay sits on top of the Canvas. `pointer-events-none` on the
              wrapper lets OrbitControls keep getting drag events everywhere
              EXCEPT the button itself (which re-enables pointer events).
            */}
            <div className="pointer-events-none absolute right-2 top-2">
              <button
                type="button"
                onClick={() => setResetCounter((c) => c + 1)}
                className="pointer-events-auto rounded-md border border-gray-300 bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur transition hover:bg-white"
                aria-label="Сбросить камеру"
              >
                ↺ Сбросить камеру
              </button>
            </div>
          </ViewerErrorBoundary>
        )}
      </div>

      <div className="mt-2 space-y-0.5 px-2 pb-1 text-[11px] text-gray-500">
        <div>Перетащите, чтобы повернуть. Колесо / два пальца — масштаб.</div>
        <div>
          3D показывает упрощённую производственную геометрию: тело повторяет
          выбранную базовую форму, а отверстия, вырезы и петли отображаются
          схематично, без CAD/CSG. Точная раскладка — на вкладках «Дизайн
          изделия» и «2D-схема».
        </div>
      </div>
    </div>
  );
}

/**
 * Loading / SSR placeholder — same height as the canvas to avoid layout jump.
 * A small spinning indicator is more reassuring than a static "Loading…" label
 * when the three.js chunk takes a couple of seconds on a cold cache.
 */
function ViewerSkeleton({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 bg-slate-100 text-sm text-gray-500">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
      />
      <span>{message}</span>
    </div>
  );
}

/**
 * Shown when WebGL feature detection fails. We deliberately render the 2D
 * fallback inline (rather than just a notice) so the user still has a
 * geometric reference for what they're configuring.
 */
function WebGLUnavailable({ fallback }: { fallback?: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-sm text-gray-600">
      <div>
        Ваш браузер не поддерживает 3D-предпросмотр.
        <br />
        Заявку всё равно можно отправить.
      </div>
      {fallback && <div className="w-full">{fallback}</div>}
    </div>
  );
}

/**
 * React error boundary specialised for the 3D viewer. We deliberately catch
 * everything: WebGL context creation failures (post-detection), three.js
 * asset load errors and any runtime exceptions inside the Canvas tree all
 * bubble up here.
 *
 * If `fallback` is provided we render that (typically <ProductPreview2D /> so
 * the user keeps a visual reference). Otherwise we render an inline notice.
 */
interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class ViewerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // We don't want to break the form on a viewer crash, but we do want a
    // breadcrumb in devtools to help diagnose driver-specific failures.
    // eslint-disable-next-line no-console
    console.warn("[ProductPreview3D] viewer failed to render", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-sm text-gray-600">
          <div>3D-превью недоступно на этом устройстве, но заявку можно отправить.</div>
          {this.props.fallback && <div className="w-full">{this.props.fallback}</div>}
        </div>
      );
    }
    return this.props.children;
  }
}
