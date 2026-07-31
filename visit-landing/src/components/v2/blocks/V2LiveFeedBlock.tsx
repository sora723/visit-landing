import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { V2SectionFrame } from "@/components/v2/V2SectionFrame";
import { firstByRole } from "@/components/v2/v2-block-helpers";
import { V2LiveFeedClient } from "@/components/v2/live-feed/V2LiveFeedClient";
import type { V2LiveFeedDisplayCopy } from "@/components/v2/live-feed/v2-live-feed-config";

type Props = {
  block: ValidatedV2Block;
  siteCode: string;
  isPreview?: boolean;
};

/**
 * 서버 컴포넌트 — layout/copy만 추출 후 client island 호출.
 * enabled=false 블록은 normalize 단계에서 제외되어 여기까지 오지 않음.
 */
export function V2LiveFeedBlock({
  block,
  siteCode,
  isPreview = false,
}: Props) {
  const root = firstByRole(block.items, "root");
  const copy: V2LiveFeedDisplayCopy = {
    eyebrow: root?.eyebrow,
    title: root?.title,
    subtitle: root?.subtitle,
    description: root?.description,
    badge: root?.badge,
  };

  const code = String(siteCode || "").trim();
  if (!code) return null;

  return (
    <V2SectionFrame sectionId={block.sectionId} layout={block.layout}>
      <V2LiveFeedClient
        siteCode={code}
        isPreview={isPreview}
        copy={copy}
      />
    </V2SectionFrame>
  );
}
