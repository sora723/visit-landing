"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SCALE = 2.5;

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * 라이트박스 핀치·팬 줌.
 * layout viewport `maximumScale: 1` 때문에 Android(Chrome/Samsung)는 브라우저 기본 핀치가
 * 막히므로, 터치 제스처를 직접 처리한다.
 */
export function PinchZoomImage({
  src,
  alt,
  className = "",
  imgClassName = "max-h-[90vh] max-w-full object-contain",
  onError,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  onError?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const transformRef = useRef<Transform>(transform);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startMid: { x: 0, y: 0 },
    panOrigin: { x: 0, y: 0 },
    lastTap: 0,
    moved: false,
  });

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
    pointers.current.clear();
  }, [src]);

  const snapToRest = useCallback((current: Transform) => {
    if (current.scale <= 1.02) {
      setTransform({ scale: 1, x: 0, y: 0 });
      return;
    }
    setTransform({ ...current, scale: clampScale(current.scale) });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    gesture.current.moved = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const current = transformRef.current;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startDistance = distance(a, b);
      gesture.current.startScale = current.scale;
      gesture.current.startX = current.x;
      gesture.current.startY = current.y;
      gesture.current.startMid = midpoint(a, b);
      return;
    }

    if (pointers.current.size === 1) {
      gesture.current.panOrigin = {
        x: e.clientX - current.x,
        y: e.clientY - current.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;

    const prev = pointers.current.get(e.pointerId)!;
    if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) > 4) {
      gesture.current.moved = true;
    }

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = distance(a, b);
      if (gesture.current.startDistance <= 0) return;

      const nextScale = clampScale(
        gesture.current.startScale * (dist / gesture.current.startDistance)
      );
      const mid = midpoint(a, b);

      setTransform({
        scale: nextScale,
        x: gesture.current.startX + (mid.x - gesture.current.startMid.x),
        y: gesture.current.startY + (mid.y - gesture.current.startMid.y),
      });
      return;
    }

    if (pointers.current.size === 1 && transformRef.current.scale > 1) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - gesture.current.panOrigin.x,
        y: e.clientY - gesture.current.panOrigin.y,
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }

    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.entries()][0];
      if (remaining) {
        const [, point] = remaining;
        const current = transformRef.current;
        gesture.current.panOrigin = {
          x: point.x - current.x,
          y: point.y - current.y,
        };
      }
      return;
    }

    if (pointers.current.size > 1) return;

    if (!gesture.current.moved) {
      const now = Date.now();
      if (gesture.current.lastTap > 0 && now - gesture.current.lastTap < DOUBLE_TAP_MS) {
        setTransform((prev) =>
          prev.scale > 1
            ? { scale: 1, x: 0, y: 0 }
            : { scale: DOUBLE_TAP_SCALE, x: 0, y: 0 }
        );
        gesture.current.lastTap = 0;
        return;
      }
      gesture.current.lastTap = now;
    } else {
      gesture.current.lastTap = 0;
    }

    snapToRest(transformRef.current);
  };

  return (
    <div
      className={`touch-none select-none ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        className={`${imgClassName} will-change-transform`}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: "center center",
        }}
        onClick={onClick}
        onError={onError}
      />
    </div>
  );
}
