/**
 * stickyPromoText — Google Sheet(콘텐츠관리) → SiteConfig 반영 검증
 *
 * Usage: npx tsx scripts/verify-sticky-promo-config.ts [siteCode]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import siteJson from "../config/site.json";
import { buildSiteConfigFromSheet } from "../src/lib/site-from-sheet";
import type { ContentManagementRow, SiteManagementRow } from "../src/lib/sheet-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE_CSV = path.join(ROOT, "sheets/VisitLanding_Master/현장관리.csv");
const CONTENT_CSV = path.join(ROOT, "sheets/VisitLanding_Master/콘텐츠관리.csv");

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
      if (c === "\r") i++;
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows[0] ?? [];
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });
}

function loadRow<T extends Record<string, string>>(
  filePath: string,
  siteCode: string
): T {
  const records = parseCsv(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  const row = records.find((r) => r.siteCode === siteCode);
  if (!row) throw new Error(`${path.basename(filePath)}에 ${siteCode} 행 없음`);
  return row as T;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

const siteCode = process.argv[2] || siteJson.siteCode || "L001";

console.log("=== stickyPromoText Sheet → Config 검증 ===\n");
console.log(`siteCode: ${siteCode}\n`);

const siteRow = loadRow<SiteManagementRow>(SITE_CSV, siteCode);
const contentRow = loadRow<ContentManagementRow>(CONTENT_CSV, siteCode);

console.log("1. CSV stickyPromoText 컬럼");
console.log(`   "${contentRow.stickyPromoText ?? ""}"\n`);

console.log("2. buildSiteConfigFromSheet() 매핑");
const config = buildSiteConfigFromSheet(siteRow, contentRow);
console.log(`   → "${config.stickyPromoText ?? "(없음)"}"\n`);
assert(
  config.stickyPromoText === (contentRow.stickyPromoText?.trim() || undefined),
  "CSV 컬럼 값이 SiteConfig.stickyPromoText에 반영됨"
);

console.log("3. 시트 값 변경 시뮬레이션");
const TEST_TEXT = "[테스트] 구글시트 변경 문구 9999";
const mutated = buildSiteConfigFromSheet(siteRow, {
  ...contentRow,
  stickyPromoText: TEST_TEXT,
});
assert(
  mutated.stickyPromoText === TEST_TEXT,
  "시트 셀 변경 시 buildSiteConfigFromSheet가 새 문구 반환"
);

console.log("\n4. extendedData fallback");
const viaExt = buildSiteConfigFromSheet(siteRow, {
  ...contentRow,
  stickyPromoText: "",
  extendedData: JSON.stringify({ stickyPromoText: "extendedData 경로 문구" }),
});
assert(
  viaExt.stickyPromoText === "extendedData 경로 문구",
  "컬럼 비어있을 때 extendedData.stickyPromoText 사용"
);

console.log("\n5. 빈 값 → 미표시");
const empty = buildSiteConfigFromSheet(siteRow, {
  ...contentRow,
  stickyPromoText: "",
  extendedData: "{}",
});
assert(empty.stickyPromoText === undefined, "비우면 stickyPromoText undefined");

console.log("\n6. 현재 런타임 (site.json) 비교");
const fileText = (siteJson as { stickyPromoText?: string }).stickyPromoText?.trim();
console.log(`   site.json  → "${fileText ?? "(없음)"}"`);
console.log(`   sheet(CSV) → "${contentRow.stickyPromoText?.trim() || "(없음)"}"`);

if (fileText === contentRow.stickyPromoText?.trim()) {
  console.log("\n  ✓ site.json과 시트(CSV) 문구 일치 — 빌드 후 화면과 동일");
} else {
  console.log(
    "\n  ⚠ site.json ≠ 시트(CSV) — 지금 서버는 site.json만 사용 (시트 변경은 rebuild/sync 필요)"
  );
}

console.log("\n=== 결과 ===");
console.log("Sheet → SiteConfig 변환: OK");
console.log(
  "실시간 Google Sheet 반영: getSiteConfig()가 site.json 고정 (SITE_CONFIG_SOURCE=sheet 미연동)"
);
