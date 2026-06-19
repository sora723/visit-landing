"use client";

import { Expand } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/useResponsiveImage";

const ZOOM_HINT_STORAGE_KEY = "visit-landing:image-zoom-hint-seen";
const ZOOM_HINT_AUTO_DISMISS_MS = 3000;
const ZOOM_HINT_FADE_MS = 500;

type ZoomHintState = {
  visible: boolean;
  fading: boolean;
};

let zoomHintState: ZoomHintState = { visible: false, fading: false };
let zoomHintDismissed = false;
let zoomHintTimersStarted = false;
const zoomHintListeners = new Set<(state: ZoomHintState) => void>();

function emitZoomHintState() {
  zoomHintListeners.forEach((listener) => listener(zoomHintState));
}

function markZoomHintSeen() {
  try {
    localStorage.setItem(ZOOM_HINT_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function hasSeenZoomHint(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ZOOM_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissZoomHintGlobal() {
  if (zoomHintDismissed) return;
  zoomHintDismissed = true;
  markZoomHintSeen();
  zoomHintState = { visible: false, fading: false };
  emitZoomHintState();
}

function startZoomHintTimers() {
  if (zoomHintTimersStarted || zoomHintDismissed || hasSeenZoomHint()) return;
  zoomHintTimersStarted = true;
  zoomHintState = { visible: true, fading: false };
  emitZoomHintState();

  window.setTimeout(() => {
    if (zoomHintDismissed) return;
    zoomHintState = { ...zoomHintState, fading: true };
    emitZoomHintState();
  }, ZOOM_HINT_AUTO_DISMISS_MS);

  window.setTimeout(() => {
    dismissZoomHintGlobal();
  }, ZOOM_HINT_AUTO_DISMISS_MS + ZOOM_HINT_FADE_MS);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 최초 방문 또는 3초 후 자동 fade out (모든 확대 이미지 공통) */
export function useZoomExpandHint() {
  const [state, setState] = useState<ZoomHintState>(zoomHintState);

  useEffect(() => {
    const listener = (next: ZoomHintState) => setState(next);
    zoomHintListeners.add(listener);
    setState(zoomHintState);

    if (!zoomHintDismissed && !hasSeenZoomHint()) {
      startZoomHintTimers();
    }

    return () => {
      zoomHintListeners.delete(listener);
    };
  }, []);

  const dismissHint = useCallback(() => {
    dismissZoomHintGlobal();
  }, []);

  return {
    hintVisible: state.visible,
    hintFading: state.fading,
    dismissHint,
  };
}

/** 클릭 → 힌트 즉시 숨김 → 라이트박스 열림 */
export function useZoomExpandClick(
  onZoom: () => void,
  dismissHint?: () => void
) {
  const handleZoomClick = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      dismissHint?.();
      onZoom();
    },
    [dismissHint, onZoom]
  );

  return { handleZoomClick };
}

/** 확대 가능 이미지 — 우하단 Expand 아이콘 + 모바일 텍스트 */
export function ZoomExpandHint({
  visible,
  fading = false,
  compact = false,
}: {
  visible: boolean;
  fading?: boolean;
  compact?: boolean;
}) {
  const isMobile = useIsMobile();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, []);

  if (!visible) return null;

  const pos = compact ? "bottom-2 right-2" : "bottom-3 right-3 sm:bottom-4 sm:right-4";
  const iconSize = compact ? "h-7 w-7" : "h-8 w-8 sm:h-9 sm:w-9";
  const glyphSize = compact ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-[18px] sm:w-[18px]";

  return (
    <div
      className={`pointer-events-none absolute z-10 flex flex-col items-end gap-1 transition-opacity duration-500 ${pos} ${
        fading ? "opacity-0" : "opacity-80"
      }`}
      aria-hidden
    >
      {isMobile && (
        <span className="rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white">
          클릭하여 확대
        </span>
      )}
      <span
        className={`zoom-expand-hint-icon flex items-center justify-center rounded-full bg-black/50 ${iconSize} ${
          reduceMotion ? "" : "zoom-expand-hint-icon--pulse"
        }`}
      >
        <Expand className={`${glyphSize} text-white`} strokeWidth={2.5} aria-hidden />
      </span>
    </div>
  );
}

/** @deprecated ZoomExpandHint 사용 */
export function ZoomExpandHintLabel({
  visible = true,
  fading = false,
  compact = false,
}: {
  visible?: boolean;
  fading?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return <ZoomExpandHint visible={visible} fading={fading} compact={compact} />;
}

export function ZoomLightboxImageFrame({
  children,
  className = "",
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex max-h-[92vh] max-w-full items-center justify-center ${className}`}
    >
      {children}
    </div>
  );
}
