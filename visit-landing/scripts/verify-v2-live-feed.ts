/**
 * V2 liveFeed block 회귀
 * Usage: npm run verify:v2-live-feed
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getComponentRegistryEntry } from "../src/v2/component-registry.ts";
import {
  hasRenderableV2Blocks,
  isV2RenderableBlockType,
  V2_RENDERABLE_BLOCK_TYPES,
} from "../src/v2/renderable-v2-blocks.ts";
import { validateV2Page } from "../src/v2/validate-v2-page.ts";
import { normalizeV2Rows } from "../src/v2/normalize-v2-data.ts";
import type { V2BlockRow, V2ContentRow, ValidatedV2Block } from "../src/v2/types.ts";
import { V2_BLOCK_RENDERERS } from "../src/components/v2/V2BlockRenderer.tsx";
import { V2LiveFeedBlock } from "../src/components/v2/blocks/V2LiveFeedBlock.tsx";
import {
  V2_LIVE_FEED_POLL_INTERVAL_MS,
  V2_LIVE_FEED_PREVIEW_MESSAGE,
} from "../src/components/v2/live-feed/v2-live-feed-config.ts";
import { formatReservationName } from "../src/lib/live-reservation-feed.ts";
import type { V2RuntimeSiteContext } from "../src/v2/v2-runtime-site-context.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}
function fail(label: string, detail?: string) {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond: unknown, label: string, detail?: string) {
  if (cond) ok(label);
  else fail(label, detail);
}

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function blockRow(
  overrides: Partial<V2BlockRow> &
    Pick<V2BlockRow, "sectionId" | "contentGroup" | "componentType">
): V2BlockRow {
  return {
    siteCode: "L010",
    revisionId: "pub-1",
    sectionOrder: 1,
    variant: "default",
    enabled: "Y",
    desktopVisible: "Y",
    mobileVisible: "Y",
    backgroundType: "none",
    themeVariant: "default",
    paddingPreset: "md",
    animationPreset: "none",
    optionsJson: "{}",
    ...overrides,
  };
}

function contentRow(
  overrides: Partial<V2ContentRow> &
    Pick<V2ContentRow, "contentGroup" | "itemId" | "role">
): V2ContentRow {
  return {
    siteCode: "L010",
    revisionId: "pub-1",
    itemOrder: 1,
    enabled: "Y",
    extraJson: "{}",
    ...overrides,
  };
}

const siteCtx: V2RuntimeSiteContext = {
  siteCode: "L010",
  siteName: "Test",
  phone: "1688-0000",
  formButtonText: "신청",
};

function liveFeedValidated(): ValidatedV2Block {
  const result = validateV2Page({
    siteCode: "L010",
    revisionId: "pub-1",
    pageSchemaVersion: 1,
    blocks: [
      blockRow({
        sectionId: "hero-1",
        contentGroup: "cg-hero",
        componentType: "hero",
        variant: "fullBleed",
        sectionOrder: 0,
      }),
      blockRow({
        sectionId: "live-1",
        contentGroup: "cg-live",
        componentType: "liveFeed",
        variant: "default",
        sectionOrder: 1,
      }),
    ],
    contents: [
      contentRow({
        contentGroup: "cg-hero",
        itemId: "hero-root",
        role: "root",
        title: "Hero",
      }),
      contentRow({
        contentGroup: "cg-live",
        itemId: "live-root",
        role: "root",
        title: "실시간 관심등록 현황",
        description: "최근 관심고객 등록 현황을 안내합니다.",
      }),
    ],
  });
  if (!result.ok) {
    throw new Error(
      "fixture invalid: " +
        result.fatalErrors.map((e) => e.message).join(", ")
    );
  }
  const live = result.page.blocks.find((b) => b.componentType === "liveFeed");
  if (!live) throw new Error("liveFeed missing from fixture");
  return live;
}

console.log("\n[verify:v2-live-feed] V2 liveFeed block\n");

const entry = getComponentRegistryEntry("liveFeed");
assert(entry != null, "1. liveFeed registry entry");
assert(
  entry?.variants.includes("default") && entry.defaultVariant === "default",
  "2. registry variant default only"
);
assert(
  entry?.allowedRoles.length === 1 && entry.allowedRoles[0] === "root",
  "2b. allowed role root only"
);

assert(isV2RenderableBlockType("liveFeed"), "3. liveFeed renderable");
assert(
  (V2_RENDERABLE_BLOCK_TYPES as readonly string[]).includes("liveFeed"),
  "3b. in RENDERABLE list"
);
assert(!(V2_RENDERABLE_BLOCK_TYPES as readonly string[]).includes("stickyPromo"), "5a. stickyPromo excluded");
assert(!(V2_RENDERABLE_BLOCK_TYPES as readonly string[]).includes("popup"), "5b. popup excluded");

{
  const onlyLive = validateV2Page({
    siteCode: "L010",
    revisionId: "pub-1",
    pageSchemaVersion: 1,
    blocks: [
      blockRow({
        sectionId: "live-1",
        contentGroup: "cg-live",
        componentType: "liveFeed",
      }),
      blockRow({
        sectionId: "hero-1",
        contentGroup: "cg-hero",
        componentType: "hero",
        variant: "fullBleed",
        sectionOrder: 0,
      }),
    ],
    contents: [
      contentRow({
        contentGroup: "cg-live",
        itemId: "lr",
        role: "root",
        title: "Live",
      }),
      contentRow({
        contentGroup: "cg-hero",
        itemId: "hr",
        role: "root",
        title: "Hero",
      }),
    ],
  });
  assert(onlyLive.ok, "4a. page with hero+liveFeed validates");
  if (onlyLive.ok) {
    assert(
      hasRenderableV2Blocks(onlyLive.page),
      "4. liveFeed included in renderable set with page"
    );
  }

  const liveOnlyBlocks = validateV2Page({
    siteCode: "L010",
    revisionId: "pub-1",
    pageSchemaVersion: 1,
    blocks: [
      blockRow({
        sectionId: "live-1",
        contentGroup: "cg-live",
        componentType: "liveFeed",
      }),
    ],
    contents: [
      contentRow({
        contentGroup: "cg-live",
        itemId: "lr",
        role: "root",
        title: "Live",
      }),
    ],
  });
  assert(liveOnlyBlocks.ok, "4b. liveFeed-only page validates");
  if (liveOnlyBlocks.ok) {
    assert(
      hasRenderableV2Blocks(liveOnlyBlocks.page),
      "4b2. liveFeed-only avoids SafeState (renderable)"
    );
  }
}

assert(
  "liveFeed" in V2_BLOCK_RENDERERS,
  "1b. liveFeed registered in V2_BLOCK_RENDERERS"
);

const shellSrc = read("src/components/v2/V2PublishedPageShell.tsx");
assert(
  !shellSrc.includes('"use client"'),
  "6. shell is not client component"
);

const clientSrc = read("src/components/v2/live-feed/V2LiveFeedClient.tsx");
const blockSrc = read("src/components/v2/blocks/V2LiveFeedBlock.tsx");
assert(clientSrc.startsWith('"use client"'), "7. client island has use client");
assert(!blockSrc.includes('"use client"'), "7b. block server component");

assert(
  clientSrc.includes('fetchRecentReservations') &&
    clientSrc.includes('@/lib/api'),
  "8. reuses fetchRecentReservations /api path"
);
assert(
  clientSrc.includes("/api/reservations") === false &&
    read("src/lib/api.ts").includes("/api/reservations"),
  "8b. API path owned by shared api.ts"
);

const apiRoutes = readdirSync(join(root, "src/app/api"));
assert(!apiRoutes.includes("v2-live-feed"), "9. no V2-only live-feed API route");
assert(
  !clientSrc.includes("script.google.com") &&
    !clientSrc.includes("APPS_SCRIPT"),
  "10. no Apps Script direct call"
);
assert(clientSrc.includes("siteCode"), "11. siteCode passed to fetch");

assert(
  clientSrc.includes("formatReservationName") &&
    read("src/app/api/reservations/route.ts").includes("formatReservationName"),
  "13. name masking via shared helper + API sanitize"
);
assert(
  !clientSrc.includes("phone") ||
    !/\.phone\b|item\.phone|customerPhone/.test(clientSrc),
  "14. phone field not rendered from feed items"
);
assert(
  !clientSrc.includes("submissionId") &&
    !clientSrc.includes("validationStatus") &&
    !/\bip\b/i.test(clientSrc.replace(/IntersectionObserver/g, "")),
  "15. no submissionId/IP/raw internals"
);

assert(clientSrc.includes("V2_LIVE_FEED_LOADING_MESSAGE"), "16. loading state");
assert(clientSrc.includes("V2_LIVE_FEED_EMPTY_MESSAGE"), "17. empty state");
assert(clientSrc.includes("V2_LIVE_FEED_ERROR_MESSAGE"), "18. error state");
assert(
  !clientSrc.includes("err.message") && !clientSrc.includes("stack"),
  "19. no technical error dump"
);

assert(
  V2_LIVE_FEED_POLL_INTERVAL_MS === 45_000,
  "20. poll interval 45s (V1 contract)"
);
assert(
  clientSrc.includes("clearInterval") && clientSrc.includes("clearPoll"),
  "21. unmount clears timer"
);
assert(clientSrc.includes("inFlightRef"), "22. in-flight dedupe");
assert(
  clientSrc.includes("visibilitychange") && clientSrc.includes("document.hidden"),
  "23. hidden tab pauses polling"
);

assert(
  clientSrc.includes("isPreview") &&
    clientSrc.includes("V2_LIVE_FEED_PREVIEW_MESSAGE") &&
    clientSrc.includes("if (isPreview || !code) return"),
  "24-26. Preview skips poll + shows message"
);
assert(
  V2_LIVE_FEED_PREVIEW_MESSAGE.includes("미리보기에서는 실시간 접수 현황을 불러오지 않습니다"),
  "26b. preview copy exact"
);
assert(
  clientSrc.includes("fetchRecentReservations") &&
    /if \(isPreview[\s\S]*return/.test(clientSrc),
  "27. Published path only polls when not preview"
);

{
  const disabled = normalizeV2Rows(
    [
      blockRow({
        sectionId: "live-off",
        contentGroup: "cg-live-off",
        componentType: "liveFeed",
        variant: "default",
        sectionOrder: 1,
        enabled: "N",
      }),
    ],
    [
      contentRow({
        contentGroup: "cg-live-off",
        itemId: "live-off-root",
        role: "root",
        title: "숨김",
      }),
    ]
  );
  assert(
    disabled.blocks.length === 0 &&
      disabled.warnings.some((w) => w.code === "block_disabled"),
    "28. enabled=false liveFeed excluded before client mount"
  );
  assert(
    blockSrc.includes("normalize 단계에서 제외") ||
      blockSrc.includes("client island"),
    "28b. block documents normalize gate (no client for disabled)"
  );
}

const testDataGs = read("apps-script/V2PreviewTestDataService.gs");
assert(
  testDataGs.includes("live-feed-preview") &&
    testDataGs.includes("componentType: 'liveFeed'") &&
    testDataGs.includes("cg-live-feed-preview"),
  "29. TEST_SITE_CODE setup includes liveFeed"
);
assert(
  testDataGs.includes("buildV2PreviewTestLegacyBlockSpecs_") &&
    testDataGs.includes("liveFeed test rows appended"),
  "30. legacy upgrade path for idempotent liveFeed add"
);
assert(
  testDataGs.includes("deleteRowsBySiteCodeOnly_") &&
    testDataGs.includes("V2_PREVIEW_TEST_SITE_CODE_"),
  "31. cleanup still TEST_SITE_CODE only"
);

const liveV1 = read("src/components/LiveReservationSection.tsx");
assert(
  liveV1.includes("45000") && liveV1.includes("fetchRecentReservations"),
  "32. V1 liveFeed file still present with original poll"
);

{
  const block = liveFeedValidated();
  const html = renderToStaticMarkup(
    createElement(V2LiveFeedBlock, {
      block,
      siteCode: siteCtx.siteCode,
      isPreview: true,
    })
  );
  assert(
    html.includes(V2_LIVE_FEED_PREVIEW_MESSAGE),
    "26c. preview message rendered"
  );
  assert(
    html.includes("실시간 관심등록 현황") || html.includes("최근 관심고객"),
    "8c. sheet copy title/description rendered"
  );
}

assert(
  formatReservationName("김철수") === "김○○",
  "13b. formatReservationName contract"
);

console.log(`\n[verify:v2-live-feed] ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
