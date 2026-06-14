"use client";

import { useConfig } from "./ConfigProvider";
import { ResponsiveImg } from "./ResponsiveImg";
import type { CtaPromoImageSection as CtaPromoImageConfig } from "@/lib/types";

const BG_CLASS: Record<CtaPromoImageConfig["backgroundColor"], string> = {
  white: "bg-white",
  beige: "bg-[var(--color-bg)]",
};

/**
 * 홍보관 방문예약(CtaSection) 바로 아래 — 가운데 대형 이미지 1장
 * 콘텐츠관리 ctaPromoImage / ctaPromoBg (흰색·베이지)
 */
export function CtaPromoImageSection() {
  const { config } = useConfig();
  const promo = config.ctaPromoImage;
  const image = promo?.image?.trim();

  if (!image) return null;

  const bg = promo?.backgroundColor ?? "white";

  return (
    <section
      id="방문예약-홍보"
      className={`scroll-mt-[var(--site-top-offset)] ${BG_CLASS[bg]}`}
    >
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <div className="flex justify-center">
          <ResponsiveImg
            source={{
              image,
              imagePc: promo?.imagePc,
              imageMobile: promo?.imageMobile,
            }}
            alt=""
            className="h-auto w-full max-w-[960px] object-contain"
          />
        </div>
      </div>
    </section>
  );
}
