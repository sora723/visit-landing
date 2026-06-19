"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 클릭 → 라이트박스 열림 + 확대 아이콘 펄스 3회 */
export function useZoomExpandClick(onZoom: (arrowKey: number) => void) {
  const arrowKeyRef = useRef(0);
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
      const nextKey = arrowKeyRef.current + 1;
      arrowKeyRef.current = nextKey;

      const delay = prefersReducedMotion() ? 0 : 80;
      timerRef.current = setTimeout(() => {
        busyRef.current = false;
        onZoom(nextKey);
      }, delay);
    },
    [onZoom]
  );

  return { handleZoomClick };
}

/** 썸네일 — 클릭하여 확대 */
export function ZoomExpandHintLabel({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pos = compact ? "bottom-3 right-3" : "bottom-4 right-4";
  const textSize = compact ? "text-[10px] px-2.5 py-1" : "text-[11px] px-3 py-1";

  return (
    <span
      className={`pointer-events-none absolute z-10 rounded bg-[var(--color-navy)]/75 tracking-wide text-white/90 backdrop-blur-sm ${pos} ${textSize} ${className}`}
    >
      클릭하여 확대
    </span>
  );
}

/** 라이트박스 — 우상 ↗ · 좌하 ↙ 흰색 반투명 확대 화살표 3회 */
function CornerExpandArrowSvg({ direction }: { direction: "tr" | "bl" }) {
  if (direction === "tr") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 7 7 17" />
      <path d="M7 17V7h10" />
    </svg>
  );
}

export function ZoomLightboxCornerArrows({
  animationKey,
  className = "",
}: {
  animationKey: number;
  className?: string;
}) {
  if (animationKey <= 0) return null;

  return (
    <>
      <span
        key={`tr-${animationKey}`}
        className={`zoom-lightbox-arrow-tr pointer-events-none absolute right-2 top-2 z-10 h-8 w-8 text-white/70 sm:right-3 sm:top-3 sm:h-9 sm:w-9 ${className}`}
        aria-hidden
      >
        <CornerExpandArrowSvg direction="tr" />
      </span>
      <span
        key={`bl-${animationKey}`}
        className={`zoom-lightbox-arrow-bl pointer-events-none absolute bottom-2 left-2 z-10 h-8 w-8 text-white/70 sm:bottom-3 sm:left-3 sm:h-9 sm:w-9 ${className}`}
        aria-hidden
      >
        <CornerExpandArrowSvg direction="bl" />
      </span>
    </>
  );
}

export function ZoomLightboxImageFrame({
  animationKey,
  children,
  className = "",
}: {
  animationKey: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex max-h-[92vh] max-w-full items-center justify-center ${className}`}
    >
      {children}
      <ZoomLightboxCornerArrows animationKey={animationKey} />
    </div>
  );
}
