"use client";

import { useCallback, type ReactNode } from "react";

/** 클릭 → 라이트박스 열림 */
export function useZoomExpandClick(onZoom: () => void) {
  const handleZoomClick = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      onZoom();
    },
    [onZoom]
  );

  return { handleZoomClick };
}

/** 확대 가능 이미지 — 클릭하여 확대 */
export function ZoomExpandHint({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
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

/** @deprecated ZoomExpandHint 사용 */
export function ZoomExpandHintLabel({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
  visible?: boolean;
  fading?: boolean;
}) {
  return <ZoomExpandHint compact={compact} className={className} />;
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
