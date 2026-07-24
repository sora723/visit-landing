/**
 * V2 Published 런타임 분기·안전 화면 회귀
 *
 * Usage: npm run verify:v2-page-runtime
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  resolveV2HomeBranch,
  resolveV2PublishedSurface,
} from "../src/lib/resolve-v2-home-branch.ts";
import { V2SafeStatePage } from "../src/components/v2/V2SafeStatePage.tsx";
import { V2PublishedPageShell } from "../src/components/v2/V2PublishedPageShell.tsx";
import type { FetchV2PublishedPageResult } from "../src/v2/server/types.ts";
import type { ValidatedV2Page } from "../src/v2/types.ts";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "../src/v2/server/types.ts";

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

const samplePage: ValidatedV2Page = {
  siteCode: "L001",
  revisionId: "pub-L001-secret-rev",
  pageSchemaVersion: "1",
  blocks: [
    {
      sectionId: "s1",
      order: 1,
      componentType: "hero",
      variant: "default",
      contentGroup: "g1",
      layout: {
        desktopVisible: true,
        mobileVisible: true,
        backgroundType: "none",
      },
      items: [],
      options: {},
    },
  ],
  overlays: [],
  warnings: [],
};

console.log("\n[verify:v2-page-runtime] V2 home branch + safe/shell\n");

assert(resolveV2HomeBranch(undefined) === "v1", "blank/undefined → V1 branch");
assert(resolveV2HomeBranch("") === "v1", "empty → V1 branch");
assert(resolveV2HomeBranch("v1") === "v1", "v1 → V1 branch");
assert(resolveV2HomeBranch("v3") === "v1", "unknown → V1 branch");
assert(resolveV2HomeBranch("v2") === "v2", "exact v2 → V2 branch");
assert(resolveV2HomeBranch("V2") === "v2", "V2 case → V2 branch");

{
  const pageSrc = readFileSync(join(root, "src/app/page.tsx"), "utf8");
  assert(
    pageSrc.includes("loadV2PublishedPage") &&
      pageSrc.includes('renderer === "v2"'),
    "page.tsx: exact v2 calls loadV2PublishedPage"
  );
  assert(
    /if\s*\(\s*renderer\s*===\s*"v2"\s*\)\s*\{[\s\S]*loadV2PublishedPage/.test(
      pageSrc
    ),
    "page.tsx: loader only inside v2 branch"
  );
  assert(
    pageSrc.includes("V2PublishedPageShell") &&
      pageSrc.includes("V2SafeStatePage"),
    "page.tsx: shell + safe state wired"
  );
  assert(
    !pageSrc.includes("V2Placeholder"),
    "page.tsx: V2Placeholder no longer used"
  );
  assert(
    pageSrc.includes("ConfigProvider") && pageSrc.includes("LandingPage"),
    "page.tsx: V1 LandingPage path retained"
  );
  /** V2 실패 시 LandingPage로 돌아가지 않음 — v2 블록 안에 LandingPage 없음 */
  const v2Block = pageSrc.match(
    /if\s*\(\s*renderer\s*===\s*"v2"\s*\)\s*\{([\s\S]*?)\n  \}/
  );
  assert(!!v2Block, "page.tsx: v2 branch block found");
  if (v2Block) {
    assert(
      !v2Block[1].includes("LandingPage") &&
        !v2Block[1].includes("ConfigProvider"),
      "V2 errors do not fallback to V1 LandingPage"
    );
  }
}

{
  const reasons: FetchV2PublishedPageResult[] = [
    {
      ok: false,
      reason: "not-configured",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["not-configured"],
      remoteCode: "V2_NOT_CONFIGURED",
    },
    {
      ok: false,
      reason: "not-published",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["not-published"],
      remoteCode: "V2_NOT_PUBLISHED",
    },
    {
      ok: false,
      reason: "network",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES.network,
    },
    {
      ok: false,
      reason: "invalid-response",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["invalid-response"],
    },
    {
      ok: false,
      reason: "invalid-page",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["invalid-page"],
    },
  ];
  for (const r of reasons) {
    assert(
      resolveV2PublishedSurface(r) === "safe",
      `failure ${r.reason} → V2SafeStatePage`
    );
  }
  assert(
    resolveV2PublishedSurface({
      ok: true,
      page: samplePage,
      warnings: [],
      revisionId: samplePage.revisionId,
    }) === "shell",
    "success → V2PublishedPageShell"
  );
}

{
  const html = renderToStaticMarkup(
    createElement(V2SafeStatePage, {
      siteName: "테스트현장",
      phone: "010-1234-5678",
    })
  );
  assert(html.includes("페이지를 준비 중입니다."), "safe: Korean ready message");
  assert(html.includes("테스트현장"), "safe: siteName visible");
  assert(html.includes('href="tel:01012345678"'), "safe: tel button when phone");
  assert(!html.includes("V2_NOT_"), "safe: no remote error codes");
  assert(!html.includes("pub-"), "safe: no revisionId");
  assert(!html.includes("not-configured"), "safe: no reason strings");
  assert(!html.includes("stack"), "safe: no stack");
  assert(
    !html.includes("ReservationForm") &&
      !html.includes("ConfigProvider") &&
      !html.includes("ConversionTracking"),
    "safe: no form/config/conversion markers"
  );
}

{
  const htmlNoPhone = renderToStaticMarkup(
    createElement(V2SafeStatePage, { siteName: "현장" })
  );
  assert(!htmlNoPhone.includes("tel:"), "safe: no tel button without phone");
}

{
  const html = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page: samplePage,
      siteName: "성공현장",
    })
  );
  assert(html.includes("성공현장"), "shell: siteName");
  assert(!html.includes("pub-L001-secret-rev"), "shell: revisionId not in HTML");
  assert(!html.includes("revisionId"), "shell: no revisionId label");
  assert(!html.includes('"blocks"'), "shell: no page JSON dump");
}

console.log(`\n[verify:v2-page-runtime] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
