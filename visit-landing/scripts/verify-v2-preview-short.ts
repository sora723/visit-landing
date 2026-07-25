/**
 * V2 Preview short URL 회귀
 * Usage: npm run verify:v2-preview-short
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildV2PreviewShortPath,
  isSafeV2PreviewShortPath,
  isV2PreviewShortCode,
  V2_PREVIEW_SHORT_PATH_PREFIX,
} from "../src/v2/preview/v2-preview-short-code.ts";

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

console.log("\n[verify:v2-preview-short] short advertiser Preview URL\n");

assert(isV2PreviewShortCode("a".repeat(16)), "1. 16-char code ok");
assert(isV2PreviewShortCode("A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6"), "2. 32-char ok");
assert(!isV2PreviewShortCode("short"), "3. too short rejected");
assert(!isV2PreviewShortCode("a".repeat(33)), "4. too long rejected");
assert(!isV2PreviewShortCode("abc_def_ghijklmno"), "5. underscore rejected");

assert(
  buildV2PreviewShortPath("a".repeat(16)) ===
    `${V2_PREVIEW_SHORT_PATH_PREFIX}${"a".repeat(16)}`,
  "6. path builder"
);
assert(isSafeV2PreviewShortPath(`/p/${"a".repeat(16)}`), "7. safe path");
assert(!isSafeV2PreviewShortPath(`/p/../${"a".repeat(16)}`), "8. traversal rejected");
assert(!isSafeV2PreviewShortPath("https://evil.com/p/abcdefghijklmnop"), "9. absolute rejected");

const route = read("src/app/p/[code]/route.ts");
assert(
  route.includes("resolveV2PreviewShortCode") &&
    route.includes("verifyV2PreviewToken") &&
    route.includes("Location: redirectPath") &&
    !route.includes("new URL(redirectPath, request.url)") &&
    route.includes("V2_PREVIEW_COOKIE_NAME") &&
    route.includes("httpOnly: true"),
  "10. /p/[code] sets cookie + relative Location"
);

const asPreview = read("apps-script/V2PreviewService.gs");
assert(
  asPreview.includes("createV2PreviewShortUrl") &&
    asPreview.includes("issueV2PreviewShortCode_") &&
    asPreview.includes("handleV2PreviewShortResolve") &&
    asPreview.includes("pv:") &&
    asPreview.includes("mintV2PreviewEnterBundle_"),
  "11. Apps Script mint/resolve short code"
);

const main = read("apps-script/Main.gs");
assert(
  main.includes("v2.preview.short.resolve") &&
    main.includes("handleV2PreviewShortResolve"),
  "12. Main routes short resolve"
);

const testData = read("apps-script/V2PreviewTestDataService.gs");
assert(
  testData.includes("createTestV2PreviewShortUrl") &&
    testData.includes("createV2PreviewShortUrl"),
  "13. TEST helper for short URL"
);

const enter = read("src/app/api/preview/enter/route.ts");
assert(
  enter.includes("Location: redirectPath") &&
    !enter.includes("new URL(redirectPath, request.url)"),
  "14. enter relative Location still intact"
);

const resolver = read("src/v2/server/resolve-v2-preview-short-code.ts");
assert(
  resolver.includes("server-only") &&
    resolver.includes("v2.preview.short.resolve") &&
    !resolver.includes("V2_PREVIEW_HMAC_SECRET"),
  "15. resolver uses AS only (no secret in fetch helper)"
);

console.log(`\n[verify:v2-preview-short] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
