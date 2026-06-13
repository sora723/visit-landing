#!/usr/bin/env node
/**
 * VisitLanding_Master ↔ Apps Script 연결
 *
 * Usage:
 *   node scripts/setup-apps-script.mjs                              # create + push + deploy
 *   node scripts/setup-apps-script.mjs --push                       # push + deploy (.clasp.json 필요)
 *   node scripts/setup-apps-script.mjs --script-id YOUR_SCRIPT_ID   # 기존 프로젝트 clone + push
 *   node scripts/setup-apps-script.mjs --verify                     # 로컬 CSV 헤더 검증
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const APPS_SCRIPT_DIR = path.resolve(ROOT, "apps-script");
const MASTER_CONFIG = path.join(ROOT, "config/master-sheet.json");
const CLASP_JSON = path.join(APPS_SCRIPT_DIR, ".clasp.json");
const ENV_LOCAL = path.join(ROOT, ".env.local");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseScriptId(argv) {
  const idx = argv.indexOf("--script-id");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1].trim();
  if (process.env.APPS_SCRIPT_PROJECT_ID) return process.env.APPS_SCRIPT_PROJECT_ID.trim();
  if (fs.existsSync(MASTER_CONFIG)) {
    const id = readJson(MASTER_CONFIG).scriptId;
    if (id) return String(id).trim();
  }
  return "";
}

function run(cmd, args, opts = {}) {
  const silent = opts.silent === true;
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || APPS_SCRIPT_DIR,
    encoding: "utf8",
    stdio: silent ? "pipe" : "inherit",
    shell: process.platform === "win32",
  });
  const combined = [r.stderr, r.stdout].filter(Boolean).join("\n").trim();
  if (r.status !== 0) {
    if (/Apps Script API/i.test(combined)) {
      console.error("");
      console.error("✗ Google Apps Script API가 아직 비활성입니다.");
      console.error("  https://script.google.com/home/usersettings (vidad.public@gmail.com)");
      console.error("  활성화 후 2~3분 대기 → 재실행");
      console.error("");
      console.error("  또는 수동: npm run manual:apps-script");
      console.error("");
      process.exit(1);
    }
    throw new Error(combined || `${cmd} failed`);
  }
  return r.stdout || "";
}

function clasp(args, opts) {
  return run("npx", ["@google/clasp", ...args], opts);
}

function claspOut(args) {
  return clasp(args, { silent: true }).trim();
}

function updateEnvLocal(webAppUrl) {
  let content = fs.existsSync(ENV_LOCAL)
    ? fs.readFileSync(ENV_LOCAL, "utf8")
    : "# Apps Script → 배포 → Web App URL (/exec)\nAPPS_SCRIPT_URL=\n\nSHEET_SITE_CODE=L001\n";

  if (/^APPS_SCRIPT_URL=.*/m.test(content)) {
    content = content.replace(/^APPS_SCRIPT_URL=.*/m, `APPS_SCRIPT_URL=${webAppUrl}`);
  } else {
    content += `\nAPPS_SCRIPT_URL=${webAppUrl}\n`;
  }

  if (!/^SHEET_SITE_CODE=/m.test(content)) {
    content += "\nSHEET_SITE_CODE=L001\n";
  }

  fs.writeFileSync(ENV_LOCAL, content, "utf8");
  console.log(`\n✓ .env.local APPS_SCRIPT_URL 업데이트`);
}

function extractExecUrl(deploymentsText) {
  const lines = deploymentsText.split("\n");
  // @HEAD 제외, 버전 번호 있는 deployment 우선
  for (const line of lines) {
    if (/@HEAD/i.test(line)) continue;
    const m = line.match(/-\s+(AKfy[\w-]+)/);
    if (m) return `https://script.google.com/macros/s/${m[1]}/exec`;
  }
  for (const line of lines) {
    const m = line.match(/-\s+(AKfy[\w-]+)/);
    if (m) return `https://script.google.com/macros/s/${m[1]}/exec`;
  }
  return null;
}

function extractDeploymentIdFromEnv() {
  if (!fs.existsSync(ENV_LOCAL)) return "";
  const content = fs.readFileSync(ENV_LOCAL, "utf8");
  const m = content.match(/^APPS_SCRIPT_URL=.*\/macros\/s\/([^/]+)\/exec/m);
  return m?.[1]?.trim() ?? "";
}

function ensureClaspDeps() {
  const pkg = path.join(APPS_SCRIPT_DIR, "package.json");
  if (!fs.existsSync(pkg)) {
    run("npm", ["init", "-y"], { cwd: APPS_SCRIPT_DIR, silent: true });
  }
  if (!fs.existsSync(path.join(APPS_SCRIPT_DIR, "node_modules/@google/clasp"))) {
    console.log("→ @google/clasp 설치 중...");
    run("npm", ["install", "@google/clasp", "--save-dev"], { cwd: APPS_SCRIPT_DIR });
  }
}

function ensureClaspProject(spreadsheetId, scriptId, pushOnly) {
  if (fs.existsSync(CLASP_JSON)) {
    const { scriptId: id } = readJson(CLASP_JSON);
    console.log(`→ 기존 scriptId: ${id}`);
    return;
  }

  if (scriptId) {
    console.log(`→ 기존 Apps Script clone (scriptId: ${scriptId})...`);
    clasp(["clone-script", scriptId, "--rootDir", "."], { silent: true });
    return;
  }

  if (pushOnly) {
    console.error("");
    console.error("✗ .clasp.json 없음 — push 전에 프로젝트 연결 필요");
    console.error("");
    console.error("  방법 1) 편집기 URL에서 scriptId 복사 후:");
    console.error("    npm run setup:apps-script -- --script-id YOUR_SCRIPT_ID");
    console.error("");
    console.error("  방법 2) config/master-sheet.json 에 scriptId 추가 후:");
    console.error("    npm run setup:apps-script:push");
    console.error("");
    process.exit(1);
  }

  console.log("→ VisitLanding_Master에 Apps Script 프로젝트 생성 (container-bound)...");
  clasp(
    [
      "create-script",
      "--type",
      "sheets",
      "--title",
      "VisitLanding API",
      "--parentId",
      spreadsheetId,
      "--rootDir",
      ".",
    ],
    { silent: true }
  );
}

function main() {
  const argv = process.argv.slice(2);
  const pushOnly = argv.includes("--push");
  const verifyOnly = argv.includes("--verify");
  const scriptId = parseScriptId(argv);

  if (verifyOnly) {
    run("bash", ["scripts/verify-sheet-structure.sh"], { cwd: ROOT });
    return;
  }

  const master = readJson(MASTER_CONFIG);
  const spreadsheetId = master.spreadsheetId;

  console.log("");
  console.log("VisitLanding Apps Script 연결");
  console.log(`  Master: ${master.name}`);
  console.log(`  ID:     ${spreadsheetId}`);
  console.log(`  URL:    ${master.spreadsheetUrl}`);
  if (scriptId) console.log(`  scriptId: ${scriptId}`);
  console.log("");

  ensureClaspDeps();

  try {
    claspOut(["show-authorized-user"]);
  } catch {
    console.error("✗ clasp 미로그인 → npx clasp login");
    process.exit(1);
  }

  ensureClaspProject(spreadsheetId, scriptId, pushOnly);

  console.log("→ clasp push...");
  clasp(["push", "-f"]);

  const deploymentId = extractDeploymentIdFromEnv();
  const deployDesc = `VisitLanding ${new Date().toISOString().slice(0, 10)}`;

  console.log("→ Web App 배포...");
  if (deploymentId) {
    console.log(`  기존 URL 업데이트: ${deploymentId.slice(0, 12)}…`);
    clasp([
      "deploy",
      "-i",
      deploymentId,
      "-d",
      deployDesc,
    ]);
  } else {
    try {
      clasp(["create-deployment", "--description", deployDesc]);
    } catch {
      console.warn("  (기존 deployment 유지)");
    }
  }

  const deployments = claspOut(["list-deployments"]);
  const webAppUrl = extractExecUrl(deployments);

  console.log("");
  console.log("✓ Apps Script push + 배포 완료");
  console.log("");
  if (fs.existsSync(CLASP_JSON)) {
    const { scriptId: id } = readJson(CLASP_JSON);
    console.log(`  편집기: https://script.google.com/home/projects/${id}/edit`);
  }
  if (webAppUrl) {
    console.log(`  Web App: ${webAppUrl}`);
    updateEnvLocal(webAppUrl);
    console.log("");
    console.log("  ⚠ 404 발생 시: 편집기 → 배포 → 새 배포 → 웹 앱 → 모든 사용자");
  }

  console.log("");
  console.log("다음: runVisitLandingSetupVerify() → provisionSiteSpreadsheet('L001')");
  console.log("      npm run verify:apps-script");
  console.log("");
}

main();
