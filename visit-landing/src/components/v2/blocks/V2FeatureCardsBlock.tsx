import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { V2ResponsiveImage } from "@/components/v2/V2ResponsiveImage";
import {
  firstByRole,
  itemHasVisibleContent,
  itemsByRole,
} from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

export function V2FeatureCardsBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  const items = itemsByRole(block.items, "item").filter(itemHasVisibleContent);
  if (items.length === 0) return null;

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      {root?.title ? (
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-pretty">
          {root.title}
        </h2>
      ) : null}
      {root?.description ? (
        <p className="mb-8 max-w-2xl text-black/70 text-pretty">
          {root.description}
        </p>
      ) : null}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.itemId}
            className="flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white"
          >
            {item.imagePc || item.imageMobile ? (
              <V2ResponsiveImage
                imagePc={item.imagePc}
                imageMobile={item.imageMobile}
                alt={item.title || ""}
                className="aspect-video w-full bg-[#ebe8e2]"
              />
            ) : null}
            <div className="flex flex-1 flex-col gap-1 p-4">
              {item.badge ? (
                <span className="text-xs font-medium text-[#0f1a2e]">
                  {item.badge}
                </span>
              ) : null}
              {item.icon ? (
                <span className="text-sm text-black/50" aria-hidden={true}>
                  {item.icon}
                </span>
              ) : null}
              {item.title ? (
                <h3 className="text-base font-semibold text-pretty">
                  {item.title}
                </h3>
              ) : null}
              {item.value ? (
                <p className="text-lg font-semibold text-[#0f1a2e]">
                  {item.value}
                </p>
              ) : null}
              {item.description ? (
                <p className="text-sm leading-relaxed text-black/65 text-pretty">
                  {item.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </V2SectionFrame>
  );
}
