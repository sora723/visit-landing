"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 화살표 1회 재생 후 확대 열림 — globals.css animation duration과 맞춤 */
export const ZOOM_EXPAND_ARROW_MS = 520;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 클릭 → 대각선 화살표 1회 → onZoom 호출.
 * key 리마운트 + CSS transform 으로 iOS/Safari 포함 재생 안정화.
 */
export function useZoomExpandClick(onZoom: () => void) {
  const [arrowKey, setArrowKey] = useState(0);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleZoomClick = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (busyRef.current) return;

      busyRef.current = true;
      setArrowKey((k) => k + 1);

      const delay = prefersReducedMotion() ? 0 : ZOOM_EXPAND_ARROW_MS;
      timerRef.current = setTimeout(() => {
        busyRef.current = false;
        onZoom();
      }, delay);
    },
    [onZoom]
  );

  return { arrowKey, handleZoomClick };
}

export function ZoomExpandArrow({ animationKey }: { animationKey: number }) {
  if (animationKey <= 0) return null;

  return (
    <span
      key={animationKey}
      className="zoom-diagonal-arrow pointer-events-none absolute left-1/2 top-1/2 z-20 -ml-4 -mt-4 h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </svg>
    </span>
  );
}

export function ZoomExpandHintBadge({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const size = compact
    ? "bottom-3 right-3 px-2.5 py-1 text-[10px]"
    : "bottom-4 right-4 px-3 py-1 text-[11px]";

  return (
    <span
      className={`pointer-events-none absolute z-10 rounded bg-[var(--color-navy)]/75 tracking-wide text-white/90 backdrop-blur-sm ${size} ${className}`}
    >
      클릭하여 확대
    </span>
  );
}
