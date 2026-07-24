import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { parseSafeHttpsUrl } from "@/v2/safe-url";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { V2ActionLink } from "@/components/v2/V2ActionLink";
import { V2ResponsiveImage } from "@/components/v2/V2ResponsiveImage";
import { firstByRole, itemsByRole } from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

function videoFlags(options: Record<string, unknown>) {
  return {
    muted: options.muted === true,
    autoPlay: options.autoplay === true,
    loop: options.loop === true,
    playsInline: options.playsinline === true,
  };
}

export function V2HeroBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  if (!root) return null;

  const ctas = itemsByRole(block.items, "cta");
  const stats = [
    ...itemsByRole(block.items, "stat"),
    ...itemsByRole(block.items, "item"),
  ].filter((i) => i.title || i.value);

  const isVideo = block.variant === "video";
  const videoUrl = isVideo ? parseSafeHttpsUrl(root.videoUrl) : null;
  const poster = parseSafeHttpsUrl(root.imagePc);
  const mobileFallback = parseSafeHttpsUrl(root.imageMobile) || poster;
  const flags = videoFlags(block.options);

  return (
    <V2SectionFrame
      sectionId={block.sectionId}
      layout={block.layout}
      className="min-h-[70vh] text-white"
    >
      <div className="relative flex min-h-[70vh] flex-col justify-end pb-10 pt-24 md:justify-center md:pb-16">
        {isVideo && videoUrl && poster && mobileFallback ? (
          <>
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
              <video
                className="hidden h-full w-full object-cover md:block"
                src={videoUrl}
                poster={poster}
                muted={flags.muted}
                autoPlay={flags.autoPlay}
                loop={flags.loop}
                playsInline={flags.playsInline}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mobileFallback}
                alt=""
                className="h-full w-full object-cover md:hidden"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 -z-10">
              <V2ResponsiveImage
                imagePc={root.imagePc}
                imageMobile={root.imageMobile}
                alt=""
                className="h-full min-h-[70vh] w-full"
                imgClassName="h-full min-h-[70vh] w-full object-cover"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/35 to-black/20" />
          </>
        )}

        <div className="relative max-w-2xl space-y-4 text-left">
          {root.eyebrow ? (
            <p className="text-sm font-medium tracking-wide text-white/80">
              {root.eyebrow}
            </p>
          ) : null}
          {root.badge ? (
            <p className="inline-block rounded bg-white/15 px-2 py-0.5 text-xs font-medium">
              {root.badge}
            </p>
          ) : null}
          {root.title ? (
            <h1 className="text-3xl font-semibold leading-tight text-balance sm:text-4xl md:text-5xl">
              {root.title}
            </h1>
          ) : null}
          {root.subtitle ? (
            <p className="text-lg text-white/90 text-pretty">{root.subtitle}</p>
          ) : null}
          {root.description ? (
            <p className="text-base text-white/80 text-pretty">
              {root.description}
            </p>
          ) : null}

          {ctas.length > 0 ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {ctas.map((cta) => (
                <V2ActionLink
                  key={cta.itemId}
                  actionType={cta.actionType}
                  actionLabel={cta.actionLabel}
                  actionValue={cta.actionValue}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#0f1a2e] touch-manipulation"
                />
              ))}
            </div>
          ) : null}

          {stats.length > 0 ? (
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.itemId} className="rounded-md bg-white/10 p-3">
                  {s.value ? (
                    <dt className="text-xl font-semibold">{s.value}</dt>
                  ) : null}
                  {s.title ? (
                    <dd className="text-xs text-white/75">{s.title}</dd>
                  ) : null}
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </V2SectionFrame>
  );
}
