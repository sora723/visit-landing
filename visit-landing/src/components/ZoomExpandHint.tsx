"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 4방향 확대 아이콘 (참고: 모서리 화살표 + 둥근 사각 테두리) */
function ExpandFourArrowsSvg({ className = "" }: { className?: string }) {
  const gradId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="8%" y1="8%" x2="92%" y2="92%">
          <stop offset="0%" stopColor="#E91E8C" />
          <stop offset="55%" stopColor="#F04A7A" />
          <stop offset="100%" stopColor="#FF6B4A" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="8"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
      />
      <path
        d="M17 17L9 9M9 9H13M9 9V13"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 17L39 9M39 9H35M39 9V13"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 31L9 39M9 39H13M9 39V35"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 31L39 39M39 39H35M39 39V35"
        stroke={`url(#${gradId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

/** 썸네일 — 확대 아이콘 + 클릭하여 확대 (항상 함께) */
export function ZoomExpandHintLabel({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pos = compact ? "bottom-3 right-3" : "bottom-4 right-4";
  const iconWrap = compact ? "p-0.5" : "p-1";
  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";
  const textSize = compact ? "text-[10px] px-2.5 py-1" : "text-[11px] px-3 py-1";

  return (
    <span
      className={`pointer-events-none absolute z-10 flex items-center gap-1.5 ${pos} ${className}`}
    >
      <span
        className={`shrink-0 rounded-md bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${iconWrap}`}
        aria-hidden
      >
        <ExpandFourArrowsSvg className={iconSize} />
      </span>
      <span
        className={`rounded bg-[var(--color-navy)]/75 tracking-wide text-white/90 backdrop-blur-sm ${textSize}`}
      >
        클릭하여 확대
      </span>
    </span>
  );
}

/** 라이트박스 — 중앙 4방향 확대 아이콘이 커지는 펄스 3회 */
export function ZoomLightboxExpandIcon({
  animationKey,
  className = "",
}: {
  animationKey: number;
  className?: string;
}) {
  if (animationKey <= 0) return null;

  return (
    <span
      key={animationKey}
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${className}`}
      aria-hidden
    >
      <span className="zoom-expand-icon-pulse rounded-xl bg-white/92 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:p-4">
        <ExpandFourArrowsSvg className="h-11 w-11 sm:h-14 sm:w-14" />
      </span>
    </span>
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
      <ZoomLightboxExpandIcon animationKey={animationKey} />
    </div>
  );
}
