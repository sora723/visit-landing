/**
 * V2 Published 공개 읽기 계약 회귀
 * Usage: npm run verify:v2-published-read
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2PublishedPageCore } from "../src/v2/server/load-v2-published-page-core";
import {
  clearV2PublishedPageCache,
  dedupeV2PublishedPageFetch,
} from "../src/v2/server/v2-published-page-cache";
import {
  isPubRevisionIdForSite,
  parseV2PublishedRemoteResponse,
} from "../src/v2/server/parse-v2-published-response";
import type { FetchV2PublishedPageSuccess } from "../src/v2/server/types";
import type { ValidatedV2Page } from "../src/v2/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

function assert(cond: boolean, label: string, detail?: string) {
  if (cond) ok(label);
  else fail(label, detail);
}

const SITE = "L001";
const REV = "pub-L001-20260724120000000-abcd";

function validRemotePayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      siteCode: SITE,
      revisionId: REV,
      pageSchemaVersion: "1",
      blocks: [
        {
          siteCode: SITE,
          revisionId: REV,
          sectionId: "sec-hero",
          sectionOrder: 1,
          componentType: "hero",
          variant: "fullBleed",
          contentGroup: "cg-hero",
          enabled: true,
          desktopVisible: true,
          mobileVisible: true,
          backgroundType: "none",
          backgroundColor: "",
          backgroundPc: "",
          backgroundMobile: "",
          themeVariant: "",
          paddingPreset: "",
          animationPreset: "",
          optionsJson: "{}",
        },
        {
          siteCode: SITE,
          revisionId: REV,
          sectionId: "sec-form",
          sectionOrder: 2,
          componentType: "form",
          variant: "card",
          contentGroup: "cg-form",
          enabled: true,
          desktopVisible: true,
          mobileVisible: true,
          backgroundType: "none",
          backgroundColor: "",
          backgroundPc: "",
          backgroundMobile: "",
          themeVariant: "",
          paddingPreset: "",
          animationPreset: "",
          optionsJson: "{}",
        },
      ],
      contents: [
        {
          siteCode: SITE,
          revisionId: REV,
          contentGroup: "cg-hero",
          itemId: "h1",
          itemOrder: 1,
          role: "root",
          title: "Hello",
          eyebrow: "",
          subtitle: "",
          description: "",
          value: "",
          badge: "",
          icon: "",
          imagePc: "",
          imageMobile: "",
          videoUrl: "",
          actionType: "",
          actionLabel: "",
          actionValue: "",
          extraJson: "{}",
          enabled: true,
        },
        {
          siteCode: SITE,
          revisionId: REV,
          contentGroup: "cg-form",
          itemId: "f1",
          itemOrder: 1,
          role: "form",
          title: "Form",
          eyebrow: "",
          subtitle: "",
          description: "",
          value: "",
          badge: "",
          icon: "",
          imagePc: "",
          imageMobile: "",
          videoUrl: "",
          actionType: "",
          actionLabel: "",
          actionValue: "",
          extraJson: "{}",
          enabled: true,
        },
      ],
      ...overrides,
    },
  };
}

function mockFetcher(body: unknown, status = 200) {
  return async (url: string) => {
    if (url.includes("revisionId=")) {
      throw new Error("request URL must not include revisionId: " + url);
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      bodyText: typeof body === "string" ? body : JSON.stringify(body),
    };
  };
}

function requestUrlFor(siteCode: string) {
  return (
    `https://script.example/macros/s/test/exec?action=v2.page.published` +
    `&siteCode=${encodeURIComponent(siteCode)}`
  );
}

async function loadPublished(
  siteCode: string,
  body: unknown,
  status = 200
) {
  return loadV2PublishedPageCore({
    siteCode,
    requestUrl: requestUrlFor(siteCode),
    httpFetcher: mockFetcher(body, status),
  });
}

async function main() {
  console.log("\n[verify:v2-published-read] Next loader + Apps Script static\n");

  // 1. success → validateV2Page ok
  {
    clearV2PublishedPageCache(SITE);
    const result = await loadPublished(SITE, validRemotePayload());
    assert(
      result.ok === true &&
        result.page.siteCode === SITE &&
        result.page.revisionId === REV &&
        result.page.blocks.length >= 1,
      "1. normal Published V2 → validateV2Page success"
    );
  }

  // 2. V2_NOT_CONFIGURED
  {
    const result = await loadPublished(SITE, {
      ok: false,
      code: "V2_NOT_CONFIGURED",
      message: "V2 published page is not configured.",
    });
    assert(
      result.ok === false && result.reason === "not-configured",
      "2. V2_NOT_CONFIGURED → not-configured"
    );
  }

  // 3. V2_NOT_PUBLISHED
  {
    const result = await loadPublished(SITE, {
      ok: false,
      code: "V2_NOT_PUBLISHED",
      message: "Published V2 page is not available.",
    });
    assert(
      result.ok === false && result.reason === "not-published",
      "3. V2_NOT_PUBLISHED → not-published"
    );
  }

  // 4. blocks not array
  {
    const body = validRemotePayload();
    (body.data as { blocks: unknown }).blocks = { bad: true };
    const result = await loadPublished(SITE, body);
    assert(
      result.ok === false && result.reason === "invalid-response",
      "4. blocks not array → invalid-response"
    );
  }

  // 5. contents not array
  {
    const body = validRemotePayload();
    (body.data as { contents: unknown }).contents = null;
    const result = await loadPublished(SITE, body);
    assert(
      result.ok === false && result.reason === "invalid-response",
      "5. contents not array → invalid-response"
    );
  }

  // 6. siteCode mismatch
  {
    const body = validRemotePayload({ siteCode: "OTHER" });
    const result = await loadPublished(SITE, body);
    assert(
      result.ok === false && result.reason === "invalid-response",
      "6. response siteCode mismatch → invalid-response"
    );
  }

  // 7. revisionId not pub-
  {
    const body = validRemotePayload({ revisionId: "draft-L001-x" });
    const result = await loadPublished(SITE, body);
    assert(
      result.ok === false && result.reason === "invalid-response",
      "7. revisionId not pub- → invalid-response"
    );
  }

  // 8. schema fatal → invalid-page
  {
    const body = validRemotePayload({
      blocks: [
        {
          siteCode: SITE,
          revisionId: REV,
          sectionId: "only-footer",
          sectionOrder: 1,
          componentType: "footerInfo",
          variant: "default",
          contentGroup: "cg-f",
          enabled: true,
          desktopVisible: true,
          mobileVisible: true,
          backgroundType: "none",
          backgroundColor: "",
          backgroundPc: "",
          backgroundMobile: "",
          themeVariant: "",
          paddingPreset: "",
          animationPreset: "",
          optionsJson: "{}",
        },
      ],
      contents: [
        {
          siteCode: SITE,
          revisionId: REV,
          contentGroup: "cg-f",
          itemId: "i1",
          itemOrder: 1,
          role: "item",
          title: "A",
          description: "B",
          eyebrow: "",
          subtitle: "",
          value: "",
          badge: "",
          icon: "",
          imagePc: "",
          imageMobile: "",
          videoUrl: "",
          actionType: "",
          actionLabel: "",
          actionValue: "",
          extraJson: "{}",
          enabled: true,
        },
      ],
    });
    const result = await loadPublished(SITE, body);
    assert(
      result.ok === false && result.reason === "invalid-page",
      "8. schema validator fatal → invalid-page"
    );
  }

  // 9. network failure
  {
    const result = await loadV2PublishedPageCore({
      siteCode: SITE,
      requestUrl: requestUrlFor(SITE),
      httpFetcher: async () => {
        throw new Error("ECONNRESET");
      },
    });
    assert(
      result.ok === false && result.reason === "network",
      "9. network failure → network"
    );
  }

  // 10. draftRevisionId not passed to result model
  {
    const body = validRemotePayload();
    (body as Record<string, unknown>).draftRevisionId = "draft-secret";
    (body.data as Record<string, unknown>).draftRevisionId = "draft-secret";
    const parsed = parseV2PublishedRemoteResponse(body, SITE);
    assert(
      parsed.ok === true &&
        !("draftRevisionId" in parsed.data) &&
        JSON.stringify(parsed.data).indexOf("draft-secret") === -1,
      "10. draftRevisionId not forwarded in result model"
    );
  }

  // 11. unknown top-level fields not forwarded
  {
    const body = {
      ok: true,
      adminPhone: "010",
      spreadsheetId: "secret",
      data: {
        ...validRemotePayload().data,
        internalNote: "x",
        draftRevisionId: "draft-x",
      },
    };
    const parsed = parseV2PublishedRemoteResponse(body, SITE);
    assert(
      parsed.ok === true &&
        Object.keys(parsed.data).sort().join(",") ===
          "blocks,contents,pageSchemaVersion,revisionId,siteCode",
      "11. unknown top-level/data fields not forwarded"
    );
  }

  // 12. same siteCode concurrent → 1 underlying success fetch via dedupe
  {
    clearV2PublishedPageCache(SITE);
    let calls = 0;
    const success: FetchV2PublishedPageSuccess = {
      ok: true,
      revisionId: REV,
      warnings: [],
      page: {
        siteCode: SITE,
        revisionId: REV,
        pageSchemaVersion: "1",
        blocks: [],
        overlays: [],
        warnings: [],
      } as ValidatedV2Page,
    };
    await Promise.all([
      dedupeV2PublishedPageFetch(SITE, async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 15));
        return success;
      }),
      dedupeV2PublishedPageFetch(SITE, async () => {
        calls += 1;
        return success;
      }),
    ]);
    assert(calls === 1, "12. same siteCode concurrent → remote dedupe (1 call)");
  }

  // 13. different siteCode → separate cache keys
  {
    clearV2PublishedPageCache();
    let a = 0;
    let b = 0;
    const mk = (code: string): FetchV2PublishedPageSuccess => ({
      ok: true,
      revisionId: `pub-${code}-1`,
      warnings: [],
      page: {
        siteCode: code,
        revisionId: `pub-${code}-1`,
        pageSchemaVersion: "1",
        blocks: [],
        overlays: [],
        warnings: [],
      } as ValidatedV2Page,
    });
    await dedupeV2PublishedPageFetch("AAA", async () => {
      a += 1;
      return mk("AAA");
    });
    await dedupeV2PublishedPageFetch("BBB", async () => {
      b += 1;
      return mk("BBB");
    });
    assert(
      a === 1 && b === 1,
      "13. different siteCode → separate cache keys"
    );
    clearV2PublishedPageCache();
  }

  // --- Apps Script static checks (14–20) ---
  {
    const service = readFileSync(
      join(root, "apps-script/V2PageReadService.gs"),
      "utf8"
    );
    const main = readFileSync(join(root, "apps-script/Main.gs"), "utf8");

    assert(
      main.includes("v2.page.published") &&
        main.includes("getV2PublishedPagePublic_"),
      "14a. Main routes action v2.page.published"
    );

  assert(
    !/params\.revisionId/.test(service) &&
      !/parameter\.revisionId/.test(service) &&
      service.includes("요청 파라미터의 revisionId 필드는 조회에 사용하지 않음"),
    "14. request revisionId not used for lookup"
  );

    assert(
      service.includes("rendererVersion !== 'v2'") ||
        service.includes('rendererVersion !== "v2"'),
      "15. rendererVersion must be v2"
    );

    assert(
      service.includes("pageStatus !== 'published'") ||
        service.includes('pageStatus !== "published"'),
      "16. pageStatus must be published"
    );

    assert(
      service.includes("publishedRevisionId") &&
        service.includes("V2_NOT_PUBLISHED"),
      "17. missing publishedRevisionId → not published"
    );

    assert(
      service.includes("pubPrefix") &&
        /'pub-'\s*\+\s*siteCode\s*\+\s*'-'/.test(service),
      "18. non-pub / wrong-site revision rejected"
    );

    assert(
      !/insertSheet\s*\(/.test(service) &&
        !/ensureSheetColumns/.test(service) &&
        service.includes("Sheet 탭/컬럼을 생성하지 않음"),
      "19. does not auto-create sheets/columns"
    );

    assert(
      service.includes("rowSite !== siteCode") &&
        service.includes("rowRev !== revisionId"),
      "20. filters rows by siteCode + revisionId exact match"
    );

    // --- access gate / server-only boundary ---
    assert(
      /function isV2PublicSiteActive_\s*\(/.test(service) &&
        /if\s*\(\s*!isV2PublicSiteActive_\s*\(\s*siteRow\s*\)\s*\)/.test(
          service
        ) &&
        service.includes("ynToBool_(getField_(siteRow, 'isActive'), true)"),
      "21. Apps Script isActive public gate exists (real condition)"
    );

    assert(
      /if\s*\(\s*!isV2PublicSiteActive_\s*\(\s*siteRow\s*\)\s*\)/.test(
        service
      ) &&
        service.indexOf("isV2PublicSiteActive_") <
          service.indexOf("siteHeaders.rendererVersion") &&
        service.includes("V2_NOT_PUBLISHED") &&
        service.includes("site inactive"),
      "22. isActive=false blocks before Published row read (V2_NOT_PUBLISHED)"
    );

    assert(
      /siteHeaders\.pageSchemaVersion\s*===\s*undefined/.test(service) &&
        service.includes("rendererVersion") &&
        service.includes("pageStatus") &&
        service.includes("publishedRevisionId"),
      "23. pageSchemaVersion header is required with other V2 headers"
    );

    assert(
      /if\s*\(\s*!pageSchemaVersion\s*\)/.test(service) &&
        !/pageSchemaVersion\s*=\s*'1'/.test(service) &&
        !/pageSchemaVersion\s*=\s*"1"/.test(service),
      "24. empty pageSchemaVersion not auto-filled to 1"
    );

    assert(
      isPubRevisionIdForSite("pub-L001-202607-x", "L001") === true,
      "25. pub-L001-* accepted for L001"
    );

    assert(
      parseV2PublishedRemoteResponse(
        validRemotePayload({ revisionId: "pub-L002-202607-x" }),
        "L001"
      ).ok === false,
      "26. pub-L002-* for L001 → invalid-response"
    );

    const wrapper = readFileSync(
      join(root, "src/v2/server/load-v2-published-page.ts"),
      "utf8"
    );
    const core = readFileSync(
      join(root, "src/v2/server/load-v2-published-page-core.ts"),
      "utf8"
    );
    const fetchWrap = readFileSync(
      join(root, "src/v2/server/fetch-v2-published-page.ts"),
      "utf8"
    );
    const verifySrc = readFileSync(
      join(root, "scripts/verify-v2-published-read.ts"),
      "utf8"
    );

    assert(
      /^\s*import\s+[\"']server-only[\"']\s*;/m.test(wrapper) &&
        /^\s*import\s+[\"']server-only[\"']\s*;/m.test(fetchWrap),
      "27. env/fetch wrappers import server-only"
    );

    assert(
      !/process\.env\./.test(core) &&
        !/from\s+[\"']@\/lib\/apps-script-env[\"']/.test(core) &&
        !/import\s+[\"']server-only[\"']/.test(core),
      "28. pure core has no process.env / getAppsScriptEnv / server-only"
    );

    const verifyImportCore =
      /^import\s+.+\s+from\s+[\"']\.\.\/src\/v2\/server\/load-v2-published-page-core[\"']/m.test(
        verifySrc
      );
    const verifyImportWrapper =
      /^import\s+.+\s+from\s+[\"']\.\.\/src\/v2\/server\/load-v2-published-page[\"']/m.test(
        verifySrc
      );
    assert(
      verifyImportCore && !verifyImportWrapper,
      "29. tests import pure core, not server wrapper"
    );

    assert(
      parseV2PublishedRemoteResponse(
        validRemotePayload({ pageSchemaVersion: "" }),
        SITE
      ).ok === false,
      "30. empty pageSchemaVersion in remote data → invalid-response (no 1 fallback)"
    );
  }

  console.log(
    `\n[verify:v2-published-read] ${passed} passed, ${failed} failed\n`
  );
}

main()
  .then(() => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
