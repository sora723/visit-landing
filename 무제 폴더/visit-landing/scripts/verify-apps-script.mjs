#!/usr/bin/env node
/**
 * Apps Script Web App 연결 검증
 *
 * Usage:
 *   node scripts/verify-apps-script.mjs
 *   APPS_SCRIPT_URL=https://... node scripts/verify-apps-script.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");
const MASTER = path.join(ROOT, "config/master-sheet.json");

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
    throw new Error(`JSON 파싱 실패 (${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, json };
}

async function main() {
  const env = loadEnv();
  const url = env.APPS_SCRIPT_URL.replace(/\/$/, "");
  const siteCode = env.SHEET_SITE_CODE;

  console.log("");
  console.log("Apps Script 연결 검증");
  console.log("");

  if (!url) {
    console.error("✗ APPS_SCRIPT_URL 미설정 (.env.local)");
    process.exit(1);
  }

  console.log(`  URL:       ${url}`);
  console.log(`  siteCode:  ${siteCode}`);
  if (fs.existsSync(MASTER)) {
    const m = JSON.parse(fs.readFileSync(MASTER, "utf8"));
    console.log(`  Master ID: ${m.spreadsheetId}`);
  }
  console.log("");

  let pass = 0;
  let fail = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      pass++;
    } catch (e) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${e.message}`);
      fail++;
    }
  }

  await check("reservations.recent", async () => {
    const { json } = await callAppsScript(url, {
      action: "reservations.recent",
      siteCode,
      limit: "3",
    });
    if (!json.success) {
      throw new Error(json.error?.message || "success=false");
    }
  });

  await check("submit (테스트 접수)", async () => {
    const phone = "0108888" + String(Date.now()).slice(-4);
    const { json } = await callAppsScript(
      url,
      {
        action: "submit",
        siteCode,
        name: "연결검증_" + Date.now(),
        phone,
        privacyAgreed: true,
        utmSource: "verify-script",
        device: "desktop",
      },
      "POST"
    );
    if (!json.success) {
      throw new Error(json.error?.message || JSON.stringify(json.error));
    }
    if (!json.data?.submissionId) {
      throw new Error("submissionId 없음");
    }
    console.log(`    submissionId: ${json.data.submissionId}`);
  });

  console.log("");
  console.log(`RESULT: PASS=${pass} FAIL=${fail}`);
  console.log("");
  if (fail === 0) {
    console.log("→ Master Sheet 접수관리 탭에서 새 행 확인");
    console.log("→ Apps Script: runVisitLandingSetupVerify()");
    console.log("→ Apps Script: provisionSiteSpreadsheet('L001') (현장 Spreadsheet)");
  }
  console.log("");

  process.exit(fail > 0 ? 1 : 0);
}

main();
