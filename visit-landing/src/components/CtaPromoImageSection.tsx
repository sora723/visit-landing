"use client";

import { useState } from "react";
import { useConfig } from "./ConfigProvider";
import { getImageFallbackUrl, normalizeImageUrl } from "@/lib/image-url";
import {
  MOBILE_BREAKPOINT,
  resolveResponsiveImage,
} from "@/lib/responsive-image";
import type { CtaPromoImageSection as CtaPromoImageConfig } from "@/lib/types";

const BG_CLASS: Record<CtaPromoImageConfig["backgroundColor"], string> = {
  white: "bg-white",
  beige: "bg-[var(--color-bg)]",
};

/**
 * 홍보관 방문예약(CtaSection) 바로 아래 — 대형 이미지 1장
 * 콘텐츠관리 ctaPromoImage / ctaPromoImagePc / ctaPromoImageMobile / ctaPromoBg
 *
 * PC·모바일 모두 뷰포트 좌우 full (max-w 1200 제한 없음). 세로는 비율 유지.
 */
export function CtaPromoImageSection() {
  const { config } = useConfig();
  const promo = config.ctaPromoImage;
  const hasImage =
    !!promo?.image?.trim() ||
    !!promo?.imagePc?.trim() ||
    !!promo?.imageMobile?.trim();

  if (!promo || !hasImage) return null;

  const bg = promo.backgroundColor ?? "white";
  const mobileSrc = promo.imageMobile?.trim()
    ? resolveResponsiveImage(promo, true, "section")
    : "";
  const desktopSrc = resolveResponsiveImage(promo, false, "original");
  const desktopFallback = resolveResponsiveImage(promo, false, "lightbox");
  const initialSrc = desktopSrc || mobileSrc;

  return (
    <section
      id="방문예약-홍보"
      className={`scroll-mt-[var(--site-top-offset)] ${BG_CLASS[bg]}`}
    >
      <div className="w-full">
        <PromoPicture
          mobileSrc={mobileSrc}
          desktopSrc={desktopSrc}
          desktopFallback={desktopFallback}
          initialSrc={initialSrc}
          hasPc={!!promo.imagePc?.trim()}
        />
      </div>
    </section>
  );
}

function PromoPicture({
  mobileSrc,
  desktopSrc,
  desktopFallback,
  initialSrc,
  hasPc,
}: {
  mobileSrc: string;
  desktopSrc: string;
  desktopFallback: string;
  initialSrc: string;
  hasPc: boolean;
}) {
  const [src, setSrc] = useState(initialSrc);
  const [stage, setStage] = useState<"primary" | "thumb" | "done">("primary");

  return (
    <div className="flex w-full justify-center">
      <picture className="block w-full">
        {mobileSrc ? (
          <source
            media={`(max-width: ${MOBILE_BREAKPOINT}px)`}
            srcSet={mobileSrc}
          />
        ) : null}
        {hasPc && desktopSrc ? (
          <source
            media={`(min-width: ${MOBILE_BREAKPOINT + 1}px)`}
            srcSet={stage === "primary" ? desktopSrc : desktopFallback}
          />
        ) : null}
        <img
          src={src}
          alt=""
          className="h-auto w-full max-w-full object-contain object-center"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (stage === "primary") {
              const next =
                desktopFallback ||
                getImageFallbackUrl(initialSrc, "original") ||
                normalizeImageUrl(initialSrc, "lightbox");
              setSrc(next);
              setStage("thumb");
              return;
            }
            if (stage === "thumb") {
              setSrc(getImageFallbackUrl(initialSrc, "lightbox"));
              setStage("done");
            }
          }}
        />
      </picture>
    </div>
  );
}
