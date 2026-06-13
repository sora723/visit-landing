#!/usr/bin/env node
/**
 * 콘텐츠관리 CSV → site.json stickyPromoText 동기화 (Google Sheet 수정 후 로컬 반영용)
 *
 * Usage:
 *   node scripts/sync-sticky-promo-from-csv.mjs [siteCode]
 *   node scripts/sync-sticky-promo-from-csv.mjs L001
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseCsv } from "./lib/csv-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT_CSV = path.join(ROOT, "sheets/VisitLanding_Master/콘텐츠관리.csv");
const SITE_JSON = path.join(ROOT, "config/site.json");

const siteCode = process.argv[2] || process.env.SHEET_SITE_CODE || "L001";

const { records } = parseCsv(fs.readFileSync(CONTENT_CSV, "utf8").replace(/^\uFEFF/, ""));
const row = records.find((r) => r.siteCode === siteCode);
if (!row) {
  console.error(`콘텐츠관리.csv에 ${siteCode} 없음`);
  process.exit(1);
}

let extPromo = "";
if (row.extendedData?.trim()) {
  try {
    extPromo = String(JSON.parse(row.extendedData).stickyPromoText ?? "").trim();
  } catch {
    /* ignore */
  }
}

const promo = String(row.stickyPromoText ?? "").trim() || extPromo || "";

const site = JSON.parse(fs.readFileSync(SITE_JSON, "utf8"));
const prev = site.stickyPromoText ?? "";
site.stickyPromoText = promo;

fs.writeFileSync(SITE_JSON, JSON.stringify(site, null, 2) + "\n", "utf8");

console.log(`site.json stickyPromoText 동기화 (${siteCode})`);
console.log(`  이전: "${prev}"`);
console.log(`  이후: "${promo}"`);
console.log("\n다음: npm run build && npx next start -H 127.0.0.1 -p 3030");
