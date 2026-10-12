"use client";

import { useEffect, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import { getImageFallbackUrl, normalizeImageUrl } from "@/lib/image-url";
import {
  MOBILE_BREAKPOINT,
  resolveResponsiveImage,
} from "@/lib/responsive-image";
import type { SiteConfig } from "@/lib/types";
import { ResponsiveImg } from "./ResponsiveImg";
import {
  ZoomExpandHint,
  ZoomLightboxImageFrame,
  useZoomExpandClick,
} from "./ZoomExpandHint";
import { PinchZoomImage } from "./PinchZoomImage";

function FigmaSectionTitle({
  en,
  title,
  subtitle,
  titleVariant = "light",
}: {
  en: string;
  title: string;
  subtitle?: string;
  /** light=밝은 배경 섹션, dark=네이비(CTA류), location=입지환경 전용 */
  titleVariant?: "light" | "dark" | "location";
}) {
  const theme = useSiteTheme();
  const titleColor =
    titleVariant === "location"
      ? theme.locationTitleColor
      : titleVariant === "dark"
        ? theme.ctaSectionTitleColor
        : theme.sectionTitleColor;

  return (
    <div className="mb-10 text-center md:mb-14">
      <span className="mb-2 block text-[11px] tracking-[0.3em] text-[var(--color-gold)]">{en}</span>
      <h2
        className="text-[clamp(22px,3.5vw,34px)] font-semibold tracking-wide"
        style={{ color: titleColor }}
      >
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-10 bg-[var(--color-gold)]" />
      {subtitle && (
        <p
          className={`mt-3.5 text-sm ${
            titleVariant === "light" ? "text-[#7a7060]" : "text-on-dark-60"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function OverviewSection() {
  const { config } = useConfig();
  const { overview, siteName } = config;
  if (!overview.image && !overview.specs.length) return null;

  return (
    <section id="사업개요" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="PROJECT OVERVIEW" title={overview.title} />
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-14">
          {overview.image && (
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#e8e4dc]">
              <ResponsiveImg
                source={overview}
                alt={`${siteName} 단지`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.07)]">
            <div className="flex items-center gap-3 bg-[var(--color-navy)] px-7 py-5">
              <div className="h-5 w-[3px] rounded-sm bg-[var(--color-gold)]" />
              <span className="text-[15px] font-semibold tracking-wide text-white">
                {siteName} 사업개요
              </span>
            </div>
            {overview.specs.map((spec, i) => (
              <div
                key={spec.label}
                className={`flex ${
                  i < overview.specs.length - 1 ? "border-b border-[var(--color-navy)]/7" : ""
                }`}
              >
                <div className="w-[140px] shrink-0 border-r border-[var(--color-navy)]/7 bg-[var(--color-bg)] px-5 py-4 text-[13px] font-medium text-[#7a7060]">
                  {spec.label}
                </div>
                <div className="px-5 py-4 text-[13px] leading-relaxed text-[var(--color-text)]">
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PremiumSection() {
  const { config } = useConfig();
  const { premium } = config;
  if (!premium.items.length) return null;

  return (
    <section id="프리미엄" className="scroll-mt-[var(--site-top-offset)] bg-[#f0ece4] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="PREMIUM AMENITY" title={premium.title} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {premium.items.map((item, i) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.08)] transition-transform duration-250 hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(15,29,58,0.14)]"
            >
              {item.image && (
                <div className="relative aspect-video overflow-hidden bg-[#e8e4dc]">
                  <ResponsiveImg
                    source={item}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-400 hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 rounded bg-[var(--color-navy)]/75 px-2.5 py-1 backdrop-blur-sm">
                    <span className="text-[9px] tracking-[0.2em] text-[var(--color-gold)]">
                      PREMIUM {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )}
              <div className="px-[22px] py-5">
                <h3 className="text-lg font-extrabold text-[var(--color-text)]">{item.title}</h3>
                <p className="mt-2.5 text-[13px] leading-[1.75] text-[#7a7060]">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function groupLocationItems(
  items: { category: string; title?: string; description?: string }[]
) {
  return items.reduce<
    { cat: string; lines: { title: string; description: string }[] }[]
  >((acc, item) => {
    const title = item.title?.trim() ?? "";
    const description = item.description?.trim() ?? "";
    if (!title && !description) return acc;

    const cat = item.category?.trim() ?? "";
    const line = { title, description };
    const existing = acc.find((g) => g.cat === cat);
    if (existing) existing.lines.push(line);
    else acc.push({ cat, lines: [line] });
    return acc;
  }, []);
}

type LocationBlock = NonNullable<SiteConfig["location"]["blocks"]>[number];
type LocationExtraImage = Extract<
  LocationBlock,
  { kind: "extraImages" }
>["images"][number];

function locationImagePresent(img: {
  image?: string;
  imagePc?: string;
  imageMobile?: string;
}): boolean {
  return (
    !!img.image?.trim() || !!img.imagePc?.trim() || !!img.imageMobile?.trim()
  );
}

/**
 * JS isMobile 초기값(false) 때문에 모바일에서 PC 이미지가 남는 문제 방지.
 * CSS media로 imageMobile / imagePc / image 분기.
 */
function LocationExtraResponsiveImg({
  source,
  alt,
  className,
}: {
  source: LocationExtraImage;
  alt: string;
  className?: string;
}) {
  const mobileSrc = source.imageMobile?.trim()
    ? resolveResponsiveImage(source, true, "section")
    : "";
  const desktopSrc = resolveResponsiveImage(source, false, "section");
  const fallbackSrc =
    desktopSrc ||
    mobileSrc ||
    normalizeImageUrl(source.image || "", "section");

  return (
    <picture>
      {mobileSrc ? (
        <source
          media={`(max-width: ${MOBILE_BREAKPOINT}px)`}
          srcSet={mobileSrc}
        />
      ) : null}
      {source.imagePc?.trim() ? (
        <source
          media={`(min-width: ${MOBILE_BREAKPOINT + 1}px)`}
          srcSet={desktopSrc}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

function LocationExtraImageStack({
  images,
  className,
  onOpen,
}: {
  images: LocationExtraImage[];
  className?: string;
  onOpen: (index: number) => void;
}) {
  const visible = images
    .map((img, index) => ({ img, index }))
    .filter(({ img }) => locationImagePresent(img));
  if (visible.length === 0) return null;

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 ${className ?? ""}`}>
      {visible.map(({ img, index }) => (
        <div
          key={`location-extra-${index}`}
          className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen(index);
            }}
            className="group relative block w-full touch-manipulation"
            aria-label={`${img.alt || "입지"} 이미지 확대`}
          >
            <LocationExtraResponsiveImg
              source={img}
              alt={img.alt || "입지 이미지"}
              className="h-auto w-full cursor-zoom-in object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <ZoomExpandHint />
          </button>
        </div>
      ))}
    </div>
  );
}

function LocationItemsGrid({
  items,
  className,
}: {
  items: SiteConfig["location"]["items"];
  className?: string;
}) {
  const groups = groupLocationItems(items);
  if (groups.length === 0) return null;

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className ?? ""}`}
    >
      {groups.map((point) => (
        <div
          key={point.cat || "__uncategorized"}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-6 sm:px-[20px] sm:py-6"
        >
          {point.cat ? (
            <div className="mb-4 border-b border-[var(--color-gold)]/25 pb-3 text-[15px] font-bold text-[var(--color-gold)] sm:text-base">
              {point.cat}
            </div>
          ) : null}
          <ul className="flex flex-col gap-2.5 sm:gap-3">
            {point.lines.map((line, lineIndex) => (
              <li
                key={`${point.cat}-${lineIndex}`}
                className="text-on-dark-85 flex items-start gap-2.5 text-[15px] leading-relaxed sm:text-base sm:leading-[1.65]"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-gold)]" />
                <span>
                  {line.title && line.description ? (
                    <>
                      <span className="text-on-dark-95 font-semibold">{line.title}</span>
                      <span className="text-on-dark-80"> — {line.description}</span>
                    </>
                  ) : line.title ? (
                    <span className="text-on-dark-95 font-semibold">{line.title}</span>
                  ) : (
                    line.description
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function LocationSection() {
  const { config } = useConfig();
  const { location } = config;
  const blocks: LocationBlock[] =
    location.blocks && location.blocks.length > 0
      ? location.blocks
      : location.items.length > 0
        ? [{ kind: "items", items: location.items }]
        : [];
  const [lightbox, setLightbox] = useState<
    { kind: "map" } | { kind: "extra"; blockIndex: number; imageIndex: number } | null
  >(null);
  const { handleZoomClick } = useZoomExpandClick(() =>
    setLightbox({ kind: "map" })
  );

  const activeExtra =
    lightbox?.kind === "extra"
      ? (() => {
          const block = blocks[lightbox.blockIndex];
          return block?.kind === "extraImages"
            ? block.images[lightbox.imageIndex]
            : undefined;
        })()
      : undefined;
  const mapLightboxSrc = useResponsiveImage(
    {
      image: location.mapImage,
      imagePc: location.mapImagePc,
      imageMobile: location.mapImageMobile,
    },
    "lightbox"
  );
  const extraLightboxSrc = useResponsiveImage(
    activeExtra ?? { image: "" },
    "lightbox"
  );
  const lightboxSrc =
    lightbox?.kind === "map" ? mapLightboxSrc : extraLightboxSrc;
  const lightboxAlt =
    lightbox?.kind === "map"
      ? location.title || "입지 지도"
      : activeExtra?.alt || location.title || "입지 이미지";

  const hasMapImage =
    !!location.mapImage?.trim() ||
    !!location.mapImagePc?.trim() ||
    !!location.mapImageMobile?.trim();
  const hasBlocks = blocks.some((block) =>
    block.kind === "extraImages"
      ? block.images.some(locationImagePresent)
      : block.items.some(
          (item) => !!(item.title?.trim() || item.description?.trim())
        )
  );

  if (!hasMapImage && !hasBlocks) return null;

  return (
    <section id="입지환경" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-navy)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="LOCATION ENVIRONMENT" title={location.title} titleVariant="location" />
        {hasMapImage && (
          <div className="relative mb-10 overflow-hidden rounded-2xl bg-[#1a2e5a]">
            <button
              type="button"
              onClick={handleZoomClick}
              className="group relative block w-full touch-manipulation"
              aria-label="입지 지도 확대"
            >
              <ResponsiveImg
                source={{
                  image: location.mapImage,
                  imagePc: location.mapImagePc,
                  imageMobile: location.mapImageMobile,
                }}
                alt="입지 지도"
                className="h-auto w-full cursor-zoom-in object-contain transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-navy)]/75" />
              <ZoomExpandHint />
            </button>
            {location.title && (
              <div className="pointer-events-none absolute bottom-6 left-6 z-10">
                <p className="text-on-dark text-[22px] font-extrabold">{location.title}</p>
              </div>
            )}
          </div>
        )}

        {blocks.map((block, blockIndex) => {
          const isLast = blockIndex === blocks.length - 1;
          const gapClass = isLast ? "" : "mb-10";
          if (block.kind === "extraImages") {
            return (
              <LocationExtraImageStack
                key={`location-block-${blockIndex}`}
                images={block.images}
                className={gapClass}
                onOpen={(imageIndex) =>
                  setLightbox({ kind: "extra", blockIndex, imageIndex })
                }
              />
            );
          }
          return (
            <LocationItemsGrid
              key={`location-block-${blockIndex}`}
              items={block.items}
              className={gapClass}
            />
          );
        })}

        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          open={lightbox !== null && !!lightboxSrc}
          onClose={() => setLightbox(null)}
        />
      </div>
    </section>
  );
}

export function FutureValueSection() {
  const { config } = useConfig();
  const { futureValue } = config;
  if (!futureValue.items.length) return null;

  return (
    <section id="미래가치" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="FUTURE VALUE" title={futureValue.title} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {futureValue.items.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.06)]"
            >
              {item.image && (
                <ResponsiveImg source={item} alt={item.title} className="aspect-video w-full object-cover" />
              )}
              <div className="p-5">
                <h3 className="text-base font-bold text-[var(--color-navy)]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#7a7060]">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NoticeSection() {
  const { config } = useConfig();
  const noticeText = config.noticeText?.trim();
  if (!noticeText) return null;

  return (
    <aside
      aria-label="안내 공지"
      className="border-y border-[var(--color-navy)]/8 bg-white px-6 py-3.5"
    >
      <div className="mx-auto flex max-w-[1100px] items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-full bg-[var(--color-navy)]/7 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--color-navy)]">
          안내
        </span>
        <p className="whitespace-pre-line text-[12px] leading-6 text-[#7a7060] sm:text-[13px]">
          {noticeText}
        </p>
      </div>
    </aside>
  );
}

function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const [zoomSrc, setZoomSrc] = useState(() =>
    src ? normalizeImageUrl(src, "lightbox") : ""
  );

  useEffect(() => {
    if (!src) return;
    setZoomSrc(normalizeImageUrl(src, "lightbox"));
  }, [src]);

  if (!open || !zoomSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[calc(var(--site-top-offset)+12px)] rounded-sm bg-white/10 px-3 py-1.5 text-sm text-white"
      >
        닫기
      </button>
      <ZoomLightboxImageFrame>
        <PinchZoomImage
          src={zoomSrc}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          onError={() => {
            const fallback = getImageFallbackUrl(src, "lightbox");
            if (zoomSrc.includes("sz=w2560") && fallback.includes("sz=w1200")) {
              setZoomSrc(fallback);
            }
          }}
        />
      </ZoomLightboxImageFrame>
    </div>
  );
}

export function UnitTypesSection() {
  const { config } = useConfig();
  const section = config.unitTypes;
  const items = section.items.filter(
    (item) => item.tab?.trim() || item.title?.trim() || item.image?.trim()
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const { handleZoomClick } = useZoomExpandClick(() => setLightbox(true));

  const safeIndex =
    items.length === 0 ? 0 : activeIndex >= items.length ? 0 : activeIndex;
  const active = items[safeIndex];
  const lightboxSrc = useResponsiveImage(
    active
      ? {
          image: active.image,
          imagePc: active.imagePc,
          imageMobile: active.imageMobile,
        }
      : { image: "" },
    "lightbox"
  );

  if (!items.length) return null;

  const current = items[safeIndex]!;

  return (
    <section id="세대안내" className="scroll-mt-[var(--site-top-offset)] bg-white px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="UNIT TYPES" title={section.title} />

        <div className="-mx-1 mb-8 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          <div className="flex min-w-min gap-2 sm:justify-center">
            {items.map((item, index) => {
              const selected = index === safeIndex;
              return (
                <button
                  key={`${item.tab}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
                    selected
                      ? "border-[var(--color-text)] bg-[var(--color-text)] text-white shadow-[0_4px_16px_rgba(var(--color-text-rgb),0.18)]"
                      : "border-[var(--color-text)]/15 bg-white text-[var(--color-text)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-text)]"
                  }`}
                  aria-pressed={selected}
                >
                  {item.tab}
                </button>
              );
            })}
          </div>
        </div>

        <div key={current.tab} className="location-tab-panel">
          {current.image && (
            <button
              type="button"
              onClick={handleZoomClick}
              className="group relative block w-full touch-manipulation overflow-hidden rounded-xl bg-[#e8e4dc]"
            >
              <ResponsiveImg
                source={current}
                alt={current.title}
                className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <ZoomExpandHint />
            </button>
          )}

          <div className="mt-6 text-center sm:mt-8">
            <h3 className="text-[clamp(20px,3vw,28px)] font-bold text-[var(--color-text)]">
              {current.title}
            </h3>
            {current.description && (
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#7a7060] sm:text-[15px]">
                {current.description}
              </p>
            )}
          </div>
        </div>

        <ImageLightbox
          src={lightboxSrc}
          alt={current.title}
          open={lightbox}
          onClose={() => setLightbox(false)}
        />
      </div>
    </section>
  );
}

export function CommunitySection() {
  const { config } = useConfig();
  const section = config.community;
  const galleryImages = section.galleryImages ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const activeGallery =
    lightboxIndex !== null ? galleryImages[lightboxIndex] : undefined;
  const lightboxSrc = useResponsiveImage(
    activeGallery ?? { image: "" },
    "lightbox"
  );

  const hasGallery = galleryImages.some(
    (img) =>
      !!img.image?.trim() || !!img.imagePc?.trim() || !!img.imageMobile?.trim()
  );
  const hasItems = section.items.length > 0;

  if (!hasGallery && !hasItems) return null;

  const openGalleryLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  return (
    <section id="커뮤니티" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="COMMUNITY" title={section.title} />

        {hasGallery && (
          <div className="mb-10 flex flex-col gap-6 sm:gap-8">
            {galleryImages.map((img, index) => {
              const hasImage =
                !!img.image?.trim() ||
                !!img.imagePc?.trim() ||
                !!img.imageMobile?.trim();

              if (!hasImage) return null;

              return (
                <div
                  key={`gallery-${index}`}
                  className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.06)]"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openGalleryLightbox(index);
                    }}
                    className="group relative block w-full touch-manipulation"
                    aria-label={`${img.alt || section.title || "커뮤니티"} 이미지 확대`}
                  >
                    <ResponsiveImg
                      source={img}
                      alt={img.alt || section.title}
                      className="h-auto w-full cursor-zoom-in object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <ZoomExpandHint />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasItems && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {section.items.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.06)]"
              >
                <ResponsiveImg source={item} alt={item.title} className="aspect-square w-full object-cover" />
                <div className="p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#7a7060] sm:text-xs">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        <ImageLightbox
          src={lightboxSrc}
          alt={activeGallery?.alt || section.title || "커뮤니티"}
          open={lightboxIndex !== null && !!lightboxSrc}
          onClose={() => setLightboxIndex(null)}
        />
      </div>
    </section>
  );
}
