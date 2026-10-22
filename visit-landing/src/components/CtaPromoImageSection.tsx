"use client";

import { useState, type CSSProperties } from "react";
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

/** PC 섹션 풀 기준 — 이 너비 이상이면 영역(max 1200) 가로 100% */
const PC_FULL_MIN_PX = 1200;

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
  const desktopSrc = resolveResponsiveImage(promo, false, "original");
  const desktopFallback = resolveResponsiveImage(promo, false, "lightbox");
  const initialSrc = desktopSrc || mobileSrc;

  return (
    <section
      id="방문예약-홍보"
      className={`scroll-mt-[var(--site-top-offset)] ${BG_CLASS[bg]}`}
    >
      <div className="mx-auto flex w-full max-w-[1200px] justify-center">
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
  const [pcWidthStyle, setPcWidthStyle] = useState<string | undefined>(
    undefined
  );

  return (
    <picture>
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-auto max-w-full object-contain md:w-auto"
        style={
          pcWidthStyle
            ? ({ width: pcWidthStyle } satisfies CSSProperties)
            : undefined
        }
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          const nw = e.currentTarget.naturalWidth;
          if (!nw) return;
          // PC: 1200+ → 컨테이너 풀 / 그 미만 → 실제 픽셀 너비(여백)
          setPcWidthStyle(nw >= PC_FULL_MIN_PX ? "100%" : `${nw}px`);
        }}
        onError={() => {
          if (stage === "primary") {
            const next =
              desktopFallback ||
              getImageFallbackUrl(initialSrc, "original") ||
              normalizeImageUrl(initialSrc, "lightbox");
            setSrc(next);
            setStage("thumb");
            setPcWidthStyle(undefined);
            return;
          }
          if (stage === "thumb") {
            setSrc(getImageFallbackUrl(initialSrc, "lightbox"));
            setStage("done");
            setPcWidthStyle(undefined);
          }
        }}
      />
    </picture>
  );
}
