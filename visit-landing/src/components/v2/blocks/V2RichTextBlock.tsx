import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { renderV2SafeRichText } from "@/v2/safe-rich-text";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { firstByRole } from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

export function V2RichTextBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  if (!root) return null;
  const body = renderV2SafeRichText(root.description);
  if (!root.title && !body) return null;

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      <div className="max-w-3xl">
        {root.title ? (
          <h2 className="text-2xl font-semibold tracking-tight text-pretty">
            {root.title}
          </h2>
        ) : null}
        {root.subtitle ? (
          <p className="mt-2 text-base text-black/70">{root.subtitle}</p>
        ) : null}
        {body}
      </div>
    </V2SectionFrame>
  );
}
