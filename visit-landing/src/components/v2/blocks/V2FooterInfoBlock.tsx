import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { parseSafeHttpsUrl, parseSafePhoneHref } from "@/v2/safe-url";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import {
  firstByRole,
  itemHasVisibleContent,
  itemsByRole,
} from "@/components/v2/v2-block-helpers";

type Props = { block: ValidatedV2Block };

/**
 * 디자인용 footerInfo 블록.
 * 시스템 법적 footer(SiteSystemFooter)를 대체·숨기지 않음.
 * 시스템 footer는 V2PublishedPageShell 하단에 항상 렌더.
 */
export function V2FooterInfoBlock({ block }: Props) {
  const root = firstByRole(block.items, "root");
  const items = itemsByRole(block.items, "item").filter(itemHasVisibleContent);

  const phoneHref = root?.value
    ? parseSafePhoneHref(root.value)
    : root?.actionType === "phone"
      ? parseSafePhoneHref(root.actionValue)
      : null;
  const linkHref =
    root?.actionType === "link"
      ? parseSafeHttpsUrl(root.actionValue)
      : null;

  if (!root && items.length === 0) return null;

  return (
    <V2SectionFrame
      sectionId={block.sectionId}
      layout={{
        ...block.layout,
        themeVariant: block.layout.themeVariant || "muted",
      }}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          {root?.title ? (
            <p className="text-lg font-semibold">{root.title}</p>
          ) : null}
          {root?.description ? (
            <p className="mt-2 text-sm leading-relaxed text-black/70 text-pretty">
              {root.description}
            </p>
          ) : null}
          {phoneHref ? (
            <p className="mt-3">
              <a
                href={phoneHref}
                className="text-sm font-medium underline underline-offset-2"
              >
                {root?.actionLabel || root?.value || "전화 문의"}
              </a>
            </p>
          ) : null}
          {linkHref && root?.actionLabel ? (
            <p className="mt-2">
              <a
                href={linkHref}
                className="text-sm underline underline-offset-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                {root.actionLabel}
              </a>
            </p>
          ) : null}
        </div>
        {items.length > 0 ? (
          <dl className="space-y-3 text-sm">
            {items.map((item) => (
              <div key={item.itemId}>
                {item.title ? (
                  <dt className="font-medium text-black/80">{item.title}</dt>
                ) : null}
                {item.description ? (
                  <dd className="text-black/60">{item.description}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </V2SectionFrame>
  );
}
