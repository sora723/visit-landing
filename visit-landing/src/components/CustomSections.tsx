"use client";

import { useConfig } from "./ConfigProvider";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { ResponsiveImg } from "./ResponsiveImg";
import type { CustomImageSection } from "@/lib/types";

/**
 * 현장별 커스텀 이미지 섹션 — site.json / 시트 extendedData.customSections
 * enabled !== false 이고 items.length > 0 일 때만 렌더
 */
export function CustomSections() {
  const { config } = useConfig();
  const sections = (config.customSections ?? []).filter(
    (s) => s.enabled !== false && s.image?.trim()
  );

  if (!sections.length) return null;

  return (
    <>
      {sections.map((section) => (
        <CustomImageBlock key={section.id} section={section} />
      ))}
    </>
  );
}

function CustomImageBlock({ section }: { section: CustomImageSection }) {
  const theme = useSiteTheme();
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
        {section.label && (
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-[#c0392b]">
            {section.label}
          </p>
        )}
        <h3
          className="text-[clamp(20px,3.5vw,28px)] font-extrabold leading-snug"
          style={{ color: theme.sectionTitleColor }}
        >
          {section.title}
        </h3>
        {section.description && (
          <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
            {section.description}
          </p>
        )}
      </div>
    </>
  );

  if (section.href?.trim()) {
    return (
      <section
        id={section.id}
        className="scroll-mt-[var(--site-top-offset)] border-b border-[var(--color-navy)]/6 bg-white"
      >
        <a href={section.href} className="block no-underline text-inherit">
          {content}
        </a>
      </section>
    );
  }

  return (
    <section
      id={section.id}
      className="scroll-mt-[var(--site-top-offset)] border-b border-[var(--color-navy)]/6 bg-white"
    >
      {content}
    </section>
  );
}
