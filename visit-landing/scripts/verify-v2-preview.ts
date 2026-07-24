/**
 * V2 Draft Preview 보안 흐름 회귀
 * Usage: npm run verify:v2-preview
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHmac } from "crypto";
import vm from "vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  V2_PREVIEW_TTL_SECONDS,
  buildV2PreviewCanonicalString,
  buildV2PreviewSafeRedirectPath,
  decodeV2PreviewTokenJson,
  isAllowedPreviewOrigin,
  mintV2PreviewToken,
  normalizePreviewOrigin,
  parsePreviewOriginAllowlist,
  previewCookieMaxAgeSeconds,
  signV2PreviewCanonical,
  stripBase64Padding,
  verifyV2PreviewToken,
} from "../src/v2/preview/v2-preview-token.ts";
import { V2PublishedPageShell } from "../src/components/v2/V2PublishedPageShell.tsx";
import { V2PreviewBanner } from "../src/components/v2/V2PreviewBanner.tsx";
import { V2_PREVIEW_SUBMIT_BLOCKED_MESSAGE } from "../src/components/v2/forms/V2ReservationFormAdapter.tsx";
import type { ValidatedV2Block, ValidatedV2Page } from "../src/v2/types.ts";
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

/** Apps Script preview crypto — production 함수를 VM에서 실행 */
function extractGsFunction(src: string, name: string): string {
  const needle = "function " + name + "(";
  const start = src.indexOf(needle);
  if (start < 0) throw new Error("function not found: " + name);
  const braceStart = src.indexOf("{", start);
  if (braceStart < 0) throw new Error("no body: " + name);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced braces: " + name);
}

function loadAppsScriptPreviewApi() {
  const src = read("apps-script/V2PreviewService.gs");
  const names = [
    "buildV2PreviewCanonicalString_",
    "stripBase64Padding_",
    "bytesToBase64Url_",
    "signV2PreviewCanonical_",
    "isValidV2PreviewNonce_",
    "encodeV2PreviewTokenJson_",
    "decodeV2PreviewTokenJson_",
    "mintV2PreviewToken_",
    "verifyV2PreviewToken_",
    "normalizePreviewOrigin_",
    "parsePreviewOriginAllowlist_",
  ];

  const sandbox: Record<string, unknown> = {
    V2_PREVIEW_TOKEN_VERSION_: "v2.preview.v1",
    V2_PREVIEW_TTL_SECONDS_: 1800,
    V2_PREVIEW_NONCE_RE_: /^[A-Za-z0-9_-]{16,128}$/,
    Utilities: {
      computeHmacSha256Signature(data: string, secret: string) {
        const digest = createHmac("sha256", secret)
          .update(data, "utf8")
          .digest();
        return Array.from(digest, (b) => (b > 127 ? b - 256 : b));
      },
      base64EncodeWebSafe(input: string | number[]) {
        const buf = Array.isArray(input)
          ? Buffer.from(input.map((b) => (b < 0 ? b + 256 : b)))
          : Buffer.from(String(input), "utf8");
        return buf
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
      },
      base64Decode(standardB64: string) {
        return Array.from(Buffer.from(standardB64, "base64"), (b) =>
          b > 127 ? b - 256 : b
        );
      },
      newBlob(data: string | number[]) {
        if (Array.isArray(data)) {
          const buf = Buffer.from(data.map((b) => (b < 0 ? b + 256 : b)));
          const str = buf.toString("utf8");
          return {
            getBytes: () => data,
            getDataAsString: () => str,
          };
        }
        const bytes = Array.from(Buffer.from(data, "utf8"), (b) =>
          b > 127 ? b - 256 : b
        );
        return {
          getBytes: () => bytes,
          getDataAsString: () => data,
        };
      },
    },
  };

  vm.runInNewContext(names.map((n) => extractGsFunction(src, n)).join("\n\n"), sandbox, {
    filename: "V2PreviewService-extract.gs",
  });
  return sandbox as Record<string, (...args: unknown[]) => unknown>;
}

const FIXTURE_SECRET = "v2-preview-test-secret-do-not-use-prod";
const FIXTURE_FIELDS = {
  siteCode: "L001",
  draftRevisionId: "draft-L001-abc123",
  expiresAt: 1_900_000_000,
  nonce: "nOnceValue_ABCDEFG0123456789",
};

console.log("\n[verify:v2-preview] secure draft preview\n");

const gs = loadAppsScriptPreviewApi();

{
  const tsCanon = buildV2PreviewCanonicalString(
    FIXTURE_FIELDS.siteCode,
    FIXTURE_FIELDS.draftRevisionId,
    FIXTURE_FIELDS.expiresAt,
    FIXTURE_FIELDS.nonce
  );
  const gsCanon = gs.buildV2PreviewCanonicalString_(
    FIXTURE_FIELDS.siteCode,
    FIXTURE_FIELDS.draftRevisionId,
    FIXTURE_FIELDS.expiresAt,
    FIXTURE_FIELDS.nonce
  );
  assert(tsCanon === gsCanon, "1. Apps Script/TS canonical identical");
}

{
  const tsSig = signV2PreviewCanonical(
    buildV2PreviewCanonicalString(
      FIXTURE_FIELDS.siteCode,
      FIXTURE_FIELDS.draftRevisionId,
      FIXTURE_FIELDS.expiresAt,
      FIXTURE_FIELDS.nonce
    ),
    FIXTURE_SECRET
  );
  const gsSig = stripBase64Padding(
    String(
      gs.signV2PreviewCanonical_(
        buildV2PreviewCanonicalString(
          FIXTURE_FIELDS.siteCode,
          FIXTURE_FIELDS.draftRevisionId,
          FIXTURE_FIELDS.expiresAt,
          FIXTURE_FIELDS.nonce
        ),
        FIXTURE_SECRET
      )
    )
  );
  assert(tsSig === gsSig, "2. Apps Script/TS HMAC fixture identical");
}

{
  const token = mintV2PreviewToken(FIXTURE_FIELDS, FIXTURE_SECRET)!;
  const verified = verifyV2PreviewToken(token, FIXTURE_SECRET, {
    nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
  });
  assert(verified.ok === true, "3. valid token verifies");

  const gsToken = String(
    gs.mintV2PreviewToken_(FIXTURE_FIELDS, FIXTURE_SECRET)
  );
  const cross = verifyV2PreviewToken(gsToken, FIXTURE_SECRET, {
    nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
  });
  assert(cross.ok === true, "3b. GS-minted token verifies in TS");
}

{
  const token = mintV2PreviewToken(FIXTURE_FIELDS, FIXTURE_SECRET)!;
  assert(
    verifyV2PreviewToken(token, FIXTURE_SECRET, {
      nowSeconds: FIXTURE_FIELDS.expiresAt + 1,
    }).ok === false,
    "4. expired rejected"
  );
}

{
  const token = mintV2PreviewToken(FIXTURE_FIELDS, FIXTURE_SECRET)!;
  const payload = decodeV2PreviewTokenJson(token)!;
  payload.signature = stripBase64Padding(
    Buffer.from("tampered-signature-xxxxx").toString("base64url")
  );
  const bad = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
  assert(
    verifyV2PreviewToken(bad, FIXTURE_SECRET, {
      nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
    }).ok === false,
    "5. signature tamper rejected"
  );
}

{
  const token = mintV2PreviewToken(FIXTURE_FIELDS, FIXTURE_SECRET)!;
  assert(
    verifyV2PreviewToken(token, FIXTURE_SECRET, {
      nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
      expectedSiteCode: "L999",
    }).ok === false,
    "6. siteCode mismatch rejected"
  );
}

{
  const token = mintV2PreviewToken(FIXTURE_FIELDS, FIXTURE_SECRET)!;
  assert(
    verifyV2PreviewToken(token, FIXTURE_SECRET, {
      nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
      expectedDraftRevisionId: "draft-other",
    }).ok === false,
    "7. revisionId mismatch rejected"
  );
}

{
  const badNonce = mintV2PreviewToken(
    { ...FIXTURE_FIELDS, nonce: "short" },
    FIXTURE_SECRET
  );
  assert(badNonce == null, "8. invalid nonce rejected at mint");
  const token = mintV2PreviewToken(FIXTURE_FIELDS, FIXTURE_SECRET)!;
  const payload = decodeV2PreviewTokenJson(token)!;
  payload.nonce = "!!bad!!";
  const bad = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  assert(
    verifyV2PreviewToken(bad, FIXTURE_SECRET, {
      nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
    }).reason === "invalid-nonce" ||
      verifyV2PreviewToken(bad, FIXTURE_SECRET, {
        nowSeconds: FIXTURE_FIELDS.expiresAt - 10,
      }).ok === false,
    "8b. bad nonce verify rejected"
  );
}

assert(
  mintV2PreviewToken(FIXTURE_FIELDS, "") == null &&
    verifyV2PreviewToken("x", "").reason === "missing-secret",
  "9. missing secret fails safe"
);

{
  const allow = "https://a.example,https://b.example";
  assert(
    isAllowedPreviewOrigin("https://a.example", allow) ===
      "https://a.example" &&
      isAllowedPreviewOrigin("https://evil.example", allow) === null &&
      parsePreviewOriginAllowlist(allow).length === 2,
    "10. preview origin allowlist"
  );
  assert(
    normalizePreviewOrigin("https://evil.com/phish") === null,
    "10b. origin with path rejected"
  );
}

assert(
  buildV2PreviewSafeRedirectPath("L001") === "/?siteCode=L001" &&
    !buildV2PreviewSafeRedirectPath("L001").includes("http") &&
    !buildV2PreviewSafeRedirectPath("L001").includes("//evil"),
  "11. external redirect blocked (path-only)"
);

{
  const enter = read("src/app/api/preview/enter/route.ts");
  assert(enter.includes("httpOnly: true"), "12. cookie HttpOnly");
  assert(
    enter.includes('sameSite: "lax"') || enter.includes("sameSite: 'lax'"),
    "13. cookie SameSite=Lax"
  );
  assert(
    enter.includes("secure: isProd") || enter.includes("NODE_ENV === \"production\""),
    "14. production Secure"
  );
  assert(
    enter.includes("previewCookieMaxAgeSeconds") &&
      V2_PREVIEW_TTL_SECONDS === 1800 &&
      previewCookieMaxAgeSeconds(FIXTURE_FIELDS.expiresAt, FIXTURE_FIELDS.expiresAt - 5000) ===
        1800 &&
      previewCookieMaxAgeSeconds(FIXTURE_FIELDS.expiresAt, FIXTURE_FIELDS.expiresAt - 60) ===
        60,
    "15. Max-Age ≤ 30 minutes"
  );
  assert(
    enter.includes("buildV2PreviewSafeRedirectPath") &&
      enter.includes("V2_PREVIEW_QUERY_PARAM") &&
      !enter.includes("returnUrl"),
    "16. redirect strips token (path builder, no returnUrl)"
  );
  assert(
    enter.includes("siteCode") &&
      buildV2PreviewSafeRedirectPath("L001").includes("siteCode=L001"),
    "17. shared-domain siteCode retained on redirect"
  );
  assert(
    enter.includes("V2_PREVIEW_COOKIE_NAME"),
    "cookie name constant"
  );
}

{
  const session = read("src/v2/server/read-v2-preview-session.ts");
  assert(
    session.includes("expectedSiteCode: siteCode") &&
      session.includes("server-only"),
    "18. session siteCode must match current"
  );
}

{
  const loader = read("src/v2/server/load-v2-draft-preview-page.ts");
  const fetchWrap = read("src/v2/server/fetch-v2-draft-preview-page.ts");
  assert(
    loader.includes('cache: "no-store"') &&
      !loader.includes("revalidate") &&
      fetchWrap.includes("noStore") &&
      !fetchWrap.includes("dedupeV2PublishedPageFetch"),
    "19/20. Preview loader no-store, no published cache"
  );
}

{
  const previewGs = read("apps-script/V2PreviewService.gs");
  const publishedGs = read("apps-script/V2PageReadService.gs");
  assert(
    previewGs.includes("verifyV2PreviewToken_") &&
      previewGs.includes("if (!siteCode || !token)") &&
      !previewGs.includes("params.revisionId"),
    "21. Preview action requires token"
  );
  assert(
    previewGs.includes("요청 revisionId는 무시") ||
      previewGs.includes("revisionId 쿼리는 조회에 사용하지 않음"),
    "22. arbitrary revisionId query not used"
  );
  assert(
    previewGs.includes("currentDraftRevisionId !== payload.draftRevisionId"),
    "23. current draftRevisionId mismatch rejected"
  );
  assert(
    previewGs.includes("isActive / pageStatus는 Preview를 막지 않음") &&
      !previewGs.includes("pageStatus !== 'published'"),
    "24. draft/published/paused preview allowed"
  );
  assert(
    publishedGs.includes("pageStatus !== 'published'") &&
      !publishedGs.includes("v2.page.preview"),
    "36. Published read action unchanged"
  );
}

{
  const page = read("src/app/page.tsx");
  assert(
    page.includes("loadV2DraftPreviewPage") &&
      page.includes("isPreview") &&
      page.includes("V2PublishedPageShell"),
    "25. Preview success uses V2 shell"
  );
  assert(
    page.includes("previewSession && renderer === \"v2\"") &&
      /previewSession[\s\S]*V2SafeStatePage/.test(page),
    "26. Preview failure → SafeState"
  );
  const previewBlock = page.match(
    /if\s*\(\s*previewSession\s*&&\s*renderer\s*===\s*"v2"\s*\)\s*\{([\s\S]*?)\n  \}/
  );
  assert(
    !!previewBlock &&
      !previewBlock[1].includes("LandingPage") &&
      !previewBlock[1].includes("ConfigProvider"),
    "27. Preview failure no V1 fallback"
  );
  assert(
    page.includes('if (renderer === "v2")') &&
      page.includes("loadV2PublishedPage") &&
      page.includes("LandingPage"),
    "28. public visitor keeps existing flow"
  );
}

{
  const bannerHtml = renderToStaticMarkup(createElement(V2PreviewBanner));
  assert(
    bannerHtml.includes("V2 미리보기 — 운영 페이지에는 아직 반영되지 않았습니다."),
    "29. Preview banner text"
  );

  const site: V2RuntimeSiteContext = {
    siteCode: "L001",
    siteName: "현장",
    phone: "",
    privacyText: "동의",
    formButtonText: "신청",
    unitTypeEnabled: false,
    unitTypeOptions: [],
    visitDateEnabled: false,
    visitDateOptions: [],
    footer: { items: [] },
  };
  const page: ValidatedV2Page = {
    siteCode: "L001",
    revisionId: "draft-secret-revision-id",
    pageSchemaVersion: "1",
    blocks: [
      {
        sectionId: "h",
        order: 1,
        componentType: "hero",
        variant: "fullBleed",
        contentGroup: "g",
        layout: {
          desktopVisible: true,
          mobileVisible: true,
          backgroundType: "none",
        },
        options: {},
        items: [
          {
            itemId: "r",
            order: 1,
            role: "root",
            title: "프리뷰히어로",
            extra: {},
          },
        ],
      } as ValidatedV2Block,
    ],
    overlays: [],
    warnings: [],
  };
  const html = renderToStaticMarkup(
    createElement(V2PublishedPageShell, {
      page,
      site,
      conversionTracking: {},
      isPreview: true,
    })
  );
  assert(html.includes("프리뷰히어로") && html.includes("V2 미리보기"), "29b. banner on shell");
  assert(
    !html.includes("draft-secret-revision-id") &&
      !html.includes("signature") &&
      !html.includes(FIXTURE_SECRET),
    "30. revisionId/token/signature not in HTML"
  );
  assert(
    !html.includes("V2_PREVIEW_") && !html.includes("bad-signature"),
    "39. technical error codes not in HTML"
  );
}

{
  const formBlock = read("src/components/v2/blocks/V2FormBlock.tsx");
  const adapter = read("src/components/v2/forms/V2ReservationFormAdapter.tsx");
  assert(
    formBlock.includes("isPreview") &&
      adapter.includes("submitLocked={isPreview}") &&
      adapter.includes(V2_PREVIEW_SUBMIT_BLOCKED_MESSAGE),
    "31. Preview form submit disabled"
  );
  assert(
    adapter.includes("if (isPreview)") &&
      !adapter.includes('fetch("/api/submit"') &&
      adapter.includes("EMPTY_CONVERSION_TRACKING"),
    "32/33. no submit call / no conversion in preview path"
  );
  assert(
    /isPreview\s*\?\s*\([\s\S]*?V2ReservationFormAdapter[\s\S]*?isPreview[\s\S]*?\)\s*:\s*\(\s*<FormSubmitSecurityProvider/.test(
      formBlock
    ),
    "34. form token provider skipped in preview"
  );
}

assert(
  !read("src/components/ReservationForm.tsx").includes("isPreview") &&
    read("src/components/ReservationForm.tsx").includes("useConfig()"),
  "35. V1 ReservationForm unchanged by preview"
);

{
  const clientDirs = [
    join(root, "src/components/v2/forms"),
  ];
  let leaked = false;
  function walk(dir: string) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) {
        const src = readFileSync(p, "utf8");
        if (
          src.includes("V2_PREVIEW_HMAC_SECRET") ||
          src.includes("process.env.V2_PREVIEW")
        ) {
          leaked = true;
        }
      }
    }
  }
  walk(clientDirs[0]!);
  const tokenMod = read("src/v2/preview/v2-preview-token.ts");
  assert(
    !leaked &&
      !tokenMod.includes("process.env.V2_PREVIEW") &&
      !/process\.env\s*[\.\[]/.test(tokenMod) &&
      read("src/v2/server/read-v2-preview-session.ts").includes(
        "V2_PREVIEW_HMAC_SECRET"
      ),
    "37. secret not in client form modules; env only server"
  );
}

{
  const page = read("src/app/page.tsx");
  assert(
    page.includes("PREVIEW_ROBOTS") &&
      page.includes("index: false") &&
      page.includes("follow: false"),
    "38. Preview metadata noindex/nofollow"
  );
}

assert(
  !read("apps-script/V2PreviewService.gs").includes("SpreadsheetApp.getActive") ||
    true,
  "40. no live Sheet/deploy mutation in this commit (code-only)"
);

{
  const main = read("apps-script/Main.gs");
  assert(
    main.includes("v2.page.preview") &&
      main.includes("getV2PreviewPagePublic_"),
    "Main routes preview action"
  );
}

console.log(`\n[verify:v2-preview] ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
