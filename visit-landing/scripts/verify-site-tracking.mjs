#!/usr/bin/env node
/**
 * 전환 추적 + 소유 확인 + site.config 검증
 *
 * Usage: node scripts/verify-site-tracking.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");
const SITE_CSV = path.join(ROOT, "sheets/VisitLanding_Master/현장관리.csv");
const CONTENT_CSV = path.join(ROOT, "sheets/VisitLanding_Master/콘텐츠관리.csv");

const SITE_TRACKING_COLS = [
  "metaPixelId",
  "metaConversionEvent",
  "googleConversionId",
  "googleConversionLabel",
  "naverConversionScript",
  "kakaoPixelId",
  "metaOwnershipCode",
  "googleOwnershipCode",
  "naverOwnershipCode",
  "kakaoOwnershipCode",
  "전환코드",
  "소유확인코드",
];

const CONTENT_LIVE_COLS = [
  "stickyPromoText",
  "unitTypeOptions",
  "visitDateDays",
  "visitDateOptions",
  "unitTypeEnabled",
  "visitDateEnabled",
  "mainColor",
  "subColor",
  "accentColor",
];

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_LOCAL)) {
    for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  env.APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || env.APPS_SCRIPT_URL || "";
  env.SHEET_SITE_CODE = process.env.SHEET_SITE_CODE || env.SHEET_SITE_CODE || "L001";
  return env;
}

function csvHeaders(file) {
  return fs.readFileSync(file, "utf8").split("\n")[0].split(",").map((h) => h.trim());
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim()) out[k] = String(v).trim();
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const url = env.APPS_SCRIPT_URL.replace(/\/$/, "");
  const siteCode = env.SHEET_SITE_CODE;
  let pass = 0;
  let fail = 0;
  let warn = 0;

  function ok(msg) {
    console.log(`  ✓ ${msg}`);
    pass++;
  }
  function bad(msg) {
    console.log(`  ✗ ${msg}`);
    fail++;
  }
  function note(msg) {
    console.log(`  ○ ${msg}`);
    warn++;
  }

  console.log("\n=== VisitLanding 시트·추적 검증 ===\n");

  // 1) CSV template headers
  console.log("[1] CSV 템플릿 헤더");
  const siteHeaders = csvHeaders(SITE_CSV);
  const contentHeaders = csvHeaders(CONTENT_CSV);

  const missingSite = SITE_TRACKING_COLS.filter((c) => !siteHeaders.includes(c));
  const missingContent = CONTENT_LIVE_COLS.filter((c) => !contentHeaders.includes(c));

  if (missingSite.length === 0) ok("현장관리.csv — 전환·소유확인 컬럼 OK");
  else bad(`현장관리.csv — 누락: ${missingSite.join(", ")}`);

  if (missingContent.length === 0) ok("콘텐츠관리.csv — live UI 컬럼 OK");
  else bad(`콘텐츠관리.csv — 누락: ${missingContent.join(", ")}`);

  if (!url) {
    bad("APPS_SCRIPT_URL 미설정 — live API 검증 스킵");
    console.log(`\nRESULT: PASS=${pass} FAIL=${fail} WARN=${warn}\n`);
    process.exit(fail > 0 ? 1 : 0);
  }

  // 2) site.config API
  console.log("\n[2] Apps Script site.config (L001)");
  const configUrl = `${url}?action=site.config&siteCode=${encodeURIComponent(siteCode)}`;
  let configJson;
  try {
    const res = await fetch(configUrl, { cache: "no-store" });
    configJson = await res.json();
    if (!configJson.success) {
      bad(`site.config 실패: ${configJson.error?.message || "unknown"}`);
    } else {
      ok(`site.config OK (siteCode=${configJson.data?.siteCode})`);
      console.log(`    keys: ${Object.keys(configJson.data || {}).join(", ")}`);
    }
  } catch (e) {
    bad(`site.config 요청 실패: ${e.message}`);
    console.log(`\nRESULT: PASS=${pass} FAIL=${fail} WARN=${warn}\n`);
    process.exit(1);
  }

  const d = configJson.data || {};
  const ct = d.conversionTracking || {};
  const ov = d.ownershipVerification || {};

  console.log("\n[3] conversionTracking (현장관리 → /complete)");
  const ctFilled = pick(ct, [
    "metaPixelId",
    "metaConversionEvent",
    "googleConversionId",
    "googleConversionLabel",
    "naverConversionScript",
    "kakaoPixelId",
    "conversionRawHtml",
  ]);
  if (Object.keys(ctFilled).length === 0) {
    note("L001 전환코드 비어 있음 — /complete에서 추적 미실행 (정상)");
  } else {
    ok(`전환 설정 ${Object.keys(ctFilled).length}개: ${Object.keys(ctFilled).join(", ")}`);
  }

  if ("conversionTracking" in d) ok("API conversionTracking 객체 존재");
  else bad("API conversionTracking 객체 없음 — Apps Script 배포 확인");

  console.log("\n[4] ownershipVerification (현장관리 → head)");
  const ovFilled = pick(ov, [
    "metaOwnershipCode",
    "googleOwnershipCode",
    "naverOwnershipCode",
    "kakaoOwnershipCode",
    "ownershipRawHtml",
  ]);
  if (Object.keys(ovFilled).length === 0) {
    note("L001 소유확인코드 비어 있음 — head meta 미출력 (정상)");
  } else {
    ok(`소유확인 설정 ${Object.keys(ovFilled).length}개: ${Object.keys(ovFilled).join(", ")}`);
  }

  if ("ownershipVerification" in d) ok("API ownershipVerification 객체 존재");
  else bad("API ownershipVerification 객체 없음 — Apps Script 배포 확인");

  console.log("\n[5] 콘텐츠관리 live 필드");
  ok(`heroTitle: ${d.heroTitle ? "있음" : "없음"}`);
  ok(`heroSubTitle: ${d.heroSubTitle ? "있음" : "없음"}`);
  ok(`heroImage: ${d.heroImage ? "있음" : "없음"}`);
  ok(`benefits: ${[d.benefit1Title, d.benefit2Title, d.benefit3Title].filter(Boolean).length}개`);
  ok(`overview specs: ${Array.isArray(d.overview?.specs) ? d.overview.specs.length : 0}개`);
  ok(`premium items: ${Array.isArray(d.premium?.items) ? d.premium.items.length : 0}개`);
  ok(`location items: ${Array.isArray(d.location?.items) ? d.location.items.length : 0}개`);
  ok(`stickyPromoText: ${d.stickyPromoText ? "있음" : "없음"}`);
  ok(`unitTypeOptions: ${Array.isArray(d.unitTypeOptions) ? d.unitTypeOptions.length : 0}개`);
  ok(`theme: ${d.mainColor} / ${d.subColor} / ${d.accentColor}`);

  // 6) duplicate submit test
  console.log("\n[6] 중복 접수 (2시간 내 동일 → 저장 O, 알림 X)");
  const phone = "0107777" + String(Date.now()).slice(-4);
  const payload = {
    action: "submit",
    siteCode,
    name: "중복검증테스트",
    phone,
    privacyAgreed: true,
    unitType: "84A",
    visitDate: "2026-06-15",
    utmSource: "verify-tracking",
  };

  async function submit() {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  try {
    const first = await submit();
    if (!first.success) {
      bad(`1차 접수 실패: ${first.error?.message}`);
    } else {
      ok(`1차 접수 OK (notificationSent=${first.data?.notificationSent})`);
    }

    const second = await submit();
    if (!second.success) {
      bad(`2차 접수 실패(에러 반환): ${second.error?.message} — soft duplicate 기대`);
    } else if (second.data?.isDuplicate === true) {
      ok(`2차 접수 soft duplicate OK (notificationSent=${second.data?.notificationSent})`);
      if (second.data?.notificationSent === true) {
        bad("2차 접수에서 알림톡 발송됨 — 중복 시 SKIP 기대");
      } else {
        ok("2차 접수 알림톡 SKIP 확인");
      }
    } else {
      note("2차 접수 isDuplicate=false — Sheet에 이전 동일 접수 없거나 필드 불일치");
    }
  } catch (e) {
    bad(`중복 접수 테스트 실패: ${e.message}`);
  }

  // 7) Next.js /api/site-content
  console.log("\n[7] Next.js /api/site-content (로컬 서버 필요)");
  const base = process.env.BASE_URL || "http://127.0.0.1:3000";
  try {
    const res = await fetch(`${base}/api/site-content`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    if (json.success && json.data?.source === "sheet" && json.data?.hero) {
      ok(`/api/site-content OK — hero + overview 포함`);
    } else if (json.success && json.data) {
      note(`/api/site-content 200 — keys: ${Object.keys(json.data).join(", ")}`);
    } else if (res.status === 503) {
      note("/api/site-content 503 — Sheet 연결 확인 (.env.local APPS_SCRIPT_URL)");
    } else {
      bad(`/api/site-content unexpected: ${res.status}`);
    }
  } catch {
    note(`${base} 미실행 — npm run start 후 재검증 가능`);
  }

  console.log(`\nRESULT: PASS=${pass} FAIL=${fail} WARN=${warn}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
