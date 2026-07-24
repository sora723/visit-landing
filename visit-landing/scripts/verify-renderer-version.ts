/**
 * rendererVersion 분기 회귀 — production `resolveRendererVersion` import
 *
 * Usage: npm run verify:renderer-version
 */

import {
  resolveHomeRobotsMetadata,
  resolveRendererVersion,
} from "../src/lib/resolve-renderer-version.ts";
import type { SiteConfig } from "../src/lib/types.ts";
import {
  clearSiteLiveConfigCache,
  dedupeSiteLiveConfigFetch,
} from "../src/lib/site-live-config-cache.ts";
import type { SiteLiveConfigData } from "../src/lib/fetch-site-live-config.ts";
import { EMPTY_CONVERSION_TRACKING } from "../src/lib/conversion-tracking.ts";
import { EMPTY_OWNERSHIP_VERIFICATION } from "../src/lib/ownership-verification.ts";

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

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual === expected) ok(label);
  else
    fail(
      label,
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
}

/** page.tsx와 동일한 선택: v2만 placeholder, 나머지 LandingPage */
function chooseSurface(rendererVersion: unknown): "landing" | "v2-placeholder" {
  return resolveRendererVersion(rendererVersion) === "v2"
    ? "v2-placeholder"
    : "landing";
}

console.log("\n[verify:renderer-version] safe V1/V2 branch\n");

assertEqual(resolveRendererVersion(undefined), "v1", "undefined → v1");
assertEqual(chooseSurface(undefined), "landing", "undefined → LandingPage");

assertEqual(resolveRendererVersion(""), "v1", "empty string → v1");
assertEqual(chooseSurface(""), "landing", "empty → LandingPage");

assertEqual(resolveRendererVersion("v1"), "v1", "v1 → v1");
assertEqual(chooseSurface("v1"), "landing", "v1 → LandingPage");

assertEqual(resolveRendererVersion("v2"), "v2", "v2 → v2");
assertEqual(chooseSurface("v2"), "v2-placeholder", "v2 → V2 placeholder");

assertEqual(resolveRendererVersion("V2"), "v2", "V2 (case) → v2");
assertEqual(chooseSurface("V2"), "v2-placeholder", "V2 → placeholder");

assertEqual(resolveRendererVersion("  v2  "), "v2", "trimmed v2 → v2");
assertEqual(chooseSurface("  v2  "), "v2-placeholder", "spaced v2 → placeholder");

assertEqual(resolveRendererVersion("v3"), "v1", "unknown v3 → v1 (safe)");
assertEqual(chooseSurface("v3"), "landing", "v3 → LandingPage");

assertEqual(resolveRendererVersion(null), "v1", "null → v1");
assertEqual(resolveRendererVersion(2), "v1", "number → v1");

/** fallback site.json과 동일: rendererVersion 필드 없음 */
const fallbackLike = { siteCode: "L001" } as Partial<SiteConfig>;
assertEqual(
  resolveRendererVersion(fallbackLike.rendererVersion),
  "v1",
  "fallback without rendererVersion → v1"
);
assertEqual(
  chooseSurface(fallbackLike.rendererVersion),
  "landing",
  "fallback config → LandingPage"
);

/** page.tsx generateMetadata robots — V1은 null(덮어쓰지 않음) */
{
  const v1 = resolveHomeRobotsMetadata(undefined);
  if (v1 === null) ok("V1 metadata not noindex (robots null)");
  else fail("V1 metadata not noindex (robots null)");

  const v1Explicit = resolveHomeRobotsMetadata("v1");
  if (v1Explicit === null) ok("rendererVersion v1 → no robots override");
  else fail("rendererVersion v1 → no robots override");

  const v2 = resolveHomeRobotsMetadata("v2");
  if (v2 && v2.index === false && v2.follow === false) {
    ok("v2 placeholder metadata → noindex,nofollow");
  } else {
    fail("v2 placeholder metadata → noindex,nofollow");
  }
}

/**
 * metadata/page가 공유하는 site live config loader의 하위 dedupe.
 * (React cache + 60s TTL + in-flight — 원격 Apps Script 중복 방지)
 */
async function verifySiteLiveConfigDedupe() {
  const code = "__verify_dedupe_site__";
  clearSiteLiveConfigCache(code);
  let fetchCalls = 0;
  const mock: SiteLiveConfigData = {
    source: "sheet",
    siteConfig: { siteCode: code } as SiteConfig,
    conversionTracking: EMPTY_CONVERSION_TRACKING,
    ownershipVerification: EMPTY_OWNERSHIP_VERIFICATION,
  };

  const fetcher = async () => {
    fetchCalls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return mock;
  };

  await Promise.all([
    dedupeSiteLiveConfigFetch(code, fetcher),
    dedupeSiteLiveConfigFetch(code, fetcher),
  ]);
  const second = await dedupeSiteLiveConfigFetch(code, fetcher);

  if (fetchCalls === 1 && second.source === "sheet") {
    ok("shared site live config loader: same siteCode → 1 underlying fetch");
  } else {
    fail(
      "shared site live config loader: same siteCode → 1 underlying fetch",
      `fetchCalls=${fetchCalls}`
    );
  }
  clearSiteLiveConfigCache(code);
}

await verifySiteLiveConfigDedupe();

console.log(`\n[verify:renderer-version] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
