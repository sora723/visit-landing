/**
 * V2 Sheet schema — load real Apps Script helpers with SpreadsheetApp/LockService mocks.
 *
 * Usage: npx tsx scripts/verify-v2-sheet-schema.ts
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
    this.sheet.mutations.push({
      type: "setValue",
      sheet: this.sheet.name,
      row: this.r1,
      col: this.c1,
      value: v,
    });
    return this;
  }

  setValues(values: Cell[][]): MockRange {
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        this.sheet._set(this.r1 + i, this.c1 + j, values[i][j]);
      }
    }
    this.sheet.mutations.push({
      type: "setValues",
      sheet: this.sheet.name,
      row: this.r1,
      col: this.c1,
      rows: values.length,
      cols: values[0]?.length ?? 0,
    });
    return this;
  }
}

class MockSheet {
  data: Cell[][] = [];
  frozenRows = 0;
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

  setFrozenRows(n: number) {
    this.frozenRows = n;
    this.mutations.push({ type: "setFrozenRows", sheet: this.name, n });
  }

  headerRow(): string[] {
    const last = this.getLastColumn();
    if (last < 1) return [];
    return this.getRange(1, 1, 1, last)
      .getValues()[0]
      .map((h) => String(h || "").trim());
  }

  rowValues(row: number): Cell[] {
    return (this.data[row - 1] || []).slice();
  }
}

class MockSpreadsheet {
  sheets = new Map<string, MockSheet>();
  insertCount = 0;

  getSheetByName(name: string): MockSheet | null {
    return this.sheets.get(name) || null;
  }

  insertSheet(name: string): MockSheet {
    if (this.sheets.has(name)) {
      throw new Error("Sheet already exists: " + name);
    }
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    this.insertCount++;
    sheet.mutations.push({ type: "insertSheet", sheet: name });
    return sheet;
  }

  getSheets(): MockSheet[] {
    return [...this.sheets.values()];
  }
}

type LockState = { acquire: boolean };

type CallLog = {
  events: string[];
  flushCount: number;
  tryLockCount: number;
  releaseLockCount: number;
  openByIdArgs: string[];
  getActiveCount: number;
  writes: number;
};

function createCallLog(): CallLog {
  return {
    events: [],
    flushCount: 0,
    tryLockCount: 0,
    releaseLockCount: 0,
    openByIdArgs: [],
    getActiveCount: 0,
    writes: 0,
  };
}

function createSandbox(
  ss: MockSpreadsheet,
  lockState: LockState,
  log: CallLog = createCallLog()
) {
  const SHEET_NAMES = {
    SITE: "현장관리",
    CONTENT: "콘텐츠관리",
    V2_BLOCK: "V2_블록관리",
    V2_CONTENT: "V2_콘텐츠",
  };

  const sandbox: Record<string, unknown> = {
    SHEET_NAMES,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => {
        log.getActiveCount++;
        log.events.push("getActiveSpreadsheet");
        return ss;
      },
      openById: (id: string) => {
        log.openByIdArgs.push(String(id));
        log.events.push("openById:" + id);
        return ss;
      },
      flush: () => {
        log.flushCount++;
        log.events.push("flush");
      },
      getUi: () => ({ alert: () => {} }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          log.tryLockCount++;
          log.events.push("tryLock");
          return lockState.acquire;
        },
        releaseLock: () => {
          log.releaseLockCount++;
          log.events.push("releaseLock");
        },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
      }),
    },
    Logger: { log: () => {} },
    console,
  };

  sandbox.getSpreadsheet_ = function getSpreadsheet_() {
    return ss;
  };
  sandbox.getSheetOptional_ = function getSheetOptional_(sheetName: string) {
    const name = String(sheetName || "").trim();
    if (!name) return null;
    return ss.getSheetByName(name);
  };
  sandbox.getSheet_ = function getSheet_(sheetName: string) {
    const sheet = (sandbox.getSheetOptional_ as (n: string) => MockSheet | null)(
      sheetName
    );
    if (!sheet) throw new Error("missing sheet " + sheetName);
    return sheet;
  };
  sandbox.getHeaderIndexMap_ = function getHeaderIndexMap_(sheet: MockSheet) {
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
  sandbox.createAppError_ = function createAppError_(code: string, message: string) {
    const err = new Error(message) as Error & { code: string };
    err.code = code;
    return err;
  };

  const schemaSrc = fs.readFileSync(
    path.join(APPS, "V2SheetSchemaService.gs"),
    "utf8"
  );
  vm.runInNewContext(schemaSrc, sandbox, { filename: "V2SheetSchemaService.gs" });

  return Object.assign(sandbox, { __log: log }) as Record<string, unknown> & {
    inspectV2SheetSchema: () => Record<string, unknown>;
    ensureV2SheetSchema: () => Record<string, unknown>;
    ensureV2SheetSchemaUnlocked_: () => Record<string, unknown>;
    V2_BLOCK_PUBLIC_COLUMNS: string[];
    V2_CONTENT_PUBLIC_COLUMNS: string[];
    V2_SITE_MANAGEMENT_COLUMNS: string[];
    __log: CallLog;
  };
}

function extractGsFunction(src: string, name: string): string {
  const needle = "function " + name + "(";
  const start = src.indexOf(needle);
  if (start < 0) throw new Error("function not found: " + name);
  const braceStart = src.indexOf("{", start);
  if (braceStart < 0) throw new Error("no body: " + name);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced braces: " + name);
}

/** Load production SheetUtils getSpreadsheet_ path (active=null → openById). */
function loadProductionGetSpreadsheet_(log: CallLog) {
  const MASTER_ID = "1rRLKLBIyZPjw1e4a14MPzaTNBib0vTKEpHEqfQg3pyA";
  const fakeSs = { id: MASTER_ID };
  const sandbox: Record<string, unknown> = {
    MASTER_SPREADSHEET_ID: MASTER_ID,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => {
        log.getActiveCount++;
        log.events.push("getActiveSpreadsheet");
        return null;
      },
      openById: (id: string) => {
        log.openByIdArgs.push(String(id));
        log.events.push("openById:" + id);
        return fakeSs;
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
      }),
    },
    createAppError_: (code: string, message: string) => {
      const err = new Error(message) as Error & { code: string };
      err.code = code;
      return err;
    },
  };

  const utilsSrc = fs.readFileSync(path.join(APPS, "SheetUtils.gs"), "utf8");
  const masterVar = utilsSrc.match(/var MASTER_SPREADSHEET_ID = [^;]+;/);
  if (!masterVar) throw new Error("MASTER_SPREADSHEET_ID not found");
  const extract = [
    masterVar[0],
    extractGsFunction(utilsSrc, "getMasterSpreadsheetId_"),
    extractGsFunction(utilsSrc, "getSpreadsheet_"),
  ].join("\n");

  vm.runInNewContext(extract, sandbox, { filename: "SheetUtils-extract.gs" });
  return sandbox as {
    getSpreadsheet_: () => unknown;
    getMasterSpreadsheetId_: () => string;
  };
}

function baseSiteHeaders(): string[] {
  return [
    "siteCode",
    "siteName",
    "isActive",
    "mainColor",
    "subColor",
    "accentColor",
  ];
}

function seedSiteSheet(
  ss: MockSpreadsheet,
  headers: string[],
  dataRow?: Cell[]
): MockSheet {
  const sheet = new MockSheet("현장관리");
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (dataRow) {
    sheet.getRange(2, 1, 2, dataRow.length).setValues([dataRow]);
  }
  sheet.mutations = [];
  ss.sheets.set("현장관리", sheet);
  return sheet;
}

function seedContentManagement(ss: MockSpreadsheet): MockSheet {
  const sheet = new MockSheet("콘텐츠관리");
  sheet
    .getRange(1, 1, 1, 3)
    .setValues([["siteCode", "heroTitle", "ctaText"]]);
  sheet.getRange(2, 1, 2, 3).setValues([["L001", "Hero", "CTA"]]);
  sheet.mutations = [];
  ss.sheets.set("콘텐츠관리", sheet);
  return sheet;
}

function seedV2Sheet(
  ss: MockSpreadsheet,
  name: string,
  headers: string[],
  dataRows?: Cell[][]
): MockSheet {
  const sheet = new MockSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (dataRows) {
    for (let i = 0; i < dataRows.length; i++) {
      sheet
        .getRange(2 + i, 1, 2 + i, dataRows[i].length)
        .setValues([dataRows[i]]);
    }
  }
  sheet.frozenRows = 1;
  sheet.mutations = [];
  ss.sheets.set(name, sheet);
  return sheet;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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

  console.log("\nV2 Sheet schema verify\n");

  const probe = createSandbox(new MockSpreadsheet(), { acquire: true });
  const BLOCK = probe.V2_BLOCK_PUBLIC_COLUMNS.slice();
  const CONTENT = probe.V2_CONTENT_PUBLIC_COLUMNS.slice();
  const SITE_V2 = probe.V2_SITE_MANAGEMENT_COLUMNS.slice();

  check("1. all structures already ok → changed=false", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2], [
      "L001",
      "Site",
      "Y",
      "#111",
      "#222",
      "#333",
      ...SITE_V2.map(() => ""),
    ]);
    seedV2Sheet(ss, "V2_블록관리", BLOCK, [
      ["L001", "pub-L001-1", "s1", 1, "Hero", "default", "g1", "Y"],
    ]);
    seedV2Sheet(ss, "V2_콘텐츠", CONTENT);
    seedContentManagement(ss);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    assert(r.ok === true, "ok");
    assert(r.changed === false, "changed");
    assert((r.siteManagement as { addedHeaders: string[] }).addedHeaders.length === 0, "no add");
  });

  check("2. all site V2 columns missing → append in order", () => {
    const ss = new MockSpreadsheet();
    const site = seedSiteSheet(ss, baseSiteHeaders(), [
      "L001",
      "Site",
      "Y",
      "#111",
      "#222",
      "#333",
    ]);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    assert(r.ok === true && r.changed === true, "ok changed");
    const added = (r.siteManagement as { addedHeaders: string[] }).addedHeaders;
    assert(deepEqual(added, SITE_V2), "added order " + JSON.stringify(added));
    const headers = site.headerRow();
    assert(
      deepEqual(headers.slice(baseSiteHeaders().length), SITE_V2),
      "headers at end"
    );
  });

  check("3. partial site columns missing → only missing added", () => {
    const ss = new MockSpreadsheet();
    const present = SITE_V2.slice(0, 5);
    const missing = SITE_V2.slice(5);
    const site = seedSiteSheet(ss, [...baseSiteHeaders(), ...present]);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    const added = (r.siteManagement as { addedHeaders: string[] }).addedHeaders;
    assert(deepEqual(added, missing), "only missing");
    assert(
      deepEqual(site.headerRow().slice(baseSiteHeaders().length), SITE_V2),
      "full set"
    );
  });

  check("4. existing site management row data preserved", () => {
    const ss = new MockSpreadsheet();
    const row = ["L001", "Site", "Y", "#111", "#222", "#333"];
    const site = seedSiteSheet(ss, baseSiteHeaders(), row);
    const api = createSandbox(ss, { acquire: true });
    api.ensureV2SheetSchema();
    const after = site.rowValues(2).slice(0, 6);
    assert(deepEqual(after, row), "row preserved " + JSON.stringify(after));
  });

  check("5. V2_블록관리 missing → create + headers", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    const blocks = (r.sheets as { blocks: { created: boolean; headerValid: boolean } })
      .blocks;
    assert(blocks.created === true && blocks.headerValid === true, "created");
    const sheet = ss.getSheetByName("V2_블록관리");
    assert(sheet, "exists");
    assert(deepEqual(sheet!.headerRow(), BLOCK), "headers");
    assert(sheet!.frozenRows === 1, "frozen");
    assert(sheet!.getLastRow() === 1, "no sample rows");
  });

  check("6. V2_콘텐츠 missing → create + headers", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    seedV2Sheet(ss, "V2_블록관리", BLOCK);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    const contents = (
      r.sheets as { contents: { created: boolean; headerValid: boolean } }
    ).contents;
    assert(contents.created === true, "created");
    const sheet = ss.getSheetByName("V2_콘텐츠");
    assert(deepEqual(sheet!.headerRow(), CONTENT), "headers");
  });

  check("7. empty existing sheet → write headers only", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    ss.sheets.set("V2_블록관리", new MockSheet("V2_블록관리"));
    ss.sheets.set("V2_콘텐츠", new MockSheet("V2_콘텐츠"));
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    assert(r.ok === true && r.changed === true, "changed");
    assert(deepEqual(ss.getSheetByName("V2_블록관리")!.headerRow(), BLOCK), "block");
    assert(deepEqual(ss.getSheetByName("V2_콘텐츠")!.headerRow(), CONTENT), "content");
    assert(ss.getSheetByName("V2_블록관리")!.getLastRow() === 1, "no data");
  });

  check("8. valid headers + data → data unchanged", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    const data = ["L001", "pub-L001-1", "s1", 1, "Hero", "default", "g1", "Y"];
    const block = seedV2Sheet(ss, "V2_블록관리", BLOCK, [data]);
    seedV2Sheet(ss, "V2_콘텐츠", CONTENT);
    const before = JSON.stringify(block.data);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    assert(r.changed === false, "unchanged");
    assert(JSON.stringify(block.data) === before, "data same");
  });

  check("9. wrong headers + data → fail, sheet unmodified", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    const wrong = ["siteCode", "WRONG", "sectionId"];
    const block = seedV2Sheet(ss, "V2_블록관리", wrong, [["L001", "x", "s1"]]);
    seedV2Sheet(ss, "V2_콘텐츠", CONTENT);
    const before = JSON.stringify(block.data);
    const api = createSandbox(ss, { acquire: true });
    const r = api.ensureV2SheetSchema();
    assert(r.ok === false && r.changed === false, "fail no change");
    assert(JSON.stringify(block.data) === before, "unmodified");
    assert(
      ((r.warnings as string[]) || []).some((w) => w.includes("블록")),
      "warning"
    );
  });

  check("10. ensure twice → second changed=false", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, baseSiteHeaders());
    const api = createSandbox(ss, { acquire: true });
    const r1 = api.ensureV2SheetSchema();
    const r2 = api.ensureV2SheetSchema();
    assert(r1.changed === true, "first");
    assert(r2.ok === true && r2.changed === false, "second");
  });

  check("11. 콘텐츠관리 sheet never mutated", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, baseSiteHeaders());
    const content = seedContentManagement(ss);
    const before = JSON.stringify(content.data);
    const api = createSandbox(ss, { acquire: true });
    api.ensureV2SheetSchema();
    assert(JSON.stringify(content.data) === before, "data");
    assert(content.mutations.length === 0, "no mutations");
  });

  check("12. no sample data rows created", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    const api = createSandbox(ss, { acquire: true });
    api.ensureV2SheetSchema();
    assert(ss.getSheetByName("V2_블록관리")!.getLastRow() === 1, "blocks");
    assert(ss.getSheetByName("V2_콘텐츠")!.getLastRow() === 1, "contents");
  });

  check("13. rendererVersion/pageStatus not auto-filled on rows", () => {
    const ss = new MockSpreadsheet();
    const site = seedSiteSheet(ss, baseSiteHeaders(), [
      "L001",
      "Site",
      "Y",
      "#111",
      "#222",
      "#333",
    ]);
    const api = createSandbox(ss, { acquire: true });
    api.ensureV2SheetSchema();
    const map = (api as unknown as { getHeaderIndexMap_: (s: MockSheet) => Record<string, number> })
      .getHeaderIndexMap_(site);
    const rv = map.rendererVersion;
    const ps = map.pageStatus;
    assert(rv !== undefined && ps !== undefined, "cols exist");
    assert(String(site._get(2, rv + 1) || "") === "", "renderer empty");
    assert(String(site._get(2, ps + 1) || "") === "", "pageStatus empty");
  });

  check("14. lock failure → no changes", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, baseSiteHeaders());
    const log = createCallLog();
    const api = createSandbox(ss, { acquire: false }, log);
    const r = api.ensureV2SheetSchema();
    assert(r.ok === false && r.changed === false, "no change");
    assert((r.warnings as string[]).includes("lock_not_acquired"), "warn");
    assert(!ss.getSheetByName("V2_블록관리"), "no block sheet");
    assert(ss.getSheetByName("현장관리")!.headerRow().length === 6, "site untouched");
    assert(log.flushCount === 0, "no flush");
    assert(log.releaseLockCount === 0, "no release without acquire");
  });

  check("15. published read column arrays match sheet headers", () => {
    const readSrc = fs.readFileSync(path.join(APPS, "V2PageReadService.gs"), "utf8");
    assert(
      !/var V2_BLOCK_PUBLIC_COLUMNS\s*=/.test(readSrc),
      "no duplicate block columns in read service"
    );
    assert(
      !/var V2_CONTENT_PUBLIC_COLUMNS\s*=/.test(readSrc),
      "no duplicate content columns in read service"
    );
    assert(
      /V2_BLOCK_PUBLIC_COLUMNS/.test(readSrc) &&
        /V2_CONTENT_PUBLIC_COLUMNS/.test(readSrc),
      "read service still references shared columns"
    );
    assert(BLOCK.length === 18, "block col count");
    assert(CONTENT.length === 21, "content col count");
    assert(BLOCK[0] === "siteCode" && BLOCK[BLOCK.length - 1] === "optionsJson", "block ends");
    assert(
      CONTENT[0] === "siteCode" && CONTENT[CONTENT.length - 1] === "enabled",
      "content ends"
    );
  });

  check("16. doGet/doPost do not auto-call ensure", () => {
    const mainSrc = fs.readFileSync(path.join(APPS, "Main.gs"), "utf8");
    assert(!/ensureV2SheetSchema/.test(mainSrc), "Main has no ensure");
    assert(!/inspectV2SheetSchema/.test(mainSrc), "Main has no inspect");
    const files = fs.readdirSync(APPS).filter((f) => f.endsWith(".gs"));
    for (const f of files) {
      if (f === "V2SheetSchemaService.gs") continue;
      const src = fs.readFileSync(path.join(APPS, f), "utf8");
      assert(
        !/ensureV2SheetSchema\s*\(/.test(src),
        `${f} must not call ensureV2SheetSchema()`
      );
    }
  });

  check("inspect is read-only (no lock/flush/write)", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, baseSiteHeaders());
    const log = createCallLog();
    const api = createSandbox(ss, { acquire: true }, log);
    const before = JSON.stringify([...ss.sheets.entries()].map(([k, v]) => [k, v.data]));
    const r = api.inspectV2SheetSchema();
    const after = JSON.stringify([...ss.sheets.entries()].map(([k, v]) => [k, v.data]));
    assert(r.changed === false, "changed false");
    assert(before === after, "no mutations");
    assert(log.tryLockCount === 0, "no tryLock");
    assert(log.flushCount === 0, "no flush");
    assert(log.releaseLockCount === 0, "no releaseLock");
    assert(
      (r.siteManagement as { missingHeaders: string[] }).missingHeaders.length ===
        SITE_V2.length,
      "reports missing"
    );
  });

  check("17. production source uses getScriptLock (not getDocumentLock)", () => {
    const src = fs.readFileSync(path.join(APPS, "V2SheetSchemaService.gs"), "utf8");
    assert(/LockService\.getScriptLock\s*\(/.test(src), "getScriptLock present");
    assert(!/getDocumentLock/.test(src), "getDocumentLock absent");
  });

  check("18. successful change calls flush before releaseLock", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, baseSiteHeaders());
    const log = createCallLog();
    const api = createSandbox(ss, { acquire: true }, log);
    const r = api.ensureV2SheetSchema();
    assert(r.changed === true, "changed");
    assert(log.flushCount === 1, "flush once");
    const fi = log.events.indexOf("flush");
    const ri = log.events.lastIndexOf("releaseLock");
    assert(fi >= 0 && ri >= 0 && fi < ri, `order flush@${fi} release@${ri}`);
  });

  check("19. changed=false skips flush and extra writes", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    seedV2Sheet(ss, "V2_블록관리", BLOCK);
    seedV2Sheet(ss, "V2_콘텐츠", CONTENT);
    const log = createCallLog();
    const api = createSandbox(ss, { acquire: true }, log);
    const before = JSON.stringify([...ss.sheets.entries()].map(([k, v]) => [k, v.data]));
    const r = api.ensureV2SheetSchema();
    const after = JSON.stringify([...ss.sheets.entries()].map(([k, v]) => [k, v.data]));
    assert(r.changed === false, "unchanged");
    assert(log.flushCount === 0, "no flush");
    assert(before === after, "no writes");
    assert(log.releaseLockCount === 1, "still released");
  });

  check("20. exception during ensure still releases lock", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, [...baseSiteHeaders(), ...SITE_V2]);
    const originalInsert = ss.insertSheet.bind(ss);
    ss.insertSheet = () => {
      throw new Error("simulated sheet failure");
    };
    const log = createCallLog();
    const api = createSandbox(ss, { acquire: true }, log);
    let threw = false;
    try {
      api.ensureV2SheetSchema();
    } catch {
      threw = true;
    }
    assert(threw, "throws");
    assert(log.releaseLockCount === 1, "releaseLock after throw");
    assert(log.flushCount === 0, "no flush on failure");
    ss.insertSheet = originalInsert;
  });

  check("21. production getSpreadsheet_ opens Master when active is null", () => {
    const log = createCallLog();
    const api = loadProductionGetSpreadsheet_(log);
    const opened = api.getSpreadsheet_() as { id: string };
    const masterId = "1rRLKLBIyZPjw1e4a14MPzaTNBib0vTKEpHEqfQg3pyA";
    assert(opened && opened.id === masterId, "returns Master via openById");
    assert(log.openByIdArgs.length === 1 && log.openByIdArgs[0] === masterId, "openById Master");
    assert(log.getActiveCount === 1, "checked active once");
    /** standalone-safe: null active does not block; does not require a bound document */
    const utilsSrc = fs.readFileSync(path.join(APPS, "SheetUtils.gs"), "utf8");
    assert(/SpreadsheetApp\.openById\s*\(/.test(utilsSrc), "production openById");
    assert(/getMasterSpreadsheetId_/.test(utilsSrc), "Master ID helper");
  });

  check("22. ensure second run changed=false (idempotent + no flush)", () => {
    const ss = new MockSpreadsheet();
    seedSiteSheet(ss, baseSiteHeaders());
    const log1 = createCallLog();
    const api1 = createSandbox(ss, { acquire: true }, log1);
    const r1 = api1.ensureV2SheetSchema();
    assert(r1.changed === true && log1.flushCount === 1, "first flush");
    const log2 = createCallLog();
    const api2 = createSandbox(ss, { acquire: true }, log2);
    const r2 = api2.ensureV2SheetSchema();
    assert(r2.ok === true && r2.changed === false, "second unchanged");
    assert(log2.flushCount === 0, "second no flush");
  });

  console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

main();
