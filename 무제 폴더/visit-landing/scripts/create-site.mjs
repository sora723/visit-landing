#!/usr/bin/env node
/**
 * L001 템플릿 복사 → 신규 현장 CSV 행 생성
 *
 * Usage:
 *   node scripts/create-site.mjs L004 "김포 한양립스"
 *   node scripts/create-site.mjs L004 "김포 한양립스" --provision
 *
 * --provision  Master Sheet에 행 반영 후 Apps Script로 현장 Spreadsheet 생성
 *              (APPS_SCRIPT_URL in .env.local 필요, Master에 siteCode 행 존재 필요)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseCsv, stringifyCsv } from "./lib/csv-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SHEET_DIR = path.join(ROOT, "sheets/VisitLanding_Master");
const SITE_CSV = path.join(SHEET_DIR, "현장관리.csv");
const CONTENT_CSV = path.join(SHEET_DIR, "콘텐츠관리.csv");
const TEMPLATE_CODE = "L001";
const ENV_LOCAL = path.join(ROOT, ".env.local");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readCsvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return parseCsv(text);
}

function writeCsvFile(filePath, headers, records) {
  fs.writeFileSync(filePath, stringifyCsv(headers, records), "utf8");
}

function loadEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL)) return {};
  const env = {};
  for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function parseSiteCodeArg(arg) {
  if (!arg) return null;
  const m = String(arg).trim().match(/^L(\d{3,})$/i);
  if (!m) {
    console.error(`오류: siteCode 형식은 L001, L004 등이어야 합니다. (입력: ${arg})`);
    process.exit(1);
  }
  return `L${m[1].padStart(3, "0")}`;
}

function nextSiteCode(records) {
  let max = 0;
  for (const row of records) {
    const m = String(row.siteCode || "").match(/^L(\d+)$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `L${String(max + 1).padStart(3, "0")}`;
}

function patchExtendedData(extRaw, siteName) {
  if (!extRaw?.trim()) return extRaw;
  try {
    const ext = JSON.parse(extRaw);
    if (ext.seo) {
      ext.seo.title = `${siteName} | 방문예약`;
      ext.seo.description = `${siteName} — 방문예약 접수`;
    }
    return JSON.stringify(ext);
  } catch {
    return extRaw;
  }
}

function guessSpreadsheetTitle(siteCode, siteName) {
  const name = String(siteName || "").trim().replace(/\s+/g, "").replace(/[()（）\[\]'"]/g, "");
  const label = name && !name.includes("신규") && !name.startsWith("(") ? name : "현장";
  return `${siteCode}_접수_${label}`;
}

function cloneSiteRow(template, siteCode, siteName) {
  const now = today();
  return {
    ...template,
    siteCode,
    siteName,
    submissionSpreadsheetId: "",
    submissionSpreadsheetName: "",
    submissionSheetName: template.submissionSheetName || "접수관리",
    phone: "",
    managerName: "",
    managerPhone: "",
    notifyPhone: "",
    isActive: "N",
    createdAt: now,
    updatedAt: now,
  };
}

function cloneContentRow(template, siteCode, siteName) {
  return {
    ...template,
    siteCode,
    heroTitle: "(메인카피 — 수정 필요)",
    heroSubTitle: siteName,
    mobileHookText: "선착순 방문예약 진행중",
    stickyPromoText: "",
    ctaText: '["선착순 방문예약 진행중","홍보관 방문 시 특별혜택 제공"]',
    extendedData: patchExtendedData(template.extendedData, siteName),
  };
}

async function provisionViaAppsScript(siteCode, appsScriptUrl) {
  const url = appsScriptUrl.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "site.provision", siteCode }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "site.provision 실패");
  }
  return json.data;
}

async function main() {
  const argv = process.argv.slice(2);
  const provision = argv.includes("--provision");
  const args = argv.filter((a) => !a.startsWith("-"));
  const requestedCode = parseSiteCodeArg(args[0]);
  const siteName = args[1]?.trim() || "(신규현장 — 이름 수정)";

  const siteSheet = readCsvFile(SITE_CSV);
  const contentSheet = readCsvFile(CONTENT_CSV);

  const siteCode = requestedCode || nextSiteCode(siteSheet.records);

  if (siteSheet.records.some((r) => r.siteCode === siteCode)) {
    console.error(`오류: ${siteCode}는 이미 현장관리에 존재합니다.`);
    process.exit(1);
  }
  if (contentSheet.records.some((r) => r.siteCode === siteCode)) {
    console.error(`오류: ${siteCode}는 이미 콘텐츠관리에 존재합니다.`);
    process.exit(1);
  }

  const siteTemplate = siteSheet.records.find((r) => r.siteCode === TEMPLATE_CODE);
  const contentTemplate = contentSheet.records.find(
    (r) => r.siteCode === TEMPLATE_CODE
  );

  if (!siteTemplate || !contentTemplate) {
    console.error(`오류: 템플릿 ${TEMPLATE_CODE} 행이 CSV에 없습니다.`);
    process.exit(1);
  }

  const newSite = cloneSiteRow(siteTemplate, siteCode, siteName);
  const newContent = cloneContentRow(contentTemplate, siteCode, siteName);

  siteSheet.records.push(newSite);
  contentSheet.records.push(newContent);

  writeCsvFile(SITE_CSV, siteSheet.headers, siteSheet.records);
  writeCsvFile(CONTENT_CSV, contentSheet.headers, contentSheet.records);

  const ssTitle = guessSpreadsheetTitle(siteCode, siteName);

  console.log("");
  console.log("✓ 신규 현장 CSV 등록 완료");
  console.log("");
  console.log(`  siteCode              : ${siteCode}`);
  console.log(`  siteName              : ${siteName}`);
  console.log(`  예상 Spreadsheet 이름 : ${ssTitle}`);
  console.log(`  submissionSheetName   : 접수관리`);
  console.log("");

  if (provision) {
    const env = loadEnvLocal();
    const appsUrl = env.APPS_SCRIPT_URL;
    if (!appsUrl) {
      console.error("⚠ --provision: .env.local에 APPS_SCRIPT_URL이 필요합니다.");
      console.error("  Master Sheet에 행 import 후 Apps Script 편집기에서:");
      console.error(`  provisionSiteSpreadsheet('${siteCode}')`);
      process.exit(2);
    }
    console.log("→ Apps Script site.provision 호출 중...");
    console.log("  (Master Google Sheet에 해당 siteCode 행이 있어야 합니다)");
    try {
      const result = await provisionViaAppsScript(siteCode, appsUrl);
      console.log("");
      console.log("✓ 현장 Spreadsheet 생성 완료");
      console.log(`  spreadsheetId  : ${result.spreadsheetId}`);
      console.log(`  spreadsheetUrl : ${result.spreadsheetUrl || "(URL 확인)"}`);
      console.log(`  sheetName      : ${result.sheetName}`);
      if (result.created === false) {
        console.log("  (기존 ID 사용)");
      }
      console.log("");
      console.log("→ 로컬 CSV submissionSpreadsheetId 수동 반영:");
      console.log(`  ${result.spreadsheetId}`);
    } catch (err) {
      console.error("");
      console.error("✗ Spreadsheet 생성 실패:", err.message);
      console.error("");
      console.error("수동 실행:");
      console.error(`  1. Master Sheet에 ${siteCode} 행 import`);
      console.error(`  2. Apps Script: provisionSiteSpreadsheet('${siteCode}')`);
      process.exit(1);
    }
  } else {
    console.log("다음 단계:");
    console.log("  1. VisitLanding_Master CSV → Google Sheet import");
    console.log("  2. 현장 Spreadsheet 생성 (택1):");
    console.log(`     node scripts/create-site.mjs ${siteCode} "${siteName}" --provision`);
    console.log(`     Apps Script: provisionSiteSpreadsheet('${siteCode}')`);
    console.log("  3. 콘텐츠관리에서 Hero·혜택·이미지 수정");
    console.log("  4. 현장관리 phone / notifyPhone / isActive=Y");
    console.log(`  5. Netlify SHEET_SITE_CODE=${siteCode}`);
    console.log(`  6. ${ssTitle} 파일 → 현장 담당자 공유`);
    console.log("");
  }
}

main();
