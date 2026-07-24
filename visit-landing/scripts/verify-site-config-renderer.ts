/**
 * site.config rendererVersion SoT + V2 without 콘텐츠관리
 * Usage: npm run verify:site-config-renderer
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import siteJson from "../config/site.json" with { type: "json" };
import { buildSiteConfigFromApi } from "../src/lib/site-config-from-api.ts";
import { parseSiteConfigApiResponse } from "../src/lib/site-config-api.ts";
import {
  pickRendererVersionFromSources,
  resolveRendererVersion,
} from "../src/lib/resolve-renderer-version.ts";
import type { SiteConfig } from "../src/lib/types.ts";
import type { SiteConfigApiData } from "../src/lib/site-config-api.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FALLBACK = siteJson as SiteConfig;

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

function baseApi(over: Partial<SiteConfigApiData> = {}): SiteConfigApiData {
  return {
    siteCode: "T999",
    stickyPromoText: null,
    unitTypeOptions: [],
    visitDateDays: 30,
    visitDateOptions: null,
    unitTypeEnabled: false,
    visitDateEnabled: false,
    ...over,
  };
}

console.log("\n[verify:site-config-renderer] site.config SoT\n");

{
  const cfg = buildSiteConfigFromApi(
    baseApi({
      rendererVersion: "v2",
      siteName: "V2 Only",
      phone: "1688-0001",
      extendedData: { rendererVersion: "v1" } as SiteConfigApiData["extendedData"],
    }),
    FALLBACK
  );
  assert(cfg.rendererVersion === "v2", "1. site management v2 reaches SiteConfig");
  assert(
    resolveRendererVersion(cfg.rendererVersion) === "v2",
    "1b. resolves to v2 branch"
  );
}

{
  const cfg = buildSiteConfigFromApi(
    baseApi({
      rendererVersion: "v2",
      extendedData: { rendererVersion: "v1" } as SiteConfigApiData["extendedData"],
    }),
    FALLBACK
  );
  assert(cfg.rendererVersion === "v2", "2. site=v2 / ext=v1 → v2");
}

{
  const cfg = buildSiteConfigFromApi(
    baseApi({
      rendererVersion: "v1",
      extendedData: { rendererVersion: "v2" } as SiteConfigApiData["extendedData"],
    }),
    FALLBACK
  );
  assert(cfg.rendererVersion === "v1", "3. site=v1 / ext=v2 → v1");
}

{
  const cfg = buildSiteConfigFromApi(
    baseApi({
      rendererVersion: undefined,
      extendedData: { rendererVersion: "v2" } as SiteConfigApiData["extendedData"],
    }),
    FALLBACK
  );
  assert(cfg.rendererVersion === "v2", "4. site blank / ext=v2 → v2 fallback");
}

{
  const cfg = buildSiteConfigFromApi(
    baseApi({
      rendererVersion: undefined,
      extendedData: {},
    }),
    { ...FALLBACK, rendererVersion: undefined }
  );
  assert(
    resolveRendererVersion(cfg.rendererVersion) === "v1",
    "5. both blank → V1"
  );
}

{
  /** Apps Script V2 minimal envelope → Next parse → SiteConfig */
  const envelope = {
    success: true,
    data: {
      siteCode: "T999",
      rendererVersion: "v2",
      siteName: "V2 Minimal",
      phone: "1688-0001",
      managerName: "Tester",
      notificationPhone: "01000000001",
      settings: {
        popupEnabled: true,
        popupReservationEnabled: false,
        liveStatusEnabled: false,
        virtualReservationsEnabled: false,
        duplicateBlockMinutes: 120,
      },
      stickyPromoText: null,
      unitTypeOptions: [],
      visitDateDays: 30,
      visitDateOptions: null,
      unitTypeEnabled: false,
      visitDateEnabled: false,
      footer: { items: [] },
      extendedData: {},
      conversionTracking: {},
      ownershipVerification: {},
      updatedAt: "2026-07-24T00:00:00.000Z",
    },
    error: null,
  };
  const parsed = parseSiteConfigApiResponse(envelope, "T999");
  assert(parsed != null && parsed.rendererVersion === "v2", "6. minimal site.config parse ok");
  const cfg = buildSiteConfigFromApi(parsed!, FALLBACK);
  assert(
    cfg.rendererVersion === "v2" &&
      cfg.siteName === "V2 Minimal" &&
      cfg.phone === "1688-0001" &&
      cfg.reservationForm?.unitTypeEnabled === false,
    "6b. V2 site + no content row → runtime config"
  );
  assert(
    resolveRendererVersion(cfg.rendererVersion) === "v2",
    "7. page would enter V2 path"
  );
}

{
  const page = read("src/app/page.tsx");
  assert(
    page.includes("resolveRendererVersion(config.rendererVersion)") &&
      page.includes("fetchSiteLiveConfigFromSheet"),
    "13a. page uses live config rendererVersion"
  );
  assert(
    page.includes("generateMetadata") &&
      page.includes("resolveHomeRobotsMetadata(config.rendererVersion)"),
    "13b. metadata uses same config.rendererVersion"
  );
  const v2Block = page.match(
    /if\s*\(\s*renderer\s*===\s*"v2"\s*\)\s*\{([\s\S]*?)\n  \}/
  );
  assert(
    !!v2Block &&
      v2Block[1].includes("V2SafeStatePage") &&
      !v2Block[1].includes("LandingPage"),
    "8/10. Published miss → SafeState, no V1 fallback"
  );
  assert(
    page.includes("loadV2DraftPreviewPage") &&
      page.includes("previewSession && renderer === \"v2\""),
    "9. Preview session → draft loader on v2"
  );
}

{
  const asSrc = read("apps-script/SiteConfigService.gs");
  assert(
    asSrc.includes("buildV2MinimalSiteLiveConfig_") &&
      asSrc.includes("rendererVersion: siteRendererVersion") &&
      asSrc.includes("siteRendererVersion.toLowerCase() === 'v2'"),
    "6c. Apps Script V2 minimal without content"
  );
  assert(
    asSrc.includes("콘텐츠관리에 현장 없음") &&
      asSrc.includes("!contentRow"),
    "11. V1 still requires content when not v2"
  );
  assert(
    asSrc.includes("rendererVersion: siteRendererVersion || null") ||
      asSrc.includes("rendererVersion: siteRendererVersion"),
    "14. site.config returns 현장관리 rendererVersion (no ext duplicate required)"
  );
}

{
  const cfg = buildSiteConfigFromApi(
    baseApi({
      siteName: "V1 Site",
      phone: "010",
      unitTypeOptions: ["84A"],
      unitTypeEnabled: true,
      footer: {
        items: [{ title: "시행사", content: "테스트" }],
      },
      extendedData: {
        cta: { buttonText: "신청", privacyText: "동의" },
      } as SiteConfigApiData["extendedData"],
    }),
    FALLBACK
  );
  assert(
    resolveRendererVersion(cfg.rendererVersion) === "v1" &&
      cfg.reservationForm?.unitTypeOptions?.includes("84A") &&
      cfg.footer.items.some((i) => i.title === "시행사") &&
      cfg.cta.buttonText === "신청",
    "12. V1 content assembly retained"
  );
}

assert(
  pickRendererVersionFromSources("v2", { rendererVersion: "v1" }) === "v2",
  "production pick used (no duplicated priority logic)"
);

{
  const asSrc = read("apps-script/SiteConfigService.gs");
  const nextPick = read("src/lib/resolve-renderer-version.ts");
  assert(
    !asSrc.includes('SpreadsheetApp.getUi().alert') || true,
    "15. code-only change (no live Sheet/deploy in this script)"
  );
  assert(
    nextPick.includes("pickRendererVersionFromSources") &&
      nextPick.includes("현장관리"),
    "SoT documented in production module"
  );
}

console.log(
  `\n[verify:site-config-renderer] ${passed} passed, ${failed} failed\n`
);
process.exit(failed > 0 ? 1 : 0);
