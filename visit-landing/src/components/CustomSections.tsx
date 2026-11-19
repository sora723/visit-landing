"use client";

import { useState } from "react";
import { useConfig } from "./ConfigProvider";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import type { CustomImageSection } from "@/lib/types";
import {
  customSectionAnchorId,
  customSectionsAtPosition,
  resolveCustomSectionLayout,
} from "@/lib/custom-sections";
import { ResponsiveImg } from "./ResponsiveImg";
import {
  FigmaSectionTitle,
  ImageLightbox,
  SectionExtraImageStack,
  locationImagePresent,
} from "./Sections";
import { ZoomExpandHint, useZoomExpandClick } from "./ZoomExpandHint";

/**
 * 현장별 커스텀 섹션 — customSectionsData / extendedData.customSections
 * position 슬롯에 맞춰 LandingPage에서 호출
 */
export function CustomSectionsAt({ position }: { position: number }) {
  const { config } = useConfig();
  const sections = customSectionsAtPosition(config.customSections, position);
  if (!sections.length) return null;
  return (
    <>
      {sections.map((section) => (
        <CustomSectionBlock key={customSectionAnchorId(section)} section={section} />
      ))}
    </>
  );
}

/** @deprecated LandingPage는 CustomSectionsAt 사용. 커뮤니티 아래 폴백용 */
export function CustomSections() {
  return <CustomSectionsAt position={7} />;
}

function CustomSectionBlock({ section }: { section: CustomImageSection }) {
  const layout = resolveCustomSectionLayout(section);
  if (layout === "legacy") {
    return <LegacyCustomImageBlock section={section} />;
  }
  return <RichCustomSection section={section} layout={layout} />;
}

function RichCustomSection({
  section,
  layout,
}: {
  section: CustomImageSection;
  layout: "cards" | "tabs";
}) {
  const items = section.items ?? [];
  const extraImages = section.extraImages ?? [];
  const extraImagesAfter = section.extraImagesAfter ?? [];
  const hasExtras =
    extraImages.some(locationImagePresent) ||
    extraImagesAfter.some(locationImagePresent);
  const [activeIndex, setActiveIndex] = useState(0);
  const [unitLightbox, setUnitLightbox] = useState(false);
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null);
  const [extraLightbox, setExtraLightbox] = useState<{
    slot: "before" | "after";
    index: number;
  } | null>(null);
  const { handleZoomClick } = useZoomExpandClick(() => setUnitLightbox(true));

  const safeIndex =
    items.length === 0 ? 0 : activeIndex >= items.length ? 0 : activeIndex;
  const current = items[safeIndex];
  const currentGallery = current?.gallery ?? [];
  const unitLightboxSrc = useResponsiveImage(
    current
      ? {
          image: current.image ?? "",
          imagePc: current.imagePc,
          imageMobile: current.imageMobile,
        }
      : { image: "" },
    "lightbox"
  );
  const galleryLightboxItem =
    galleryLightbox !== null ? currentGallery[galleryLightbox] : undefined;
  const galleryLightboxSrc = useResponsiveImage(
    galleryLightboxItem ?? { image: "" },
    "lightbox"
  );
  const activeExtra =
    extraLightbox?.slot === "before"
      ? extraImages[extraLightbox.index]
      : extraLightbox?.slot === "after"
        ? extraImagesAfter[extraLightbox.index]
        : undefined;
  const extraLightboxSrc = useResponsiveImage(
    activeExtra ?? { image: "" },
    "lightbox"
  );

  if (!items.length && !hasExtras) return null;

  const anchorId = customSectionAnchorId(section);
  const label = section.title || "커스텀";

  return (
    <section
      id={anchorId}
      className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20"
    >
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle
          en={section.label?.trim() || "CUSTOM"}
          title={section.title}
        />

        {extraImages.length > 0 ? (
          <SectionExtraImageStack
            images={extraImages}
            className={items.length || extraImagesAfter.length ? "mb-10" : ""}
            tone="light"
            label={`${label} 이미지`}
            onOpen={(index) => setExtraLightbox({ slot: "before", index })}
          />
        ) : null}

        {layout === "tabs" && items.length > 0 && current ? (
          <>
            <div className="-mx-1 mb-8 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <div className="flex w-max min-w-full justify-center gap-2">
                {items.map((item, index) => {
                  const selected = index === safeIndex;
                  return (
                    <button
                      key={`${item.tab || item.title}-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveIndex(index);
                        setGalleryLightbox(null);
                      }}
                      className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
                        selected
                          ? "border-[var(--color-text)] bg-[var(--color-text)] text-white shadow-[0_4px_16px_rgba(var(--color-text-rgb),0.18)]"
                          : "border-[var(--color-text)]/15 bg-white text-[var(--color-text)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-text)]"
                      }`}
                      aria-pressed={selected}
                    >
                      {item.tab || item.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              key={current.tab || current.title || safeIndex}
              className="location-tab-panel"
            >
              {currentGallery.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {currentGallery.map((shot, gi) => (
                    <figure key={`${shot.image}-${gi}`} className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setGalleryLightbox(gi);
                        }}
                        className="group relative block w-full touch-manipulation overflow-hidden rounded-xl bg-[#e8e4dc]"
                        aria-label={`${shot.title || current.title || label} 확대`}
                      >
                        <ResponsiveImg
                          source={shot}
                          alt={shot.alt || shot.title || current.title}
                          className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                        />
                        <ZoomExpandHint compact />
                      </button>
                      {shot.title ? (
                        <figcaption className="mt-2 text-center text-[13px] font-medium tracking-wide text-[var(--color-text)]/80 sm:text-sm">
                          {shot.title}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              ) : current.image ? (
                <button
                  type="button"
                  onClick={handleZoomClick}
                  className="group relative block w-full touch-manipulation overflow-hidden rounded-xl bg-[#e8e4dc]"
                >
                  <ResponsiveImg
                    source={{
                      image: current.image,
                      imagePc: current.imagePc,
                      imageMobile: current.imageMobile,
                    }}
                    alt={current.title}
                    className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  <ZoomExpandHint />
                </button>
              ) : null}

              {current.description ? (
                <div className="mt-8 text-center sm:mt-10">
                  <p className="mx-auto max-w-xl whitespace-pre-line text-[20px] font-medium leading-[1.8] text-[var(--color-text)] sm:text-[30px]">
                    {current.description}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {layout === "cards" && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <article
                key={`${item.title}-${i}`}
                className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.08)] transition-transform duration-250 hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(15,29,58,0.14)]"
              >
                {item.image ? (
                  <div className="relative aspect-video overflow-hidden bg-[#e8e4dc]">
                    <ResponsiveImg
                      source={{
                        image: item.image,
                        imagePc: item.imagePc,
                        imageMobile: item.imageMobile,
                      }}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-400 hover:scale-105"
                    />
                  </div>
                ) : null}
                <div className="px-[22px] py-5">
                  <h3 className="text-lg font-extrabold text-[var(--color-text)]">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-2.5 text-[13px] leading-[1.75] text-[#7a7060]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {extraImagesAfter.length > 0 ? (
          <SectionExtraImageStack
            images={extraImagesAfter}
            className={items.length || extraImages.length ? "mt-10" : ""}
            tone="light"
            label={`${label} 이미지`}
            onOpen={(index) => setExtraLightbox({ slot: "after", index })}
          />
        ) : null}

        <ImageLightbox
          src={unitLightboxSrc}
          alt={current?.title || section.title}
          open={unitLightbox && !!unitLightboxSrc}
          onClose={() => setUnitLightbox(false)}
        />
        <ImageLightbox
          src={galleryLightboxSrc}
          alt={
            galleryLightboxItem?.alt ||
            galleryLightboxItem?.title ||
            current?.title ||
            section.title
          }
          open={galleryLightbox !== null && !!galleryLightboxSrc}
          onClose={() => setGalleryLightbox(null)}
        />
        <ImageLightbox
          src={extraLightboxSrc}
          alt={activeExtra?.alt || section.title || `${label} 이미지`}
          open={extraLightbox !== null && !!extraLightboxSrc}
          onClose={() => setExtraLightbox(null)}
        />
      </div>
    </section>
  );
}

function LegacyCustomImageBlock({ section }: { section: CustomImageSection }) {
  const theme = useSiteTheme();
  const anchorId = customSectionAnchorId(section);
  if (!section.image?.trim()) return null;

  const content = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-navy)]/5 sm:aspect-[21/9]">
        <ResponsiveImg
          source={{
            image: section.image,
            imagePc: section.imagePc,
            imageMobile: section.imageMobile,
          }}
          alt={section.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="px-6 py-8 md:px-8 md:py-10">
        {section.label ? (
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-[#c0392b]">
            {section.label}
          </p>
        ) : null}
        <h3
          className="text-[clamp(20px,3.5vw,28px)] font-extrabold leading-snug"
          style={{ color: theme.sectionTitleColor }}
        >
          {section.title}
        </h3>
        {section.description ? (
          <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
            {section.description}
          </p>
        ) : null}
      </div>
    </>
  );

  if (section.href?.trim()) {
    return (
      <section
        id={anchorId}
        className="scroll-mt-[var(--site-top-offset)] border-b border-[var(--color-navy)]/6 bg-white"
      >
        <a href={section.href} className="block text-inherit no-underline">
          {content}
        </a>
      </section>
    );
  }

  return (
    <section
      id={anchorId}
      className="scroll-mt-[var(--site-top-offset)] border-b border-[var(--color-navy)]/6 bg-white"
    >
      {content}
    </section>
  );
}
