import React, { type ReactNode } from "react";
import type { ValidatedV2BlockLayout } from "@/v2/types";
import { parseSafeHttpsUrl } from "@/v2/safe-url";
import {
  mapAnimationPresetClass,
  mapPaddingPresetClass,
  mapThemeVariantClass,
  mapVisibilityClass,
  parseSafeHexColor,
} from "@/v2/section-presets";

type Props = {
  sectionId: string;
  layout: ValidatedV2BlockLayout;
  children: ReactNode;
  className?: string;
};

export function V2SectionFrame({
  sectionId,
  layout,
  children,
  className = "",
}: Props) {
  const visibility = mapVisibilityClass(
    layout.desktopVisible,
    layout.mobileVisible
  );
  if (visibility === null) return null;

  const padding = mapPaddingPresetClass(layout.paddingPreset);
  const theme = mapThemeVariantClass(layout.themeVariant);
  const anim = mapAnimationPresetClass(layout.animationPreset);

  const bgColor =
    layout.backgroundType === "color"
      ? parseSafeHexColor(layout.backgroundColor)
      : null;

  const bgPc =
    layout.backgroundType === "image"
      ? parseSafeHttpsUrl(layout.backgroundPc)
      : null;
  const bgMobile =
    layout.backgroundType === "image"
      ? parseSafeHttpsUrl(layout.backgroundMobile) || bgPc
      : null;

  const style =
    bgColor && layout.backgroundType === "color"
      ? { backgroundColor: bgColor }
      : undefined;

  return (
    <section
      id={sectionId}
      className={[
        "relative isolate overflow-hidden",
        padding,
        theme,
        anim,
        visibility,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {layout.backgroundType === "image" && (bgPc || bgMobile) ? (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <picture>
            {bgMobile && bgPc && bgMobile !== bgPc ? (
              <source media="(max-width: 767px)" srcSet={bgMobile} />
            ) : null}
            {bgPc || bgMobile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bgPc || bgMobile || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </picture>
          <div className="absolute inset-0 bg-black/25" />
        </div>
      ) : null}
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
        {children}
      </div>
    </section>
  );
}
