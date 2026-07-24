import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { FormSubmitSecurityProvider } from "@/components/FormSubmitSecurityProvider";
import { V2ReservationFormAdapter } from "@/components/v2/forms/V2ReservationFormAdapter";
import { firstByRole, itemsByRole } from "@/components/v2/v2-block-helpers";

type Props = {
  block: ValidatedV2Block;
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
};

/** registry form variant allowlist → 카드 스타일만 */
function formVariantClass(variant: string): string {
  if (variant === "card") {
    return "rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6";
  }
  return "rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6";
}

export function V2FormBlock({ block, site, conversionTracking }: Props) {
  const root = firstByRole(block.items, "root");
  const formRole = firstByRole(block.items, "form");
  // registry: form role 필수
  if (!formRole) return null;

  const cta = itemsByRole(block.items, "cta")[0];
  const buttonText =
    cta?.actionLabel?.trim() ||
    site.formButtonText ||
    "방문예약하기";

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      <div className={formVariantClass(block.variant)}>
        {root?.eyebrow ? (
          <p className="mb-1 text-sm font-medium tracking-wide text-black/55">
            {root.eyebrow}
          </p>
        ) : null}
        {root?.badge ? (
          <p className="mb-2 text-xs font-semibold uppercase text-[#0f1a2e]">
            {root.badge}
          </p>
        ) : null}
        {root?.title ? (
          <h2 className="text-2xl font-semibold tracking-tight text-pretty">
            {root.title}
          </h2>
        ) : null}
        {root?.subtitle ? (
          <p className="mt-2 text-base text-black/70">{root.subtitle}</p>
        ) : null}
        {root?.description ? (
          <p className="mt-2 text-sm text-black/65 text-pretty">
            {root.description}
          </p>
        ) : null}

        <div className="mt-6">
          <FormSubmitSecurityProvider siteCode={site.siteCode}>
            <V2ReservationFormAdapter
              sectionId={block.sectionId}
              site={site}
              conversionTracking={conversionTracking}
              buttonText={buttonText}
            />
          </FormSubmitSecurityProvider>
        </div>
      </div>
    </V2SectionFrame>
  );
}
