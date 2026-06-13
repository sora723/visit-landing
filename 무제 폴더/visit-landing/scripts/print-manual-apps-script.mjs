#!/usr/bin/env node
/**
 * VisitLanding Apps Script — 파일 목록 (수동 붙여넣기 / push 참고)
 *
 * Usage: npm run manual:apps-script
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const APPS_DIR = path.join(ROOT, "apps-script");
const MASTER = path.join(ROOT, "config/master-sheet.json");

const FILES = [
  { file: "Main.gs", role: "Web App — submit / reservations / provision" },
  { file: "SheetUtils.gs", role: "Master Sheet 읽기·쓰기·로그" },
  { file: "SubmitService.gs", role: "접수 + 현장 Spreadsheet 미러" },
  { file: "ReservationsService.gs", role: "실시간 예약" },
  { file: "NotificationService.gs", role: "알림 발송" },
  { file: "NotificationProviderSolapi.gs", role: "Solapi" },
  { file: "NotificationProviderBizm.gs", role: "Bizm stub" },
  { file: "NotificationProviderNhn.gs", role: "NHN stub" },
  { file: "SiteProvisioning.gs", role: "현장 Spreadsheet 생성" },
  { file: "VisitLandingSetupVerify.gs", role: "헤더 검증" },
  { file: "VisitLandingSubmitTest.gs", role: "L001 테스트" },
];

const master = JSON.parse(fs.readFileSync(MASTER, "utf8"));

console.log("");
console.log("VisitLanding Apps Script — visit-landing/apps-script/");
console.log("");
console.log("Master:", master.spreadsheetUrl);
console.log("");
console.log("파일 (" + FILES.length + "개 + appsscript.json):");
console.log("");

FILES.forEach((item, i) => {
  const ok = fs.existsSync(path.join(APPS_DIR, item.file));
  console.log(`  ${String(i + 1).padStart(2, "0")}. ${item.file.padEnd(34)} ${ok ? "✓" : "✗"}  ${item.role}`);
});

console.log("");
console.log("자동 push:");
console.log("  npm run setup:apps-script");
console.log("  npm run setup:apps-script:push");
console.log("  npm run setup:apps-script -- --script-id YOUR_SCRIPT_ID");
console.log("");
