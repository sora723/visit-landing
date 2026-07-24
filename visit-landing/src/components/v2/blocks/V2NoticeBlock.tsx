import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import {
  firstByRole,
  itemHasVisibleContent,
  itemsByRole,
} from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

export function V2NoticeBlock({ block }: Props) {
  const roots = itemsByRole(block.items, "root").filter(itemHasVisibleContent);
  const root = roots[0] || firstByRole(block.items, "root");
  if (!root || !itemHasVisibleContent(root)) return null;

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      <div className="rounded-lg border border-black/10 bg-white px-4 py-4 shadow-sm sm:px-5">
        {root.badge ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0f1a2e]">
            {root.badge}
          </p>
        ) : null}
        {root.title ? (
          <p className="text-base font-semibold text-pretty">{root.title}</p>
        ) : null}
        {root.description ? (
          <p className="mt-1 text-sm leading-relaxed text-black/70 text-pretty">
            {root.description}
          </p>
        ) : null}
      </div>
    </V2SectionFrame>
  );
}
