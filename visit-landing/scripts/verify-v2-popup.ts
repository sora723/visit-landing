/**
 * V2 popup overlay 회귀
 * Usage: npm run verify:v2-popup
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getComponentRegistryEntry } from "../src/v2/component-registry.ts";
import { isV2RenderableBlockType } from "../src/v2/renderable-v2-blocks.ts";
import {
  getRenderableV2Popup,
  isV2RenderableOverlayType,
} from "../src/v2/renderable-v2-overlays.ts";
import { validateV2Page } from "../src/v2/validate-v2-page.ts";
import type { V2BlockRow, V2ContentRow, ValidatedV2Page } from "../src/v2/types.ts";
import { V2PublishedPageShell } from "../src/components/v2/V2PublishedPageShell.tsx";
import {
  resolveV2PopupButtonText,
  resolveV2PopupCompleteMessage,
  resolveV2PopupShowsForm,
  resolveV2PopupTitle,
  resolveV2PopupVariant,
} from "../src/components/v2/popup/v2-popup-config.ts";
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

function pageWithPopup(variant = "form"): ValidatedV2Page {
  const contents: V2ContentRow[] = [
    contentRow({
      contentGroup: "cg-hero",
      itemId: "hr",
      role: "root",
      title: "Hero",
      revisionId: "pub-L010-20260725120000",
    }),
    contentRow({
      contentGroup: "cg-popup",
      itemId: "pr",
      role: "root",
      title: "방문예약 팝업 테스트",
      subtitle: "접수 완료 안내",
      revisionId: "pub-L010-20260725120000",
    }),
  ];
  if (variant === "form" || variant === "imageForm") {
    contents.push(
      contentRow({
        contentGroup: "cg-popup",
        itemId: "pf",
        role: "form",
        itemOrder: 2,
        revisionId: "pub-L010-20260725120000",
      }),
      contentRow({
        contentGroup: "cg-popup",
        itemId: "pc",
        role: "cta",
        itemOrder: 3,
        actionType: "submit",
        actionLabel: "방문예약하기",
        revisionId: "pub-L010-20260725120000",
      })
    );
  }
  if (variant === "image" || variant === "imageForm") {
    contents.push(
      contentRow({
        contentGroup: "cg-popup",
        itemId: "pi",
        role: "image",
        itemOrder: 4,
        imagePc: "https://example.com/popup-pc.jpg",
        imageMobile: "https://example.com/popup-m.jpg",
        revisionId: "pub-L010-20260725120000",
      })
    );
  }

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
        sectionId: "popup-1",
        contentGroup: "cg-popup",
        componentType: "popup",
        variant,
        sectionOrder: 9,
        revisionId: "pub-L010-20260725120000",
      }),
    ],
    contents,
  });
  if (!result.ok) {
    throw new Error(result.fatalErrors.map((e) => e.message).join(", "));
  }
  return result.page;
}

console.log("\n[verify:v2-popup] V2 popup overlay\n");

const reg = getComponentRegistryEntry("popup");
assert(!!reg && reg.isOverlay === true, "1. popup registry overlay");
assert(
  !!reg &&
    reg.variants.includes("image") &&
    reg.variants.includes("form") &&
    reg.variants.includes("imageForm") &&
    reg.defaultVariant === "form",
  "2. variants image|form|imageForm, default form"
);
assert(!!reg && reg.maxPerPage === 1, "3. maxPerPage 1");

assert(isV2RenderableOverlayType("popup"), "4. popup overlay renderable");
assert(!isV2RenderableBlockType("popup"), "5. not document renderable");

{
  const page = pageWithPopup("form");
  assert(page.overlays.length === 1, "6. popup goes to overlays");
  assert(
    getRenderableV2Popup(page)?.sectionId === "popup-1",
    "7. getRenderableV2Popup"
  );
  const block = page.overlays[0]!;
  assert(resolveV2PopupVariant(block) === "form", "8. form variant");
  assert(resolveV2PopupTitle(block) === "방문예약 팝업 테스트", "9. title");
  assert(
    resolveV2PopupCompleteMessage(block) === "접수 완료 안내",
    "10. complete from subtitle"
  );
  assert(resolveV2PopupShowsForm(block) === true, "11. shows form");
  assert(
    resolveV2PopupButtonText(block) === "방문예약하기",
    "12. button from cta"
  );
}

{
  // variant=image 이지만 form만 있으면 coerce → overlay 유지
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
        sectionId: "popup-coerce",
        contentGroup: "cg-popup-c",
        componentType: "popup",
        variant: "image",
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
        contentGroup: "cg-popup-c",
        itemId: "pr",
        role: "root",
        title: "폼만 있는 팝업",
        revisionId: "pub-L010-20260725120000",
      }),
      contentRow({
        contentGroup: "cg-popup-c",
        itemId: "pf",
        role: "form",
        itemOrder: 2,
        revisionId: "pub-L010-20260725120000",
      }),
    ],
  });
  assert(result.ok === true, "12b. coerce validate ok");
  assert(
    result.ok &&
      result.page.overlays.some((o) => o.sectionId === "popup-coerce") &&
      result.page.overlays.find((o) => o.sectionId === "popup-coerce")
        ?.variant === "form",
    "12c. image+form-only coerced to form"
  );
  assert(
    result.ok &&
      result.warnings.some((w) => w.code === "popup_variant_coerced"),
    "12d. coerce warning"
  );
}

{
  const page = pageWithPopup("form");
  const html = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page,
      site,
      conversionTracking: {},
      isPreview: true,
    })
  );
  assert(html.includes("V2 미리보기"), "13. preview banner with popup page");
  assert(
    html.includes("V2PopupOverlay") === false,
    "14. client overlay not SSR markup name"
  );
}

const shellSrc = read("src/components/v2/V2PublishedPageShell.tsx");
assert(
  shellSrc.includes("V2PopupOverlay") &&
    shellSrc.includes("getRenderableV2Popup") &&
    !shellSrc.includes('"use client"'),
  "15. shell wires popup, stays server component"
);

const overlaySrc = read("src/components/v2/overlays/V2PopupOverlay.tsx");
assert(
  overlaySrc.includes("source=\"popup\"") &&
    overlaySrc.includes("redirect={false}") &&
    overlaySrc.includes("isPreview") &&
    overlaySrc.includes("PinchZoomImage"),
  "16. V1 UX: popup source, no redirect, preview, pinch zoom"
);

const adapterSrc = read("src/components/v2/forms/V2ReservationFormAdapter.tsx");
assert(
  adapterSrc.includes("redirect") && adapterSrc.includes("onSuccess"),
  "17. adapter supports popup success without navigate"
);

const v1Popup = read("src/components/ReservationPopup.tsx");
assert(
  v1Popup.includes("useConfig") && !v1Popup.includes("V2PopupOverlay"),
  "18. V1 ReservationPopup unchanged"
);

const testData = read("apps-script/V2PreviewTestDataService.gs");
assert(
  testData.includes("popup-preview") &&
    testData.includes("componentType: 'popup'") &&
    testData.includes("cg-popup-preview") &&
    testData.includes("popup test rows appended"),
  "19. TEST_SITE_CODE setup includes popup"
);

console.log(`\n[verify:v2-popup] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
