/**
 * rendererVersion 분기 회귀 — production `resolveRendererVersion` import
 *
 * Usage: npm run verify:renderer-version
 */

import { resolveRendererVersion } from "../src/lib/resolve-renderer-version.ts";
import type { SiteConfig } from "../src/lib/types.ts";

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

console.log(`\n[verify:renderer-version] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
