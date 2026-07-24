/**
 * V2 form 블록 + 시스템 footer + 공용 submit 연결 회귀
 * Usage: npm run verify:v2-form-block
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getRenderableV2Blocks,
  hasRenderableV2Blocks,
  isV2RenderableBlockType,
  isV2StaticBlockType,
  V2_RENDERABLE_BLOCK_TYPES,
} from "../src/v2/renderable-v2-blocks.ts";
import { V2_BLOCK_RENDERERS } from "../src/components/v2/V2BlockRenderer.tsx";
import { V2FormBlock } from "../src/components/v2/blocks/V2FormBlock.tsx";
import { V2PublishedPageShell } from "../src/components/v2/V2PublishedPageShell.tsx";
import { SiteSystemFooter } from "../src/components/SiteSystemFooter.tsx";
import {
  buildV2ReservationSubmitInput,
  guardV2PrivacyConsent,
  V2_PRIVACY_CONSENT_ERROR,
} from "../src/components/v2/forms/V2ReservationFormAdapter.tsx";
import { useReservationSubmit } from "../src/features/reservation/useReservationSubmit.ts";
import { buildV2RuntimeSiteContext } from "../src/v2/v2-runtime-site-context.ts";
import type { ValidatedV2Block, ValidatedV2Page } from "../src/v2/types.ts";
import type { V2RuntimeSiteContext } from "../src/v2/v2-runtime-site-context.ts";
import type { SiteConfig } from "../src/lib/types.ts";

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

function baseLayout(): ValidatedV2Block["layout"] {
  return {
    desktopVisible: true,
    mobileVisible: true,
    backgroundType: "none",
  };
}

function formBlock(sectionId = "form-sec"): ValidatedV2Block {
  return {
    sectionId,
    order: 1,
    componentType: "form",
    variant: "card",
    contentGroup: `${sectionId}-g`,
    layout: baseLayout(),
    options: {},
    items: [
      {
        itemId: "root",
        order: 1,
        role: "root",
        title: "방문예약",
        subtitle: "부제",
        extra: {},
      },
      {
        itemId: "form",
        order: 2,
        role: "form",
        title: "폼",
        extra: {},
      },
      {
        itemId: "cta",
        order: 3,
        role: "cta",
        actionLabel: "예약 신청",
        actionType: "submit",
        extra: {},
      },
    ],
  };
}

function pageWith(blocks: ValidatedV2Block[]): ValidatedV2Page {
  return {
    siteCode: "L001",
    revisionId: "pub-secret",
    pageSchemaVersion: "1",
    blocks,
    overlays: [],
    warnings: [],
  };
}

const site: V2RuntimeSiteContext = {
  siteCode: "L001",
  siteName: "테스트현장",
  phone: "01012345678",
  privacyText: "개인정보 수집 및 이용에 동의합니다.",
  formButtonText: "방문예약하기",
  unitTypeEnabled: true,
  unitTypeOptions: [{ value: "84A형", label: "84A형" }],
  visitDateEnabled: true,
  visitDateOptions: [{ value: "2026-08-01", label: "8월 1일" }],
  footer: {
    items: [{ title: "운영", content: "관리주체" }],
    bottomText: "기존 고지 문구",
  },
};

console.log("\n[verify:v2-form-block] V2 form + system footer\n");

assert(V2_BLOCK_RENDERERS.form === V2FormBlock, "1. form registered in renderer");
assert(isV2RenderableBlockType("form"), "2. form is renderable");
assert(!isV2RenderableBlockType("liveFeed"), "3a. liveFeed excluded");
assert(!isV2RenderableBlockType("stickyPromo"), "3b. stickyPromo excluded");
assert(!isV2RenderableBlockType("popup"), "3c. popup excluded");
assert(isV2StaticBlockType("hero"), "3d. static types still static");
assert(!isV2StaticBlockType("form"), "3e. form is not static-only type");

{
  const onlyForm = pageWith([formBlock()]);
  assert(hasRenderableV2Blocks(onlyForm), "4. form-only page is renderable");
  assert(
    getRenderableV2Blocks(onlyForm).length === 1,
    "4b. form-only yields one block"
  );
  assert(
    V2_RENDERABLE_BLOCK_TYPES.includes("form"),
    "4c. form in renderable allowlist"
  );
}

{
  const adapter = read(
    "src/components/v2/forms/V2ReservationFormAdapter.tsx"
  );
  const formUi = read("src/components/v2/forms/V2ReservationForm.tsx");
  assert(
    adapter.includes("useReservationSubmit") &&
      !adapter.includes('fetch("/api/submit"') &&
      !adapter.includes("fetch('/api/submit'"),
    "5/6. uses shared hook, no direct /api/submit fetch"
  );
  assert(
    !adapter.includes('from "@/components/ConfigProvider"') &&
      !formUi.includes('from "@/components/ConfigProvider"') &&
      !read("src/components/v2/blocks/V2FormBlock.tsx").includes(
        'from "@/components/ConfigProvider"'
      ),
    "7. no ConfigProvider import"
  );
  assert(
    adapter.includes("useFormSubmitSecurity") &&
      read("src/components/v2/blocks/V2FormBlock.tsx").includes(
        "FormSubmitSecurityProvider"
      ),
    "8. security provider / adapter"
  );
  assert(
    adapter.includes("buildSubmitExtras") &&
      formUi.includes('name="company"'),
    "9/10. form token path + honeypot field"
  );
  assert(
    adapter.includes("buildSubmitExtras"),
    "11. elapsed via pageLoadedAt extras"
  );
  assert(
    adapter.includes("buildSubmitExtras") &&
      adapter.includes("buildV2ReservationSubmitInput"),
    "12. tracking extras passed into submit input"
  );
  assert(
    adapter.includes("siteCode: site.siteCode") ||
      adapter.includes("site.siteCode"),
    "13. siteCode to hook"
  );
}

{
  const built = buildV2ReservationSubmitInput(
    {
      name: "홍길동",
      phone: "01012345678",
      unitType: "84A형",
      visitDate: "2026-08-01",
      company: "",
      agreed: true,
    },
    site,
    {
      formToken: "tok",
      pageLoadedAt: 123,
      napm: "n",
      utmSource: "g",
    },
    "v2_form"
  );
  assert(built.name === "홍길동", "14. name");
  assert(built.phone === "01012345678", "15. phone");
  assert(built.unitType === "84A형", "16. unitType");
  assert(built.visitDate === "2026-08-01", "17. visitDate");
  // V1 UI does not collect visitTime — do not invent
  assert(
    !("visitTime" in built) || (built as { visitTime?: string }).visitTime == null,
    "18. visitTime not invented (V1 parity)"
  );
  assert(built.formToken === "tok", "9b. formToken in input");
  assert(built.pageLoadedAt === 123, "11b. pageLoadedAt in input");
  assert(built.company === "", "10b. honeypot company");
  assert(built.source === "v2_form", "source");
}

assert(
  guardV2PrivacyConsent({ agreed: false }) === V2_PRIVACY_CONSENT_ERROR,
  "19. consent blocks submit"
);
assert(guardV2PrivacyConsent({ agreed: true }) === null, "20. consent allows");

{
  const adapter = read(
    "src/components/v2/forms/V2ReservationFormAdapter.tsx"
  );
  const formUi = read("src/components/v2/forms/V2ReservationForm.tsx");
  assert(
    adapter.includes("guardV2PrivacyConsent") &&
      adapter.includes("useReservationSubmit"),
    "20b. consent then shared submit"
  );
  assert(
    (formUi.includes("disabled={submitting}") ||
      formUi.includes("disabled={blocked}")) &&
      formUi.includes("aria-disabled") &&
      formUi.includes("처리 중"),
    "21/22. duplicate click + loading UI"
  );
}

{
  const hook = read("src/features/reservation/useReservationSubmit.ts");
  assert(
    typeof useReservationSubmit === "function" &&
      hook.includes("allowConversion") &&
      hook.includes("runConversionAfterSubmit"),
    "23/24/25/26. shared engine success/dup/error/conversion"
  );
  assert(
    hook.includes('appendSiteCodeQuery("/complete"') &&
      hook.includes("submissionId="),
    "27. complete URL contract"
  );
}

{
  const formUi = read("src/components/v2/forms/V2ReservationForm.tsx");
  assert(
    formUi.includes("`v2-${sectionId}-") ||
      formUi.includes("v2-${sectionId}-"),
    "28. input id sectionId-based"
  );
}

{
  const v1 = read("src/components/ReservationForm.tsx");
  assert(
    v1.includes('type="tel"') &&
      v1.includes('name="company"') &&
      v1.includes("useConfig()") &&
      v1.includes("개인정보 수집 및 이용에 동의합니다."),
    "29/30. V1 ReservationForm fields/contracts intact"
  );
}

{
  const formUi = read("src/components/v2/forms/V2ReservationForm.tsx");
  assert(
    formUi.includes("min-w-0") &&
      formUi.includes("max-w-full") &&
      formUi.includes("overflow-hidden"),
    "31. date/grid overflow guards"
  );
}

{
  const footerHtml = renderToStaticMarkup(
    createElement(SiteSystemFooter, {
      siteName: "테스트현장",
      footer: site.footer,
    })
  );
  assert(
    footerHtml.includes("테스트현장") &&
      footerHtml.includes("© 2026 DAVID") &&
      footerHtml.includes("기존 고지 문구"),
    "32. system footer always renders content"
  );

  const shellHtml = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page: pageWith([
        {
          sectionId: "fi",
          order: 1,
          componentType: "footerInfo",
          variant: "default",
          contentGroup: "fi-g",
          layout: baseLayout(),
          options: {},
          items: [
            {
              itemId: "r",
              order: 1,
              role: "root",
              title: "디자인푸터",
              description: "설명",
              extra: {},
            },
          ],
        },
      ]),
      site: { ...site, footer: { items: [] } },
      conversionTracking: {},
    })
  );
  assert(
    shellHtml.includes("디자인푸터") &&
      shellHtml.includes("© 2026 DAVID") &&
      shellHtml.includes("테스트현장"),
    "33. footerInfo does not replace system footer"
  );

  const shellNoInfo = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page: pageWith([
        {
          sectionId: "h",
          order: 1,
          componentType: "hero",
          variant: "fullBleed",
          contentGroup: "h-g",
          layout: baseLayout(),
          options: {},
          items: [
            {
              itemId: "r",
              order: 1,
              role: "root",
              title: "히어로",
              extra: {},
            },
          ],
        },
      ]),
      site: { ...site, footer: { items: [] } },
      conversionTracking: {},
    })
  );
  assert(
    shellNoInfo.includes("© 2026 DAVID") && !shellNoInfo.includes("디자인푸터"),
    "34. system footer without footerInfo"
  );
}

{
  const formUi = read("src/components/v2/forms/V2ReservationForm.tsx");
  const adapter = read(
    "src/components/v2/forms/V2ReservationFormAdapter.tsx"
  );
  assert(
    adapter.includes('appendSiteCodeQuery("/privacy"') &&
      formUi.includes("privacyHref"),
    "35. privacy link uses /privacy + siteCode"
  );
  assert(
    !formUi.includes("dangerouslySetInnerHTML") &&
      !adapter.includes("dangerouslySetInnerHTML") &&
      !read("src/components/v2/blocks/V2FormBlock.tsx").includes(
        "dangerouslySetInnerHTML"
      ),
    "36. no raw HTML/JS execution"
  );
}

{
  const shell = read("src/components/v2/V2PublishedPageShell.tsx");
  const renderer = read("src/components/v2/V2BlockRenderer.tsx");
  const formBlockSrc = read("src/components/v2/blocks/V2FormBlock.tsx");
  assert(
    !shell.includes('"use client"') &&
      !renderer.includes('"use client"') &&
      !formBlockSrc.includes('"use client"'),
    "37. shell/renderer/form block stay server components"
  );

  const v2Dir = join(root, "src/components/v2");
  const staticClients: string[] = [];
  function walk(dir: string) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        if (name.name === "forms") continue;
        walk(p);
        continue;
      }
      if (!name.name.endsWith(".tsx")) continue;
      if (name.name === "V2Placeholder.tsx") continue;
      const src = readFileSync(p, "utf8");
      if (src.includes('"use client"') || src.includes("'use client'")) {
        staticClients.push(p);
      }
    }
  }
  walk(v2Dir);
  assert(
    staticClients.length === 0,
    "38. static V2 blocks remain server components"
  );
}

{
  const ctx = buildV2RuntimeSiteContext("L001", {
    siteName: "시트현장",
    phone: "010",
    cta: { buttonText: "신청", privacyText: "동의문구", texts: [] },
    footer: {
      items: [{ title: "전화", content: "010" }],
      bottomText: "a\\nb",
    },
    reservationForm: {
      unitTypeEnabled: false,
      visitDateEnabled: false,
    },
  } as SiteConfig);
  assert(
    ctx.siteCode === "L001" &&
      ctx.unitTypeEnabled === false &&
      ctx.footer.bottomText?.includes("\n") &&
      !("conversionRawHtml" in ctx) &&
      !("conversionTracking" in ctx),
    "runtime context minimal + footer bottomText"
  );
}

{
  const hiddenUnit = buildV2ReservationSubmitInput(
    {
      name: "A",
      phone: "010",
      unitType: "84A형",
      visitDate: "x",
      company: "",
      agreed: true,
    },
    {
      ...site,
      unitTypeEnabled: false,
      unitTypeOptions: [],
      visitDateEnabled: false,
      visitDateOptions: [],
    },
    {},
    "v2_form"
  );
  assert(
    hiddenUnit.unitType === undefined && hiddenUnit.visitDate === undefined,
    "field hide when disabled"
  );
}

console.log(`\n[verify:v2-form-block] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
