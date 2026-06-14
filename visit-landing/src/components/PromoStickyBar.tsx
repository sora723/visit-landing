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
  isPromoMobileViewport,
  sanitizePromoText,
} from "@/lib/fit-promo-text";
import {
  renderPromoCanvasToImage,
  shouldRenderPromoAsImage,
  type PromoCanvasImage,
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
  /** 서버 UA — Galaxy 등 모바일이면 span HTML 자체를 내보내지 않음 */
  serverMobile?: boolean;
}) {
  const [text, setText] = useState(() => sanitizePromoText(initialText));
  const [useImage, setUseImage] = useState(() =>
    shouldRenderPromoAsImage(serverMobile)
  );
  const [promoImg, setPromoImg] = useState<PromoCanvasImage | null>(null);

  const barRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    setUseImage(shouldRenderPromoAsImage(serverMobile));
  }, [serverMobile]);

  const buildImage = useCallback(async () => {
    const bar = barRef.current;
    if (!bar || !text) return;
    const img = await renderPromoCanvasToImage(text, bar.clientWidth);
    setPromoImg(img);
  }, [text]);

  const fitSpan = useCallback(() => {
    const bar = barRef.current;
    const span = spanRef.current;
    if (!bar || !span || !text) return;
    fitPromoTextToContainer(bar, span, text);
  }, [text]);

  const scheduleLayout = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (shouldRenderPromoAsImage(serverMobile)) {
          setUseImage(true);
          void buildImage();
        } else {
          setUseImage(false);
          fitSpan();
        }
      });
    });
  }, [buildImage, fitSpan, serverMobile]);

  useLayoutEffect(() => {
    scheduleLayout();
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
      const res = await fetch(appendSiteCodeQuery("/api/site-content", siteCode), {
        cache: "no-store",
      });
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

  if (useImage) {
    return (
      <div
        ref={barRef}
        className={`${barClassName} promo-sticky-bar--image`}
        aria-hidden={false}
      >
        <div className="promo-sticky-text">
          <div className="promo-sticky-image-wrap">
            {promoImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promoImg.src}
                alt={text}
                className="promo-sticky-image"
                width={promoImg.width}
                height={promoImg.height}
                decoding="async"
              />
            ) : (
              <span className="promo-sticky-image-placeholder" aria-hidden />
            )}
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
