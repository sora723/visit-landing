/**
 * V1 siteCode 해석 회귀 — production 모듈을 import해 현재 동작을 고정한다.
 *
 * 방식: A — `resolve-site-code` / `fetch-domain-site-code-map` 실제 export 호출
 * (라우팅 로직을 테스트 파일에 재구현하지 않음)
 *
 * 한계 (런타임 미수정 유지):
 * - `middleware.ts` / `resolveRequestSiteCode` 전체 HTTP 흐름은
 *   domain 맵 fetch(Apps Script)에 의존하므로 이 스크립트에서 mock 실행하지 않음.
 * - 우선순위 헬퍼·도메인 맵·appendSiteCodeQuery 계약으로 V1 동작을 고정한다.
 *
 * Usage: npm run verify:site-code
 */

import {
  appendSiteCodeQuery,
  DEFAULT_SITE_CODE,
  resolveSiteCode,
  resolveSiteCodeInput,
  siteCodeQueryParam,
} from "../src/lib/resolve-site-code.ts";
import {
  normalizeHostname,
  resolveSiteCodeFromDomainMap,
} from "../src/lib/fetch-domain-site-code-map.ts";

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

console.log("\n[verify:site-code] V1 siteCode routing regression (production imports)\n");

const envFallback =
  String(process.env.SHEET_SITE_CODE ?? "").trim() || DEFAULT_SITE_CODE;

// --- 공용 도메인 / Netlify 기본 도메인 + query siteCode
assertEqual(
  resolveSiteCodeInput({
    querySiteCode: "L007",
    domainSiteCode: null,
  }),
  "L007",
  "shared/Netlify host (no domain map): ?siteCode= selects site"
);

assertEqual(
  resolveSiteCodeInput({
    querySiteCode: "L007",
    domainSiteCode: "L001",
  }),
  "L007",
  "shared domain + query overrides domain map (V1 priority)"
);

assertEqual(
  resolveSiteCodeFromDomainMap("unknown.netlify.app", {
    "example-site.com": "L002",
  }),
  null,
  "Netlify default host unmapped → null (falls through to query/env)"
);

assertEqual(
  resolveSiteCodeInput({
    querySiteCode: "L007",
    domainSiteCode: resolveSiteCodeFromDomainMap("smodelhouse.netlify.app", {
      "custom.kr": "L002",
    }),
  }),
  "L007",
  "Netlify default + query siteCode (domain map miss + query)"
);

// --- 등록된 현장 도메인
assertEqual(
  resolveSiteCodeFromDomainMap("www.example-site.com", {
    "example-site.com": "L002",
    "www.example-site.com": "L002",
  }),
  "L002",
  "registered custom domain maps to site"
);

assertEqual(
  resolveSiteCodeInput({ domainSiteCode: "L002" }),
  "L002",
  "custom domain only (no query): domain selects site"
);

assertEqual(
  normalizeHostname("https://WWW.Example-Site.com/path?x=1"),
  "example-site.com",
  "normalizeHostname for registered domain hosts"
);

// --- query + cookie 기존 우선순위
assertEqual(
  resolveSiteCodeInput({
    querySiteCode: "L007",
    cookieSiteCode: "L001",
  }),
  "L007",
  "query beats cookie"
);

// --- query 없는 cookie fallback
assertEqual(
  resolveSiteCodeInput({ cookieSiteCode: "L004" }),
  "L004",
  "no query: cookie fallback"
);

// --- x-site-code (header)
assertEqual(
  resolveSiteCodeInput({
    headerSiteCode: "L002",
    domainSiteCode: "L003",
    cookieSiteCode: "L004",
  }),
  "L002",
  "x-site-code header beats domain/cookie"
);

assertEqual(
  resolveSiteCodeInput({
    querySiteCode: "L007",
    headerSiteCode: "L002",
  }),
  "L007",
  "query still beats x-site-code header (V1)"
);

// --- /complete siteCode 연속성 (appendSiteCodeQuery)
assertEqual(
  appendSiteCodeQuery("/complete", "L007"),
  "/complete?siteCode=L007",
  "/complete continuity: append siteCode"
);

assertEqual(
  appendSiteCodeQuery("/complete?verified=1", "L007"),
  "/complete?verified=1&siteCode=L007",
  "/complete continuity: keep existing query then siteCode"
);

// --- 다른 query parameter 보존 (NaPm, UTM, gclid 등)
assertEqual(
  appendSiteCodeQuery(
    "/?NaPm=x&utm_source=naver&utm_medium=cpc&gclid=abc",
    "L007"
  ),
  "/?NaPm=x&utm_source=naver&utm_medium=cpc&gclid=abc&siteCode=L007",
  "preserves NaPm/UTM/gclid when appending siteCode"
);

assertEqual(
  siteCodeQueryParam("L007"),
  "siteCode=L007",
  "siteCodeQueryParam helper"
);

// --- 빈값 / 잘못된 siteCode fallback (현재 V1: trim 후 상위 소스 스킵, 값 있으면 그대로 사용)
assertEqual(resolveSiteCode("  "), envFallback, "blank query → env/default");
assertEqual(resolveSiteCode(null), envFallback, "null query → env/default");
assertEqual(resolveSiteCode(""), envFallback, "empty string query → env/default");
assertEqual(
  resolveSiteCodeInput({}),
  envFallback,
  `all empty → env or DEFAULT (${envFallback})`
);
assertEqual(
  resolveSiteCodeInput({ querySiteCode: "NOT_A_REAL_CODE" }),
  "NOT_A_REAL_CODE",
  "nonempty invalid code passes through (V1 does not validate format here)"
);

// --- 전체 우선순위 체인 스모크
assertEqual(
  resolveSiteCodeInput({
    querySiteCode: "L007",
    bodySiteCode: "L001",
    headerSiteCode: "L002",
    domainSiteCode: "L003",
    cookieSiteCode: "L004",
  }),
  "L007",
  "full chain: query wins"
);

assertEqual(
  resolveSiteCodeInput({
    bodySiteCode: "L001",
    headerSiteCode: "L002",
    domainSiteCode: "L003",
    cookieSiteCode: "L004",
  }),
  "L001",
  "full chain without query: body wins"
);

assertEqual(DEFAULT_SITE_CODE, "L001", "DEFAULT_SITE_CODE constant is L001");

console.log(`\n[verify:site-code] ${passed} passed, ${failed} failed`);
console.log(
  "Note: middleware /api/* full request path not exercised (needs Apps Script domain fetch mock)."
);
console.log(
  "API continuity relies on resolveRequestSiteCode → resolveSiteCodeInput (same priority tested above).\n"
);
process.exit(failed > 0 ? 1 : 0);
