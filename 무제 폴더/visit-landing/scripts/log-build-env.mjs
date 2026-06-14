#!/usr/bin/env node
/**
 * Netlify 빌드 시 APPS_SCRIPT_URL 반영 여부 확인
 * package.json prebuild / netlify.toml build command 에서 실행
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, "..", ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envLocal)) return;
  for (const line of fs.readFileSync(envLocal, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].trim();
  }
}

loadEnvLocal();

const url = (process.env.APPS_SCRIPT_URL ?? "").replace(/\/$/, "");
const siteCode = process.env.SHEET_SITE_CODE ?? "L001";
const deploymentId = url.match(/\/macros\/s\/([^/]+)\/exec/i)?.[1] ?? null;

console.log("\n=== Build env: Apps Script ===");
console.log(`  NODE_ENV:         ${process.env.NODE_ENV ?? "(unset)"}`);
console.log(`  NETLIFY:          ${process.env.NETLIFY ?? "(unset)"}`);
console.log(`  CONTEXT:          ${process.env.CONTEXT ?? "(unset)"}`);
console.log(`  APPS_SCRIPT_URL:  ${url ? "SET" : "MISSING"}`);
console.log(`  URL length:       ${url.length}`);
console.log(
  `  deploymentId:     ${deploymentId ? `${deploymentId.slice(0, 8)}…${deploymentId.slice(-6)}` : "(none)"}`
);
console.log(`  SHEET_SITE_CODE:  ${siteCode}`);

if (!url) {
  console.warn("\n⚠ APPS_SCRIPT_URL 미설정 — Netlify 런타임에서 /api/site-content → SHEET_UNAVAILABLE");
  console.warn("  Netlify → Site configuration → Environment variables:");
  console.warn("    APPS_SCRIPT_URL = https://script.google.com/macros/s/.../exec");
  console.warn("    SHEET_SITE_CODE = L001");
  console.warn("  저장 후 Clear cache and deploy site\n");
} else {
  console.log("\n✓ APPS_SCRIPT_URL 빌드 시점에 읽힘\n");
}
