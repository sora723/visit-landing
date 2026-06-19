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

/** 라이트박스 — 우상 ↗ · 좌하 ↙ (모서리 고정, 바깥 방향 스와이프) */
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
        {/* ↗ 우측 상단 */}
        <path d="M5 19L19 5" />
        <path d="M19 5H13" />
        <path d="M19 5V11" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      {/* ↙ 좌측 하단 */}
      <path d="M19 5L5 19" />
      <path d="M5 19H11" />
      <path d="M5 19V13" />
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

  const icon = "h-10 w-10 sm:h-11 sm:w-11";
  const trAnchor = `absolute right-2 top-2 sm:right-3 sm:top-3 ${icon}`;
  const blAnchor = `absolute bottom-2 left-2 sm:bottom-3 sm:left-3 ${icon}`;

  return (
    <div
      key={animationKey}
      className={`zoom-lightbox-swipe-layer pointer-events-none absolute inset-0 z-10 overflow-visible ${className}`}
      aria-hidden
    >
      <span className={trAnchor}>
        <span className="zoom-swipe-bl-trail block h-full w-full text-white/35">
          <CornerExpandArrowSvg direction="bl" />
        </span>
      </span>
      <span className={trAnchor}>
        <span className="zoom-swipe-bl block h-full w-full text-white/90">
          <CornerExpandArrowSvg direction="bl" />
        </span>
      </span>
      <span className={blAnchor}>
        <span className="zoom-swipe-tr-trail block h-full w-full text-white/35">
          <CornerExpandArrowSvg direction="tr" />
        </span>
      </span>
      <span className={blAnchor}>
        <span className="zoom-swipe-tr block h-full w-full text-white/90">
          <CornerExpandArrowSvg direction="tr" />
        </span>
      </span>
    </div>
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
      className={`zoom-lightbox-swipe-host relative inline-flex max-h-[92vh] max-w-full items-center justify-center ${className}`}
    >
      {children}
      <ZoomLightboxCornerArrows animationKey={playKey} />
    </div>
  );
}
