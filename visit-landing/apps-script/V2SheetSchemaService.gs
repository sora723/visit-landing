/**
 * V2SheetSchemaService.gs
 * V2 Sheet 구조 점검·생성 (idempotent, 수동 실행 전용)
 *
 * 편집기에서만 실행:
 *   inspectV2SheetSchema()
 *   ensureV2SheetSchema()
 *
 * doGet/doPost·공개 API에서 자동 호출하지 않음.
 * 기존 데이터 삭제·재배열·샘플 행 추가 금지.
 */

/** V2_블록관리 헤더 = 공개 읽기 컬럼 (V2PageReadService와 단일 정의) */
var V2_BLOCK_PUBLIC_COLUMNS = [
  'siteCode',
  'revisionId',
  'sectionId',
  'sectionOrder',
  'componentType',
  'variant',
  'contentGroup',
  'enabled',
  'desktopVisible',
  'mobileVisible',
  'backgroundType',
  'backgroundColor',
  'backgroundPc',
  'backgroundMobile',
  'themeVariant',
  'paddingPreset',
  'animationPreset',
  'optionsJson'
];

/** V2_콘텐츠 헤더 = 공개 읽기 컬럼 */
var V2_CONTENT_PUBLIC_COLUMNS = [
  'siteCode',
  'revisionId',
  'contentGroup',
  'itemId',
  'itemOrder',
  'role',
  'eyebrow',
  'title',
  'subtitle',
  'description',
  'value',
  'badge',
  'icon',
  'imagePc',
  'imageMobile',
  'videoUrl',
  'actionType',
  'actionLabel',
  'actionValue',
  'extraJson',
  'enabled'
];

/** 현장관리에 추가할 V2 컬럼 (기존 mainColor/subColor/accentColor 제외) */
var V2_SITE_MANAGEMENT_COLUMNS = [
  'rendererVersion',
  'pageStatus',
  'pageSchemaVersion',
  'publishedRevisionId',
  'draftRevisionId',
  'templateId',
  'themePreset',
  'surfaceColor',
  'textColor',
  'radiusPreset',
  'spacingPreset',
  'seoTitle',
  'seoDescription',
  'ogImage',
  'faviconUrl'
];

/**
 * 읽기 전용 구조 점검. Sheet를 생성·수정하지 않음.
 */
function inspectV2SheetSchema() {
  return inspectV2SheetSchema_();
}

/**
 * 누락 구조만 추가. 여러 번 실행해도 동일. 수동 실행 전용.
 */
function ensureV2SheetSchema() {
  return ensureV2SheetSchema_();
}

function inspectV2SheetSchema_() {
  var siteSheet = getSheetOptional_(SHEET_NAMES.SITE);
  var blockSheet = getSheetOptional_(SHEET_NAMES.V2_BLOCK);
  var contentSheet = getSheetOptional_(SHEET_NAMES.V2_CONTENT);

  var siteInfo = inspectSiteManagementV2Columns_(siteSheet);
  var blocksInfo = inspectV2DataSheet_(blockSheet, V2_BLOCK_PUBLIC_COLUMNS);
  var contentsInfo = inspectV2DataSheet_(contentSheet, V2_CONTENT_PUBLIC_COLUMNS);

  var warnings = [];
  var ok = true;

  if (!siteSheet) {
    ok = false;
    warnings.push('site management sheet missing');
  }
  if (blocksInfo.headerConflict) {
    ok = false;
    warnings.push('V2_블록관리 header conflict');
  }
  if (contentsInfo.headerConflict) {
    ok = false;
    warnings.push('V2_콘텐츠 header conflict');
  }

  return {
    ok: ok,
    changed: false,
    siteManagement: {
      missingHeaders: siteInfo.missingHeaders.slice(),
      addedHeaders: []
    },
    sheets: {
      blocks: {
        exists: !!blockSheet,
        created: false,
        headerValid: blocksInfo.headerValid
      },
      contents: {
        exists: !!contentSheet,
        created: false,
        headerValid: contentsInfo.headerValid
      }
    },
    warnings: warnings
  };
}

function ensureV2SheetSchema_() {
  var lock = LockService.getDocumentLock();
  var locked = false;
  try {
    locked = lock.tryLock(10000);
  } catch (e) {
    locked = false;
  }
  if (!locked) {
    return {
      ok: false,
      changed: false,
      siteManagement: { missingHeaders: [], addedHeaders: [] },
      sheets: {
        blocks: { exists: false, created: false, headerValid: false },
        contents: { exists: false, created: false, headerValid: false }
      },
      warnings: ['lock_not_acquired']
    };
  }

  try {
    return ensureV2SheetSchemaUnlocked_();
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {
      // ignore
    }
  }
}

function ensureV2SheetSchemaUnlocked_() {
  var siteSheet = getSheetOptional_(SHEET_NAMES.SITE);
  if (!siteSheet) {
    return {
      ok: false,
      changed: false,
      siteManagement: { missingHeaders: [], addedHeaders: [] },
      sheets: {
        blocks: { exists: false, created: false, headerValid: false },
        contents: { exists: false, created: false, headerValid: false }
      },
      warnings: ['site_management_sheet_missing']
    };
  }

  var blockSheet = getSheetOptional_(SHEET_NAMES.V2_BLOCK);
  var contentSheet = getSheetOptional_(SHEET_NAMES.V2_CONTENT);

  var sitePlan = inspectSiteManagementV2Columns_(siteSheet);
  var blocksPlan = inspectV2DataSheet_(blockSheet, V2_BLOCK_PUBLIC_COLUMNS);
  var contentsPlan = inspectV2DataSheet_(contentSheet, V2_CONTENT_PUBLIC_COLUMNS);

  /** 위험한 헤더 불일치 — 변경 시작 전 실패 */
  if (blocksPlan.headerConflict || contentsPlan.headerConflict) {
    var conflictWarnings = [];
    if (blocksPlan.headerConflict) conflictWarnings.push('V2_블록관리 header conflict');
    if (contentsPlan.headerConflict) conflictWarnings.push('V2_콘텐츠 header conflict');
    return {
      ok: false,
      changed: false,
      siteManagement: {
        missingHeaders: sitePlan.missingHeaders.slice(),
        addedHeaders: []
      },
      sheets: {
        blocks: {
          exists: !!blockSheet,
          created: false,
          headerValid: blocksPlan.headerValid
        },
        contents: {
          exists: !!contentSheet,
          created: false,
          headerValid: contentsPlan.headerValid
        }
      },
      warnings: conflictWarnings
    };
  }

  var changed = false;
  var addedHeaders = [];
  var blocksCreated = false;
  var contentsCreated = false;

  if (sitePlan.missingHeaders.length > 0) {
    appendMissingHeadersAtEnd_(siteSheet, sitePlan.missingHeaders);
    addedHeaders = sitePlan.missingHeaders.slice();
    changed = true;
  }

  if (!blockSheet) {
    blockSheet = createV2SheetWithHeaders_(
      SHEET_NAMES.V2_BLOCK,
      V2_BLOCK_PUBLIC_COLUMNS
    );
    blocksCreated = true;
    changed = true;
  } else if (blocksPlan.needsHeaderWrite) {
    writeV2SheetHeaders_(blockSheet, V2_BLOCK_PUBLIC_COLUMNS);
    changed = true;
  }

  if (!contentSheet) {
    contentSheet = createV2SheetWithHeaders_(
      SHEET_NAMES.V2_CONTENT,
      V2_CONTENT_PUBLIC_COLUMNS
    );
    contentsCreated = true;
    changed = true;
  } else if (contentsPlan.needsHeaderWrite) {
    writeV2SheetHeaders_(contentSheet, V2_CONTENT_PUBLIC_COLUMNS);
    changed = true;
  }

  return {
    ok: true,
    changed: changed,
    siteManagement: {
      missingHeaders: [],
      addedHeaders: addedHeaders
    },
    sheets: {
      blocks: {
        exists: true,
        created: blocksCreated,
        headerValid: true
      },
      contents: {
        exists: true,
        created: contentsCreated,
        headerValid: true
      }
    },
    warnings: []
  };
}

function inspectSiteManagementV2Columns_(siteSheet) {
  if (!siteSheet) {
    return { missingHeaders: V2_SITE_MANAGEMENT_COLUMNS.slice() };
  }
  var map = getHeaderIndexMap_(siteSheet);
  var missing = [];
  for (var i = 0; i < V2_SITE_MANAGEMENT_COLUMNS.length; i++) {
    var h = V2_SITE_MANAGEMENT_COLUMNS[i];
    if (map[h] === undefined) missing.push(h);
  }
  return { missingHeaders: missing };
}

/**
 * @returns {{
 *   headerValid: boolean,
 *   headerConflict: boolean,
 *   needsHeaderWrite: boolean
 * }}
 */
function inspectV2DataSheet_(sheet, expectedHeaders) {
  if (!sheet) {
    return {
      headerValid: false,
      headerConflict: false,
      needsHeaderWrite: false
    };
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 1 || lastCol < 1) {
    return {
      headerValid: false,
      headerConflict: false,
      needsHeaderWrite: true
    };
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });

  /** trailing empty header cells 제거 */
  while (headers.length && headers[headers.length - 1] === '') {
    headers.pop();
  }

  var exact = headersLengthAndEqual_(headers, expectedHeaders);

  if (exact) {
    return {
      headerValid: true,
      headerConflict: false,
      needsHeaderWrite: false
    };
  }

  /** 데이터 행이 있거나(비어 있지 않은 헤더 행만) 잘못된 헤더 → 충돌 */
  if (lastRow >= 1) {
    var hasAnyHeader = false;
    for (var i = 0; i < headers.length; i++) {
      if (headers[i]) {
        hasAnyHeader = true;
        break;
      }
    }
    if (hasAnyHeader || lastRow > 1) {
      return {
        headerValid: false,
        headerConflict: true,
        needsHeaderWrite: false
      };
    }
  }

  return {
    headerValid: false,
    headerConflict: false,
    needsHeaderWrite: true
  };
}

function headersLengthAndEqual_(actual, expected) {
  if (actual.length !== expected.length) return false;
  for (var i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) return false;
  }
  return true;
}

function appendMissingHeadersAtEnd_(sheet, missingHeaders) {
  if (!missingHeaders || !missingHeaders.length) return;
  var lastCol = Math.max(sheet.getLastColumn(), 0);
  for (var i = 0; i < missingHeaders.length; i++) {
    var col = lastCol + 1 + i;
    sheet.getRange(1, col).setValue(missingHeaders[i]);
  }
}

function createV2SheetWithHeaders_(sheetName, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.insertSheet(sheetName);
  writeV2SheetHeaders_(sheet, headers);
  return sheet;
}

function writeV2SheetHeaders_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}
