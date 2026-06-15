"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import {
  fitPromoTextToContainer,
  sanitizePromoText,
} from "@/lib/fit-promo-text";
import {
  shouldRenderPromoAsCanvas,
  startPromoCanvasAnimation,
} from "@/lib/render-promo-canvas";

const POLL_MS = 15_000;

/** 하단 프로모 — Google Sheet stickyPromoText 전용 (site.json 미사용) */
export function PromoStickyBar({
  siteCode,
  initialText,
  serverMobile = false,
}: {
  siteCode: string;
  initialText: string | null;
  serverMobile?: boolean;
}) {
  const [text, setText] = useState(() => sanitizePromoText(initialText));
  const [useCanvas, setUseCanvas] = useState(() =>
    shouldRenderPromoAsCanvas(serverMobile)
  );

  const barRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const stopAnimRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    setUseCanvas(shouldRenderPromoAsCanvas(serverMobile));
  }, [serverMobile]);

  const startCanvas = useCallback(() => {
    stopAnimRef.current?.();
    stopAnimRef.current = null;

    const bar = barRef.current;
    const canvas = canvasRef.current;
    if (!bar || !canvas || !text || !shouldRenderPromoAsCanvas(serverMobile)) {
      return;
    }

    stopAnimRef.current = startPromoCanvasAnimation(
      canvas,
      text,
      bar.clientWidth
    );
  }, [text, serverMobile]);

  const fitSpan = useCallback(() => {
    const bar = barRef.current;
    const span = spanRef.current;
    if (!bar || !span || !text) return;
    fitPromoTextToContainer(bar, span, text);
  }, [text]);

  const scheduleLayout = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (shouldRenderPromoAsCanvas(serverMobile)) {
          setUseCanvas(true);
          startCanvas();
        } else {
          setUseCanvas(false);
          stopAnimRef.current?.();
          stopAnimRef.current = null;
          fitSpan();
        }
      });
    });
  }, [fitSpan, serverMobile, startCanvas]);

  useLayoutEffect(() => {
    scheduleLayout();
    return () => stopAnimRef.current?.();
  }, [text, scheduleLayout]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const observer = new ResizeObserver(() => scheduleLayout());
    observer.observe(bar);
    window.addEventListener("orientationchange", scheduleLayout);
    window.addEventListener("resize", scheduleLayout);
    void document.fonts?.ready?.then(() => scheduleLayout());

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", scheduleLayout);
      window.removeEventListener("resize", scheduleLayout);
    };
  }, [scheduleLayout]);

  const fetchLivePromo = useCallback(async () => {
    try {
      const res = await fetch(appendSiteCodeQuery("/api/site-content", siteCode));
      const json = await res.json();
      if (json.success && json.data?.source === "sheet") {
        setText(sanitizePromoText(json.data.stickyPromoText));
      }
    } catch {
      /* 현재 표시 유지 */
    }
  }, [siteCode]);

  useEffect(() => {
    fetchLivePromo();
    const timer = setInterval(fetchLivePromo, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchLivePromo();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchLivePromo]);

  if (!text) return null;

  const barClassName =
    "promo-sticky-bar pointer-events-none fixed inset-x-0 z-[199] box-border w-full max-w-[100vw] px-1 pb-1.5 sm:px-3 md:px-6 md:pb-2";

  if (useCanvas) {
    return (
      <div
        ref={barRef}
        className={`${barClassName} promo-sticky-bar--canvas`}
        aria-hidden={false}
      >
        <div className="promo-sticky-text">
          <div className="promo-sticky-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="promo-sticky-canvas"
              role="img"
              aria-label={text}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={barRef} className={barClassName} aria-hidden={false}>
      <div className="promo-sticky-text">
        <span ref={spanRef} className="promo-sticky-text-inner">
          {text}
        </span>
      </div>
    </div>
  );
}
