"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ArrowSvg({ direction }: { direction: "bl" | "tr" }) {
  if (direction === "tr") {
    return (
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
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 7 7 17" />
      <path d="M7 17V7h10" />
    </svg>
  );
}

/** 클릭 → 라이트박스 열림 + 모서리 화살표 3회 (arrowKey를 onZoom에 전달) */
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

/** 썸네일 — ↙ 화살표 + 클릭하여 확대 (항상 함께 노출) */
export function ZoomExpandHintLabel({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pos = compact ? "bottom-3 right-3" : "bottom-4 right-4";
  const arrowSize = compact ? "h-4 w-4" : "h-5 w-5";
  const textSize = compact ? "text-[10px] px-2.5 py-1" : "text-[11px] px-3 py-1";

  return (
    <span
      className={`pointer-events-none absolute z-10 flex items-center gap-1.5 ${pos} ${className}`}
    >
      <span
        className={`zoom-hint-arrow-bl shrink-0 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] ${arrowSize}`}
        aria-hidden
      >
        <ArrowSvg direction="bl" />
      </span>
      <span
        className={`rounded bg-[var(--color-navy)]/75 tracking-wide text-white/90 backdrop-blur-sm ${textSize}`}
      >
        클릭하여 확대
      </span>
    </span>
  );
}

/** 라이트박스 — 우상·좌하 모서리에서 바깥으로 열리는 화살표 3회 */
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
        className={`zoom-lightbox-arrow-tr pointer-events-none absolute -right-1 -top-1 z-10 h-7 w-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:h-8 sm:w-8 ${className}`}
        aria-hidden
      >
        <ArrowSvg direction="tr" />
      </span>
      <span
        key={`bl-${animationKey}`}
        className={`zoom-lightbox-arrow-bl pointer-events-none absolute -bottom-1 -left-1 z-10 h-7 w-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:h-8 sm:w-8 ${className}`}
        aria-hidden
      >
        <ArrowSvg direction="bl" />
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
