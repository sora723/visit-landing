#!/usr/bin/env node
/**
 * VisitLanding 운영 검증 — provision + 이중 저장 + 알림 상태
 *
 * Usage: npm run verify:ops
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_LOCAL)) {
    for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

async function callAppsScript(url, params, method = "GET") {
  const opts = { method };
  if (method === "POST") {
    opts.headers = { "Content-Type": "text/plain;charset=utf-8" };
    opts.body = JSON.stringify(params);
  }
  const target =
    method === "GET"
      ? `${url}?${new URLSearchParams(params)}`
      : url;
  const res = await fetch(target, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`);
  }
  return { status: res.status, json };
}

async function main() {
  const env = loadEnv();
  const url = env.APPS_SCRIPT_URL?.replace(/\/$/, "");
  const siteCode = env.SHEET_SITE_CODE || "L001";

  if (!url) {
    console.error("APPS_SCRIPT_URL 미설정");
    process.exit(1);
  }

  console.log("");
  console.log("VisitLanding 운영 검증");
  console.log(`  siteCode: ${siteCode}`);
  console.log("");

  const report = {
    provision: null,
    submit: null,
    notificationNote: "Solapi Script Properties 설정 시 알림톡 발송 — 미설정 시 접수 성공 + 시스템로그 NOTIFICATION_FAIL 가능",
  };

  // 1) provision
  console.log("→ site.provision...");
  try {
    const { json } = await callAppsScript(url, {
      action: "site.provision",
      siteCode,
    });
    if (!json.success) throw new Error(json.error?.message || "provision 실패");
    report.provision = json.data;
    console.log("  ✓ provision");
    console.log(`    spreadsheetName: ${json.data.spreadsheetName || json.data.spreadsheetTitle || "(확인)"}`);
    console.log(`    spreadsheetId:   ${json.data.spreadsheetId}`);
    console.log(`    sheetName:       ${json.data.sheetName}`);
    console.log(`    created:         ${json.data.created}`);
    if (json.data.spreadsheetUrl) console.log(`    url:             ${json.data.spreadsheetUrl}`);
  } catch (e) {
    console.log("  ✗ provision:", e.message);
    report.provision = { error: e.message };
  }

  // 2) submit (dual write test)
  console.log("");
  console.log("→ submit (이중 저장 테스트)...");
  const phone = "0106666" + String(Date.now()).slice(-4);
  try {
    const { json } = await callAppsScript(
      url,
      {
        action: "submit",
        siteCode,
        name: "운영검증_" + Date.now(),
        phone,
        privacyAgreed: true,
        utmSource: "ops-verify",
        utmMedium: "script",
        utmCampaign: "dual-write",
        referer: "https://localhost:3000/",
        device: "desktop",
      },
      "POST"
    );
    if (!json.success) throw new Error(json.error?.message || "submit 실패");
    report.submit = json.data;
    console.log("  ✓ submit");
    console.log(`    submissionId:      ${json.data.submissionId}`);
    console.log(`    notificationSent: ${json.data.notificationSent}`);
    console.log("");
    console.log("  수동 확인:");
    console.log("    A) VisitLanding_Master → 접수관리");
    console.log(`    B) ${report.provision?.spreadsheetName || siteCode + "_접수_*"} → 접수관리`);
  } catch (e) {
    console.log("  ✗ submit:", e.message);
    report.submit = { error: e.message };
  }

  console.log("");
  console.log("=== 운영 검증 요약 ===");
  console.log(JSON.stringify(report, null, 2));
  console.log("");
}

main();
