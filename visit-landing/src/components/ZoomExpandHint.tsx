"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 클릭 → 라이트박스 열림 */
export function useZoomExpandClick(onZoom: () => void) {
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
      const delay = prefersReducedMotion() ? 0 : 80;
      timerRef.current = setTimeout(() => {
        busyRef.current = false;
        onZoom();
      }, delay);
    },
    [onZoom]
  );

  return { handleZoomClick };
}

let zoomLightboxArrowSeq = 0;

/** 라이트박스가 열릴 때마다 고유 playKey — CSS 애니메이션 재실행 */
function useZoomLightboxArrowKey(active: boolean) {
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (!active) return;

    zoomLightboxArrowSeq += 1;
    const next = zoomLightboxArrowSeq;
    setPlayKey(0);

    const raf = requestAnimationFrame(() => {
      setPlayKey(next);
    });

    return () => cancelAnimationFrame(raf);
  }, [active]);

  return playKey;
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
  const common = {
    viewBox: "0 0 24 24",
    className: "block h-full w-full",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (direction === "tr") {
    return (
      <svg {...common}>
        {/* 우상 — 안쪽(대각)에서 모서리 끝으로 ↗ */}
        <path d="M10 14L18 6" />
        <path d="M18 6H22" />
        <path d="M18 6V2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      {/* 좌하 — 안쪽(대각)에서 모서리 끝으로 ↙ */}
      <path d="M14 10L6 18" />
      <path d="M6 18H2" />
      <path d="M6 18V22" />
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
  active,
  children,
  className = "",
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  const playKey = useZoomLightboxArrowKey(active);

  return (
    <div
      className={`relative inline-flex max-h-[92vh] max-w-full items-center justify-center ${className}`}
    >
      {children}
      <ZoomLightboxCornerArrows animationKey={playKey} />
    </div>
  );
}
