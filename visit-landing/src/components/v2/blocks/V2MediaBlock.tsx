import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { parseSafeHttpsUrl } from "@/v2/safe-url";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { V2ActionLink } from "@/components/v2/V2ActionLink";
import { V2ResponsiveImage } from "@/components/v2/V2ResponsiveImage";
import {
  firstByRole,
  itemHasVisibleContent,
  itemsByRole,
} from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

function videoFlags(options: Record<string, unknown>) {
  return {
    muted: options.muted === true,
    autoPlay: options.autoplay === true,
    loop: options.loop === true,
    playsInline: options.playsinline === true,
  };
}

export function V2MediaBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  const images = [
    ...itemsByRole(block.items, "image"),
    ...itemsByRole(block.items, "slide"),
  ].filter((i) => i.imagePc || i.imageMobile);
  const mediaRoot = root || images[0];
  if (!mediaRoot && images.length === 0) return null;

  const variant = block.variant;
  const isBgVideo = variant === "background-video";
  const isVideo = variant === "video" || isBgVideo;
  const primary = mediaRoot || images[0];
  const videoUrl = isVideo ? parseSafeHttpsUrl(primary?.videoUrl) : null;
  const poster = parseSafeHttpsUrl(primary?.imagePc);
  const mobileFallback =
    parseSafeHttpsUrl(primary?.imageMobile) || poster;
  const flags = videoFlags(block.options);
  const cta = itemsByRole(block.items, "cta")[0];

  const galleryItems =
    variant === "gallery"
      ? images.filter(itemHasVisibleContent)
      : images.length
        ? images.slice(0, 1)
        : primary
          ? [primary]
          : [];

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      {root?.title ? (
        <h2 className="mb-4 text-2xl font-semibold tracking-tight text-pretty">
          {root.title}
        </h2>
      ) : null}
      {root?.description ? (
        <p className="mb-6 max-w-2xl text-black/70 text-pretty">
          {root.description}
        </p>
      ) : null}

      {isVideo && videoUrl && poster && mobileFallback ? (
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video
            className="hidden h-full w-full object-cover md:block"
            src={videoUrl}
            poster={poster}
            muted={flags.muted}
            autoPlay={flags.autoPlay}
            loop={flags.loop}
            playsInline={flags.playsInline}
            controls={!isBgVideo}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mobileFallback}
            alt={primary?.title || ""}
            className="h-full w-full object-cover md:hidden"
          />
        </div>
      ) : variant === "gallery" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {galleryItems.map((item) => (
            <li key={item.itemId} className="aspect-video overflow-hidden rounded-lg bg-[#ebe8e2]">
              <V2ResponsiveImage
                imagePc={item.imagePc}
                imageMobile={item.imageMobile}
                alt={item.title || ""}
                className="h-full w-full"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="aspect-video overflow-hidden rounded-lg bg-[#ebe8e2]">
          <V2ResponsiveImage
            imagePc={primary?.imagePc}
            imageMobile={primary?.imageMobile}
            alt={primary?.title || root?.title || ""}
            className="h-full w-full"
          />
        </div>
      )}

      {cta ? (
        <div className="mt-5">
          <V2ActionLink
            actionType={cta.actionType}
            actionLabel={cta.actionLabel}
            actionValue={cta.actionValue}
          />
        </div>
      ) : null}
    </V2SectionFrame>
  );
}
