import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { V2ActionLink } from "@/components/v2/V2ActionLink";
import { V2ResponsiveImage } from "@/components/v2/V2ResponsiveImage";
import {
  firstByRole,
  itemHasVisibleContent,
  itemsByRole,
} from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

export function V2LocationBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  if (!root || !(root.title || root.description)) return null;

  const items = itemsByRole(block.items, "item").filter(itemHasVisibleContent);
  const image =
    itemsByRole(block.items, "image").find((i) => i.imagePc || i.imageMobile) ||
    (root.imagePc || root.imageMobile ? root : undefined);
  const cta = itemsByRole(block.items, "cta")[0];

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          {root.subtitle ? (
            <p className="text-sm font-medium text-black/55">{root.subtitle}</p>
          ) : null}
          {root.title ? (
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-pretty">
              {root.title}
            </h2>
          ) : null}
          {root.description ? (
            <p className="mt-3 text-black/70 text-pretty">{root.description}</p>
          ) : null}
          {items.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {items.map((item) => (
                <li key={item.itemId} className="border-l-2 border-[#0f1a2e]/pl-3">
                  {item.title ? (
                    <p className="font-medium">{item.title}</p>
                  ) : null}
                  {item.description ? (
                    <p className="text-sm text-black/65">{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {cta ? (
            <div className="mt-6">
              <V2ActionLink
                actionType={cta.actionType}
                actionLabel={cta.actionLabel}
                actionValue={cta.actionValue}
              />
            </div>
          ) : null}
        </div>
        {image ? (
          <V2ResponsiveImage
            imagePc={image.imagePc}
            imageMobile={image.imageMobile}
            alt={root.title || ""}
            className="aspect-video w-full rounded-lg bg-[#ebe8e2]"
          />
        ) : null}
      </div>
    </V2SectionFrame>
  );
}
