#!/usr/bin/env node
/**
 * 알림톡(Solapi) + site.config 검수
 * Usage: node scripts/verify-notification.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");

function loadEnv() {
  if (!fs.existsSync(ENV_LOCAL)) return {};
  const env = {};
  for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const APPS_SCRIPT_URL = env.APPS_SCRIPT_URL?.replace(/\/$/, "");
const SITE_CODE = env.SHEET_SITE_CODE || "L001";

let pass = 0;
let fail = 0;

function ok(msg) {
  pass += 1;
  console.log(`  ✓ ${msg}`);
}

function bad(msg, detail) {
  fail += 1;
  console.error(`  ✗ ${msg}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("=== 알림톡 / site.config 검수 ===\n");

  if (!APPS_SCRIPT_URL) {
    bad("APPS_SCRIPT_URL 미설정");
    process.exit(1);
  }

  // 1) site.config — 폼 옵션
  const configUrl =
    `${APPS_SCRIPT_URL}?action=site.config&siteCode=${encodeURIComponent(SITE_CODE)}`;
  const configRes = await fetch(configUrl, { redirect: "follow" });
  const configJson = await configRes.json();

  if (configJson.success && configJson.data) {
    ok(`site.config (${SITE_CODE})`);
    const d = configJson.data;
    console.log(`    stickyPromoText: ${d.stickyPromoText ?? "(없음)"}`);
    console.log(
      `    unitTypeOptions: ${Array.isArray(d.unitTypeOptions) ? d.unitTypeOptions.join(", ") : "(없음)"}`
    );
    console.log(`    visitDateDays: ${d.visitDateDays ?? 30}`);
    if (!Array.isArray(d.unitTypeOptions) || !d.unitTypeOptions.length) {
      bad("unitTypeOptions 비어 있음 — Sheet 콘텐츠관리.unitTypeOptions 입력 필요");
    } else {
      ok(`관심평형 ${d.unitTypeOptions.length}개`);
    }
  } else {
    bad("site.config 실패", JSON.stringify(configJson.error));
  }

  // 2) submit + 알림
  const ts = Date.now();
  const phone = `0109${String(ts).slice(-7)}`;
  const submitRes = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    redirect: "follow",
    body: JSON.stringify({
      action: "submit",
      siteCode: SITE_CODE,
      name: `알림검수${String(ts).slice(-4)}`,
      phone,
      unitType: "84A",
      visitDate: new Date().toISOString().slice(0, 10),
      privacyAgreed: true,
      utmSource: "verify",
      utmMedium: "notification",
      utmCampaign: "alimtalk-test",
      referer: "https://localhost/",
      device: "desktop",
      ip: "127.0.0.1",
    }),
  });
  const submitJson = await submitRes.json();

  if (submitJson.success && submitJson.data?.submissionId) {
    ok(`submit 저장 (${submitJson.data.submissionId.slice(0, 8)}…)`);
    if (submitJson.data.notificationSent === true) {
      ok("알림톡 발송 성공 (notificationSent=true)");
    } else {
      bad(
        "알림톡 미발송",
        "SOLAPI_PF_ID / SOLAPI_TEMPLATE_ID_SUBMISSION / notifyPhone 확인 — Sheet 저장은 성공"
      );
    }
  } else {
    bad("submit 실패", JSON.stringify(submitJson.error));
  }

  console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
