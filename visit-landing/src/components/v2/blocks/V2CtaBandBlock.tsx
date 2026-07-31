import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { V2ActionLink } from "@/components/v2/V2ActionLink";
import { firstByRole, itemsByRole } from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

export function V2CtaBandBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  const ctas = itemsByRole(block.items, "cta");
  if (!root || !(root.title || root.description)) return null;
  if (ctas.length === 0) return null;

  return (
    <V2SectionFrame
      sectionId={block.sectionId}
      layout={{
        ...block.layout,
        themeVariant: block.layout.themeVariant || "dark",
      }}
    >
      <div className="mx-auto max-w-3xl text-center">
        {root.badge ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-80">
            {root.badge}
          </p>
        ) : null}
        {root.title ? (
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {root.title}
          </h2>
        ) : null}
        {root.subtitle ? (
          <p className="mt-2 text-lg opacity-90">{root.subtitle}</p>
        ) : null}
        {root.description ? (
          <p className="mt-3 text-base opacity-80 text-pretty">
            {root.description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
      </div>
    </V2SectionFrame>
  );
}
