/**
 * V2 Preview TEST_SITE_CODE admin data helpers (sandbox only — no live Sheet).
 * Usage: npm run verify:v2-preview-test-data
 */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const APPS = path.join(ROOT, "apps-script");

type Cell = string | number | boolean | "";

class MockRange {
  constructor(
    private sheet: MockSheet,
    private r1: number,
    private c1: number,
    private r2: number,
    private c2: number
  ) {}

  getValues(): Cell[][] {
    const out: Cell[][] = [];
    for (let r = this.r1; r <= this.r2; r++) {
      const row: Cell[] = [];
      for (let c = this.c1; c <= this.c2; c++) {
        row.push(this.sheet._get(r, c));
      }
      out.push(row);
    }
    return out;
  }

  getValue(): Cell {
    return this.sheet._get(this.r1, this.c1);
  }

  setValue(v: Cell): MockRange {
    this.sheet._set(this.r1, this.c1, v);
    return this;
  }

  setValues(values: Cell[][]): MockRange {
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        this.sheet._set(this.r1 + i, this.c1 + j, values[i][j]);
      }
    }
    return this;
  }
}

class MockSheet {
  data: Cell[][] = [];
  mutations: Array<Record<string, unknown>> = [];

  constructor(public name: string) {}

  _get(row: number, col: number): Cell {
    const r = this.data[row - 1];
    if (!r) return "";
    const v = r[col - 1];
    return v === undefined || v === null ? "" : v;
  }

  _set(row: number, col: number, value: Cell) {
    while (this.data.length < row) this.data.push([]);
    const r = this.data[row - 1];
    while (r.length < col) r.push("");
    r[col - 1] = value;
  }

  getName(): string {
    return this.name;
  }

  getLastRow(): number {
    for (let r = this.data.length; r >= 1; r--) {
      const row = this.data[r - 1] || [];
      if (row.some((c) => String(c ?? "").trim() !== "")) return r;
    }
    return 0;
  }

  getLastColumn(): number {
    let max = 0;
    for (const row of this.data) {
      for (let c = row.length; c >= 1; c--) {
        if (String(row[c - 1] ?? "").trim() !== "") {
          max = Math.max(max, c);
          break;
        }
      }
    }
    return max;
  }

  getRange(r1: number, c1: number, r2?: number, c2?: number): MockRange {
    return new MockRange(this, r1, c1, r2 ?? r1, c2 ?? c1);
  }

  getDataRange(): MockRange {
    const rows = Math.max(this.getLastRow(), 1);
    const cols = Math.max(this.getLastColumn(), 1);
    return this.getRange(1, 1, rows, cols);
  }

  appendRow(values: Cell[]) {
    const r = this.getLastRow() + 1;
    for (let i = 0; i < values.length; i++) {
      this._set(r, i + 1, values[i] ?? "");
    }
    this.mutations.push({ type: "appendRow", sheet: this.name, row: r });
  }

  deleteRow(row: number) {
    this.data.splice(row - 1, 1);
    this.mutations.push({ type: "deleteRow", sheet: this.name, row });
  }

  headerRow(): string[] {
    const last = this.getLastColumn();
    if (last < 1) return [];
    return this.getRange(1, 1, 1, last)
      .getValues()[0]
      .map((h) => String(h || "").trim());
  }

  rowAsObject(row: number): Record<string, Cell> {
    const headers = this.headerRow();
    const obj: Record<string, Cell> = {};
    for (let i = 0; i < headers.length; i++) {
      if (headers[i]) obj[headers[i]] = this._get(row, i + 1);
    }
    return obj;
  }

  rowsForSite(siteCode: string): Record<string, Cell>[] {
    const headers = this.headerRow();
    const codeCol = headers.indexOf("siteCode");
    if (codeCol < 0) return [];
    const out: Record<string, Cell>[] = [];
    for (let r = 2; r <= this.getLastRow(); r++) {
      if (String(this._get(r, codeCol + 1)).trim() !== siteCode) continue;
      out.push(this.rowAsObject(r));
    }
    return out;
  }
}

class MockSpreadsheet {
  sheets = new Map<string, MockSheet>();

  getSheetByName(name: string): MockSheet | null {
    return this.sheets.get(name) || null;
  }
}

type CallLog = {
  tryLockCount: number;
  releaseLockCount: number;
  flushCount: number;
  logs: string[];
};

function createCallLog(): CallLog {
  return { tryLockCount: 0, releaseLockCount: 0, flushCount: 0, logs: [] };
}

function seedSheet(name: string, headers: string[], rows: Cell[][] = []): MockSheet {
  const sheet = new MockSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  for (let i = 0; i < rows.length; i++) {
    sheet.getRange(2 + i, 1, 2 + i, rows[i].length).setValues([rows[i]]);
  }
  sheet.mutations = [];
  return sheet;
}

function createSandbox(ss: MockSpreadsheet, lockAcquire = true, log = createCallLog()) {
  const SHEET_NAMES = {
    SITE: "현장관리",
    CONTENT: "콘텐츠관리",
    V2_BLOCK: "V2_블록관리",
    V2_CONTENT: "V2_콘텐츠",
  };

  const sandbox: Record<string, unknown> = {
    SHEET_NAMES,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: () => ss,
      flush: () => {
        log.flushCount++;
      },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          log.tryLockCount++;
          return lockAcquire;
        },
        releaseLock: () => {
          log.releaseLockCount++;
        },
      }),
    },
    Logger: { log: (m: string) => log.logs.push(String(m)) },
    console: {
      log: (...args: unknown[]) => log.logs.push(args.map(String).join(" ")),
    },
    createAppError_: (code: string, message: string) => {
      const err = new Error(message) as Error & { code: string };
      err.code = code;
      return err;
    },
  };

  sandbox.getSpreadsheet_ = () => ss;
  sandbox.getSheetOptional_ = (sheetName: string) => {
    const name = String(sheetName || "").trim();
    if (!name) return null;
    return ss.getSheetByName(name);
  };
  sandbox.getSheet_ = (sheetName: string) => {
    const sheet = (sandbox.getSheetOptional_ as (n: string) => MockSheet | null)(
      sheetName
    );
    if (!sheet) throw new Error("missing sheet " + sheetName);
    return sheet;
  };
  sandbox.getHeaderIndexMap_ = (sheet: MockSheet) => {
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) return {};
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const map: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i]).trim();
      if (h) map[h] = i;
    }
    return map;
  };
  sandbox.sheetToObjects_ = (sheetName: string) => {
    const sheet = (sandbox.getSheet_ as (n: string) => MockSheet)(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0].map((h) => String(h).trim());
    const rows: Record<string, Cell>[] = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row.some((c) => String(c ?? "").trim() !== "")) continue;
      const obj: Record<string, Cell> = {};
      for (let i = 0; i < headers.length; i++) {
        if (headers[i]) obj[headers[i]] = row[i];
      }
      rows.push(obj);
    }
    return rows;
  };
  sandbox.getField_ = (row: Record<string, Cell>, headerName: string) => {
    if (!row || row[headerName] === undefined || row[headerName] === null) return "";
    return String(row[headerName]).trim();
  };
  sandbox.getSiteField_ = (row: Record<string, Cell>, headerNames: string[]) => {
    for (const name of headerNames || []) {
      const v = (sandbox.getField_ as (r: Record<string, Cell>, h: string) => string)(
        row,
        name
      );
      if (v !== "") return v;
    }
    return "";
  };
  sandbox.getSiteCodeFromRow_ = (row: Record<string, Cell>) =>
    (sandbox.getSiteField_ as (r: Record<string, Cell>, n: string[]) => string)(row, [
      "siteCode",
      "현장코드",
    ]);
  sandbox.findSiteByCode_ = (siteCode: string) => {
    const code = String(siteCode || "").trim();
    if (!code) return null;
    const rows = (
      sandbox.sheetToObjects_ as (n: string) => Record<string, Cell>[]
    )(SHEET_NAMES.SITE);
    for (const row of rows) {
      if (
        (sandbox.getSiteCodeFromRow_ as (r: Record<string, Cell>) => string)(row) ===
        code
      ) {
        return row;
      }
    }
    return null;
  };
  sandbox.createV2PreviewUrl = (siteCode: string) => {
    return (
      "https://deploy-preview-1--smodelhouse.netlify.app/api/preview/enter?siteCode=" +
      encodeURIComponent(String(siteCode || "").trim()) +
      "&t=TEST_TOKEN_VALUE_DO_NOT_LOG"
    );
  };

  const schemaSrc = fs.readFileSync(
    path.join(APPS, "V2SheetSchemaService.gs"),
    "utf8"
  );
  // Load column constants only (skip running top-level that needs more)
  vm.runInNewContext(schemaSrc, sandbox, { filename: "V2SheetSchemaService.gs" });

  const testSrc = fs.readFileSync(
    path.join(APPS, "V2PreviewTestDataService.gs"),
    "utf8"
  );
  vm.runInNewContext(testSrc, sandbox, { filename: "V2PreviewTestDataService.gs" });

  return Object.assign(sandbox, { __log: log }) as Record<string, unknown> & {
    setupV2PreviewTestData: () => Record<string, unknown>;
    cleanupV2PreviewTestData: () => Record<string, unknown>;
    createTestV2PreviewUrl: () => string;
    V2_BLOCK_PUBLIC_COLUMNS: string[];
    V2_CONTENT_PUBLIC_COLUMNS: string[];
    __log: CallLog;
  };
}

function siteHeaders(blockCols: string[], contentCols: string[]): {
  site: string[];
  block: string[];
  content: string[];
} {
  return {
    site: [
      "siteCode",
      "siteName",
      "phone",
      "isActive",
      "notifyPhone",
      "managerPhone",
      "popupEnabled",
      "liveStatusEnabled",
      "virtualReservationEnabled",
      "submissionSpreadsheetId",
      "metaPixelId",
      "googleConversionId",
      "rendererVersion",
      "pageStatus",
      "pageSchemaVersion",
      "publishedRevisionId",
      "draftRevisionId",
    ],
    block: blockCols.slice(),
    content: contentCols.slice(),
  };
}

function seedBase(
  ss: MockSpreadsheet,
  headers: ReturnType<typeof siteHeaders>
) {
  ss.sheets.set(
    "현장관리",
    seedSheet("현장관리", headers.site, [
      [
        "L001",
        "운영현장",
        "1688-9999",
        "Y",
        "01012345678",
        "01099998888",
        "Y",
        "Y",
        "Y",
        "ssid-ops",
        "pixel-ops",
        "aw-ops",
        "v1",
        "published",
        1,
        "pub-L001-001",
        "draft-L001-001",
      ],
    ])
  );
  ss.sheets.set(
    "콘텐츠관리",
    seedSheet("콘텐츠관리", ["siteCode", "heroTitle"], [["L001", "운영히어로"]])
  );
  ss.sheets.set(
    "접수관리",
    seedSheet("접수관리", ["id", "siteCode", "phone"], [["1", "L001", "01011112222"]])
  );
  ss.sheets.set("V2_블록관리", seedSheet("V2_블록관리", headers.block));
  ss.sheets.set("V2_콘텐츠", seedSheet("V2_콘텐츠", headers.content));
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  let pass = 0;
  let fail = 0;

  function check(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      pass++;
    } catch (e) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${(e as Error).message}`);
      fail++;
    }
  }

  console.log("\n[verify:v2-preview-test-data] TEST_SITE_CODE admin helpers\n");

  const probeSs = new MockSpreadsheet();
  const probe = createSandbox(probeSs);
  const BLOCK = probe.V2_BLOCK_PUBLIC_COLUMNS.slice();
  const CONTENT = probe.V2_CONTENT_PUBLIC_COLUMNS.slice();
  const headers = siteHeaders(BLOCK, CONTENT);

  check("1. setup creates TEST_SITE_CODE only", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const api = createSandbox(ss);
    const result = api.setupV2PreviewTestData();
    assert(result.ok === true && result.changed === true, "changed true");
    assert(result.siteCode === "TEST_SITE_CODE", "siteCode");
    const sites = ss.getSheetByName("현장관리")!;
    assert(sites.rowsForSite("TEST_SITE_CODE").length === 1, "one test site");
    assert(sites.rowsForSite("L001").length === 1, "ops site preserved");
    assert(api.__log.tryLockCount === 1, "lock used");
    assert(api.__log.releaseLockCount === 1, "lock released");
  });

  check("2. ops site row unchanged after setup", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const before = JSON.stringify(ss.getSheetByName("현장관리")!.rowAsObject(2));
    createSandbox(ss).setupV2PreviewTestData();
    const after = JSON.stringify(ss.getSheetByName("현장관리")!.rowAsObject(2));
    assert(before === after, "L001 row identical");
  });

  check("3. content management row not created", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const content = ss.getSheetByName("콘텐츠관리")!;
    const before = content.getLastRow();
    createSandbox(ss).setupV2PreviewTestData();
    assert(content.getLastRow() === before, "no new content mgmt rows");
    assert(content.rowsForSite("TEST_SITE_CODE").length === 0, "no TEST in content");
  });

  check("4-6. site contract fields", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    createSandbox(ss).setupV2PreviewTestData();
    const row = ss.getSheetByName("현장관리")!.rowsForSite("TEST_SITE_CODE")[0];
    assert(String(row.publishedRevisionId ?? "") === "", "publishedRevisionId empty");
    assert(String(row.rendererVersion) === "v2", "rendererVersion");
    assert(String(row.pageStatus) === "draft", "pageStatus");
    assert(String(row.draftRevisionId) === "draft-TEST_SITE_CODE-001", "draft id");
    assert(String(row.siteName) === "V2 Preview 테스트 현장", "siteName");
    assert(String(row.phone) === "1688-0001", "phone");
    assert(String(row.isActive) === "Y", "isActive");
    assert(String(row.pageSchemaVersion) === "1", "pageSchemaVersion");
    assert(String(row.liveStatusEnabled) === "N", "liveStatusEnabled");
    assert(String(row.virtualReservationEnabled) === "N", "virtualReservation");
    assert(String(row.popupEnabled) === "N", "popupEnabled");
    assert(String(row.notifyPhone ?? "") === "", "notify blank");
    assert(String(row.metaPixelId ?? "") === "", "conversion blank");
  });

  check("7. hero/form blocks exact header order values", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    createSandbox(ss).setupV2PreviewTestData();
    const blocks = ss.getSheetByName("V2_블록관리")!.rowsForSite("TEST_SITE_CODE");
    assert(blocks.length === 2, "2 blocks");
    assert(String(blocks[0].sectionId) === "hero-preview", "hero section");
    assert(String(blocks[0].componentType) === "hero", "hero type");
    assert(String(blocks[0].variant) === "fullBleed", "hero variant");
    assert(String(blocks[0].optionsJson) === "{}", "hero options");
    assert(String(blocks[1].sectionId) === "form-preview", "form section");
    assert(String(blocks[1].componentType) === "form", "form type");
    assert(String(blocks[1].variant) === "card", "form variant");
    assert(String(blocks[1].themeVariant) === "light", "form theme");
    // header order matches constant
    assert(
      JSON.stringify(ss.getSheetByName("V2_블록관리")!.headerRow()) ===
        JSON.stringify(BLOCK),
      "block header order"
    );
  });

  check("8. content 4 rows exact roles", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    createSandbox(ss).setupV2PreviewTestData();
    const rows = ss.getSheetByName("V2_콘텐츠")!.rowsForSite("TEST_SITE_CODE");
    assert(rows.length === 4, "4 contents");
    assert(String(rows[0].role) === "root" && String(rows[0].itemId) === "hero-root-1", "hero root");
    assert(String(rows[1].role) === "root" && String(rows[1].itemId) === "form-root-1", "form root");
    assert(String(rows[2].role) === "form" && String(rows[2].itemId) === "form-body-1", "form body");
    assert(
      String(rows[3].role) === "cta" &&
        String(rows[3].actionType) === "submit" &&
        String(rows[3].actionLabel) === "방문예약하기",
      "form cta"
    );
    assert(
      JSON.stringify(ss.getSheetByName("V2_콘텐츠")!.headerRow()) ===
        JSON.stringify(CONTENT),
      "content header order"
    );
  });

  check("9. second setup changed:false", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const api = createSandbox(ss);
    api.setupV2PreviewTestData();
    const siteRows = ss.getSheetByName("현장관리")!.getLastRow();
    const blockRows = ss.getSheetByName("V2_블록관리")!.getLastRow();
    const contentRows = ss.getSheetByName("V2_콘텐츠")!.getLastRow();
    const second = api.setupV2PreviewTestData();
    assert(second.changed === false && second.ok === true, "idempotent");
    assert(ss.getSheetByName("현장관리")!.getLastRow() === siteRows, "no dup site");
    assert(ss.getSheetByName("V2_블록관리")!.getLastRow() === blockRows, "no dup blocks");
    assert(ss.getSheetByName("V2_콘텐츠")!.getLastRow() === contentRows, "no dup contents");
  });

  check("10. cleanup deletes TEST_SITE_CODE only", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const api = createSandbox(ss);
    api.setupV2PreviewTestData();
    const result = api.cleanupV2PreviewTestData();
    assert(result.changed === true, "cleanup changed");
    const deleted = result.deleted as { site: number; blocks: number; contents: number };
    assert(deleted.site === 1, "site deleted");
    assert(deleted.blocks === 2, "blocks deleted");
    assert(deleted.contents === 4, "contents deleted");
    assert(ss.getSheetByName("현장관리")!.rowsForSite("TEST_SITE_CODE").length === 0, "test gone");
    assert(ss.getSheetByName("현장관리")!.rowsForSite("L001").length === 1, "ops kept");
    assert(ss.getSheetByName("콘텐츠관리")!.rowsForSite("L001").length === 1, "content mgmt kept");
    assert(ss.getSheetByName("접수관리")!.getLastRow() === 2, "submission kept");
  });

  check("11. second cleanup changed:false", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const api = createSandbox(ss);
    api.setupV2PreviewTestData();
    api.cleanupV2PreviewTestData();
    const second = api.cleanupV2PreviewTestData();
    assert(second.changed === false && second.ok === true, "idempotent cleanup");
  });

  check("12. other siteCode preserved after cleanup", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    // seed an ops V2 row that must survive
    const block = ss.getSheetByName("V2_블록관리")!;
    const opsRow = BLOCK.map((h) => (h === "siteCode" ? "L001" : h === "revisionId" ? "pub-L001-001" : ""));
    opsRow[BLOCK.indexOf("sectionId")] = "ops-hero";
    block.appendRow(opsRow);
    const api = createSandbox(ss);
    api.setupV2PreviewTestData();
    api.cleanupV2PreviewTestData();
    assert(block.rowsForSite("L001").length === 1, "ops V2 block kept");
    assert(block.rowsForSite("TEST_SITE_CODE").length === 0, "test blocks gone");
  });

  check("13. LockService used on setup/cleanup", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const api = createSandbox(ss);
    api.setupV2PreviewTestData();
    api.cleanupV2PreviewTestData();
    assert(api.__log.tryLockCount >= 2, "tryLock");
    assert(api.__log.releaseLockCount >= 2, "releaseLock");
  });

  check("14. conflicting test row aborts setup", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const site = ss.getSheetByName("현장관리")!;
    const bad = headers.site.map((h) => {
      if (h === "siteCode") return "TEST_SITE_CODE";
      if (h === "siteName") return "wrong";
      if (h === "rendererVersion") return "v2";
      if (h === "pageStatus") return "draft";
      if (h === "draftRevisionId") return "draft-TEST_SITE_CODE-001";
      if (h === "publishedRevisionId") return "";
      if (h === "isActive") return "Y";
      if (h === "phone") return "1688-0001";
      if (h === "pageSchemaVersion") return 1;
      return "";
    });
    site.appendRow(bad);
    let threw = false;
    try {
      createSandbox(ss).setupV2PreviewTestData();
    } catch (e) {
      threw = /conflict/i.test((e as Error).message);
    }
    assert(threw, "conflict error");
    assert(ss.getSheetByName("현장관리")!.rowsForSite("L001").length === 1, "ops untouched");
  });

  check("15. admin manual functions only + no Web App action", () => {
    const testSrc = fs.readFileSync(
      path.join(APPS, "V2PreviewTestDataService.gs"),
      "utf8"
    );
    const mainSrc = fs.readFileSync(path.join(APPS, "Main.gs"), "utf8");
    assert(/function setupV2PreviewTestData\(/.test(testSrc), "setup fn");
    assert(/function cleanupV2PreviewTestData\(/.test(testSrc), "cleanup fn");
    assert(/function createTestV2PreviewUrl\(/.test(testSrc), "url fn");
    assert(!/case\s+'setup\.v2PreviewTest'/.test(mainSrc), "no setup action");
    assert(!/setupV2PreviewTestData/.test(mainSrc), "not in Main");
    assert(!/cleanupV2PreviewTestData/.test(mainSrc), "cleanup not in Main");
    assert(!/createTestV2PreviewUrl/.test(mainSrc), "url not in Main");
    assert(/Web App action/.test(testSrc) || /doGet|doPost/.test(testSrc), "docs mention not web");
  });

  check("16. Preview URL not logged", () => {
    const ss = new MockSpreadsheet();
    seedBase(ss, headers);
    const api = createSandbox(ss);
    api.setupV2PreviewTestData();
    const url = api.createTestV2PreviewUrl();
    assert(url.includes("TEST_SITE_CODE"), "url has site");
    assert(url.includes("t="), "url has token param");
    const joined = api.__log.logs.join("\n");
    assert(!joined.includes("TEST_TOKEN_VALUE_DO_NOT_LOG"), "token not logged");
    assert(!/\/api\/preview\/enter\?/.test(joined), "enter url not logged");
    const src = fs.readFileSync(
      path.join(APPS, "V2PreviewTestDataService.gs"),
      "utf8"
    );
    assert(
      /createTestV2PreviewUrl[\s\S]*return createV2PreviewUrl\(V2_PREVIEW_TEST_SITE_CODE_\)/.test(
        src
      ),
      "delegates to createV2PreviewUrl"
    );
    assert(
      !/console\.log\([^\)]*createTestV2PreviewUrl/.test(src) &&
        !/Logger\.log\([^\)]*createV2PreviewUrl/.test(src),
      "no log of url helper"
    );
  });

  check("17. live Sheet not touched by this verify (sandbox only)", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts/verify-v2-preview-test-data.ts"),
      "utf8"
    );
    assert(/MockSpreadsheet/.test(src), "uses mock");
    assert(!/SpreadsheetApp\.openById\(MASTER/.test(src), "no master open");
    assert(/no live Sheet/.test(src) || /sandbox only/.test(src), "documents sandbox");
  });

  check("18. column index hardcoding absent in service", () => {
    const src = fs.readFileSync(
      path.join(APPS, "V2PreviewTestDataService.gs"),
      "utf8"
    );
    assert(!/getRange\(\s*\d+\s*,\s*1[89]\b/.test(src), "no col 18/19 hardcode");
    assert(!/getRange\(\s*\d+\s*,\s*2[01]\b/.test(src), "no col 20/21 hardcode");
    assert(/getHeaderIndexMap_/.test(src), "header map used");
    assert(/V2_BLOCK_PUBLIC_COLUMNS/.test(src), "block cols constant");
    assert(/V2_CONTENT_PUBLIC_COLUMNS/.test(src), "content cols constant");
  });

  console.log(`\n[verify:v2-preview-test-data] ${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

main();
