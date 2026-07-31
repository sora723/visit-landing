/**
 * V2 stickyPromo overlay 회귀
 * Usage: npm run verify:v2-sticky-promo
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getComponentRegistryEntry } from "../src/v2/component-registry.ts";
import { isV2RenderableBlockType } from "../src/v2/renderable-v2-blocks.ts";
import {
  getRenderableV2StickyPromo,
  isV2RenderableOverlayType,
  V2_RENDERABLE_OVERLAY_TYPES,
} from "../src/v2/renderable-v2-overlays.ts";
import { validateV2Page } from "../src/v2/validate-v2-page.ts";
import type { V2BlockRow, V2ContentRow, ValidatedV2Page } from "../src/v2/types.ts";
import { V2PublishedPageShell } from "../src/components/v2/V2PublishedPageShell.tsx";
import { V2StickyPromoOverlay } from "../src/components/v2/overlays/V2StickyPromoOverlay.tsx";
import {
  resolveV2StickyPromoText,
  resolveV2StickyPromoVariant,
} from "../src/components/v2/sticky-promo/v2-sticky-promo-config.ts";
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
function assert(cond: unknown, label: string) {
  if (cond) ok(label);
  else fail(label);
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

const site: V2RuntimeSiteContext = {
  siteCode: "L010",
  siteName: "Test",
  phone: "1688-0000",
  formButtonText: "신청",
  footer: { items: [] },
};

function pageWithSticky(variant = "default"): ValidatedV2Page {
  const result = validateV2Page({
    siteCode: "L010",
    revisionId: "pub-L010-20260725120000",
    pageSchemaVersion: 1,
    blocks: [
      blockRow({
        sectionId: "hero-1",
        contentGroup: "cg-hero",
        componentType: "hero",
        variant: "fullBleed",
        sectionOrder: 0,
        revisionId: "pub-L010-20260725120000",
      }),
      blockRow({
        sectionId: "sticky-1",
        contentGroup: "cg-sticky",
        componentType: "stickyPromo",
        variant,
        sectionOrder: 9,
        revisionId: "pub-L010-20260725120000",
      }),
    ],
    contents: [
      contentRow({
        contentGroup: "cg-hero",
        itemId: "hr",
        role: "root",
        title: "Hero",
        revisionId: "pub-L010-20260725120000",
      }),
      contentRow({
        contentGroup: "cg-sticky",
        itemId: "sr",
        role: "root",
        title: "지금 방문예약 시 특별 혜택",
        revisionId: "pub-L010-20260725120000",
      }),
    ],
  });
  if (!result.ok) {
    throw new Error(result.fatalErrors.map((e) => e.message).join(", "));
  }
  return result.page;
}

console.log("\n[verify:v2-sticky-promo] V2 stickyPromo overlay\n");

const reg = getComponentRegistryEntry("stickyPromo");
assert(!!reg && reg.isOverlay === true, "1. stickyPromo registry overlay");
assert(
  !!reg &&
    reg.variants.includes("default") &&
    reg.variants.includes("compact") &&
    reg.defaultVariant === "default",
  "2. variants default|compact"
);
assert(
  !!reg &&
    reg.allowedRoles.includes("root") &&
    reg.allowedRoles.includes("cta") &&
    reg.maxPerPage === 1,
  "3. roles root/cta, maxPerPage 1"
);

assert(
  isV2RenderableOverlayType("stickyPromo") &&
    (V2_RENDERABLE_OVERLAY_TYPES as readonly string[]).includes("stickyPromo"),
  "4. stickyPromo overlay renderable"
);
assert(!isV2RenderableBlockType("stickyPromo"), "5. not document renderable");
assert(
  isV2RenderableOverlayType("popup"),
  "6. popup overlay also renderable (sibling)"
);

{
  const page = pageWithSticky();
  assert(page.overlays.length === 1, "7. sticky goes to overlays");
  assert(
    getRenderableV2StickyPromo(page)?.sectionId === "sticky-1",
    "8. getRenderableV2StickyPromo"
  );
  const text = resolveV2StickyPromoText(page.overlays[0]!);
  assert(text === "지금 방문예약 시 특별 혜택", "9. text from root title");
  assert(resolveV2StickyPromoVariant(page.overlays[0]!) === "default", "10. default variant");
}

{
  const page = pageWithSticky("compact");
  assert(
    resolveV2StickyPromoVariant(page.overlays[0]!) === "compact",
    "11. compact variant"
  );
}

{
  const page = pageWithSticky();
  const html = renderToStaticMarkup(
    createElement(V2StickyPromoOverlay, {
      block: page.overlays[0]!,
      siteCode: site.siteCode,
    })
  );
  assert(html.includes("지금 방문예약 시 특별 혜택"), "12. overlay renders text");
  assert(html.includes("promo-sticky-bar"), "13. reuses promo sticky classes");
}

{
  const page = pageWithSticky();
  const html = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page,
      site,
      conversionTracking: {},
    })
  );
  assert(html.includes("지금 방문예약 시 특별 혜택"), "14. shell includes sticky");
  assert(html.includes("V2 미리보기") === false, "15. no preview banner when not preview");
}

const promoSrc = read("src/components/PromoStickyBar.tsx");
assert(
  promoSrc.includes("livePoll") && promoSrc.includes("if (!livePoll) return"),
  "16. V1 bar supports livePoll=false"
);
assert(
  /livePoll\s*=\s*true/.test(promoSrc),
  "17. V1 default livePoll remains true"
);

const overlaySrc = read("src/components/v2/overlays/V2StickyPromoOverlay.tsx");
assert(
  overlaySrc.includes("livePoll={false}") &&
    !overlaySrc.includes('"/api/site-content"') &&
    !overlaySrc.includes("fetch("),
  "18. V2 overlay does not poll site-content"
);

const shellSrc = read("src/components/v2/V2PublishedPageShell.tsx");
assert(
  shellSrc.includes("V2StickyPromoOverlay") &&
    shellSrc.includes("getRenderableV2StickyPromo") &&
    !shellSrc.includes('"use client"'),
  "19. shell wires overlay, stays server component"
);

const testData = read("apps-script/V2PreviewTestDataService.gs");
assert(
  testData.includes("sticky-promo-preview") &&
    testData.includes("componentType: 'stickyPromo'") &&
    testData.includes("cg-sticky-promo-preview"),
  "20. TEST_SITE_CODE setup includes stickyPromo"
);
assert(
  testData.includes("stickyPromo+popup test rows appended") &&
    testData.includes("liveFeed+stickyPromo+popup test rows appended") &&
    testData.includes("popup test rows appended"),
  "21. legacy upgrade paths for sticky+popup"
);

const v1Page = read("src/app/page.tsx");
assert(
  v1Page.includes("PromoStickyBar") &&
    v1Page.includes("config.stickyPromoText") &&
    !v1Page.includes("livePoll={false}"),
  "22. V1 LandingPage sticky path unchanged (still polls)"
);

const landing = read("src/components/LandingPage.tsx");
assert(
  !landing.includes("V2StickyPromoOverlay"),
  "23. V1 LandingPage does not import V2 overlay"
);

console.log(`\n[verify:v2-sticky-promo] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
