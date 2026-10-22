"use client";

import { useConfig } from "./ConfigProvider";
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
 * 홍보관 방문예약(CtaSection) 바로 아래 — 가운데 대형 이미지 1장
 * 콘텐츠관리 ctaPromoImage / ctaPromoImagePc / ctaPromoImageMobile / ctaPromoBg
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
  const desktopSrc = resolveResponsiveImage(promo, false, "section");
  const fallbackSrc = desktopSrc || mobileSrc;

  return (
    <section
      id="방문예약-홍보"
      className={`scroll-mt-[var(--site-top-offset)] ${BG_CLASS[bg]}`}
    >
      {/*
        풀 기준 = max 1200px.
        원본이 1200 이상 → 영역 꽉 채움 / 900처럼 작으면 원본 너비로 가운데 → 좌우 여백.
        (화면이 이미지보다 좁으면 max-w-full 로만 축소)
      */}
      <div className="mx-auto flex w-full max-w-[1200px] justify-center">
        <picture>
          {mobileSrc ? (
            <source
              media={`(max-width: ${MOBILE_BREAKPOINT}px)`}
              srcSet={mobileSrc}
            />
          ) : null}
          {promo.imagePc?.trim() ? (
            <source
              media={`(min-width: ${MOBILE_BREAKPOINT + 1}px)`}
              srcSet={desktopSrc}
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fallbackSrc}
            alt=""
            className="h-auto w-auto max-w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
    </section>
  );
}
