/**
 * SheetUtils.gs
 * VisitLanding_Master Sheet 접근 (헤더명 1행 기준, 열 번호 직접 접근 금지)
 */

var SHEET_NAMES = {
  SITE: '현장관리',
  CONTENT: '콘텐츠관리',
  SUBMISSION: '접수관리',
  VERIFICATION_LOG: '_검증로그',
  IP_BLOCK: '_IP차단',
  NOTIFY_QUEUE: '_알림큐',
  LOG: '시스템로그',
  LOG_LEGACY: '_시스템로그'
};

/** VisitLanding_Master — config/master-sheet.json 과 동일 */
var MASTER_SPREADSHEET_ID = '1rRLKLBIyZPjw1e4a14MPzaTNBib0vTKEpHEqfQg3pyA';

function getMasterSpreadsheetId_() {
  var fromProps = PropertiesService.getScriptProperties().getProperty('MASTER_SPREADSHEET_ID');
  return String(fromProps || MASTER_SPREADSHEET_ID).trim();
}

function getSpreadsheet_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  var id = getMasterSpreadsheetId_();
  if (!id) {
    throw createAppError_(
      'INTERNAL_ERROR',
      'Spreadsheet를 열 수 없습니다. 시트를 연 뒤 실행하거나 MASTER_SPREADSHEET_ID를 설정하세요.'
    );
  }
  return SpreadsheetApp.openById(id);
}

function getSheet_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw createAppError_('INTERNAL_ERROR', '시트를 찾을 수 없습니다: ' + sheetName);
  }
  return sheet;
}

function getSheetOptional_(sheetName) {
  var name = String(sheetName || '').trim();
  if (!name) return null;
  return getSpreadsheet_().getSheetByName(name);
}

function getHeaderIndexMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim();
    if (h) map[h] = i;
  }
  return map;
}

/**
 * 시트에 컬럼이 없으면 anchor 뒤에 순서대로 추가
 * anchorAliases: ['isActive', '활성여부', ...] — 없으면 맨 뒤에 추가
 */
function ensureSheetColumnsAfter_(sheetName, anchorAliases, columnHeaders) {
  var sheet = getSheet_(sheetName);
  var added = [];
  var map = getHeaderIndexMap_(sheet);
  var anchor = null;

  for (var a = 0; a < anchorAliases.length; a++) {
    if (map[anchorAliases[a]] !== undefined) {
      anchor = anchorAliases[a];
      break;
    }
  }

  if (!anchor) {
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var lastHeader = String(sheet.getRange(1, lastCol).getValue() || '').trim();
    if (lastHeader) anchor = lastHeader;
  }

  for (var i = 0; i < columnHeaders.length; i++) {
    var header = columnHeaders[i];
    map = getHeaderIndexMap_(sheet);
    if (map[header] !== undefined) continue;

    if (anchor && map[anchor] !== undefined) {
      var afterCol = map[anchor];
      sheet.insertColumnAfter(afterCol + 1);
      sheet.getRange(1, afterCol + 2).setValue(header);
    } else {
      var endCol = Math.max(sheet.getLastColumn(), 1);
      sheet.insertColumnAfter(endCol);
      sheet.getRange(1, endCol + 1).setValue(header);
    }

    anchor = header;
    added.push(header);
    writeLog_('COLUMN_ADD', '', sheetName + '.' + header + ' 컬럼 추가');
  }

  return {
    ok: true,
    added: added.length > 0,
    addedColumns: added,
    message: added.length
      ? sheetName + ' 컬럼 추가: ' + added.join(', ')
      : sheetName + ' 컬럼 이미 존재 (' + columnHeaders.join(', ') + ')'
  };
}

function sheetToObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function (h) { return String(h).trim(); });
  var rows = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var isEmpty = true;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;

    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      if (headers[i]) obj[headers[i]] = row[i];
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * 시트 최근 maxRows 행만 객체로 읽기 (검증 스캔용 — 전체 getDataRange 금지)
 */
function readRecentSheetObjects_(sheetName, maxRows) {
  var sheet = getSheetOptional_(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];

  var limit = Math.max(1, Number(maxRows) || 400);
  var startRow = Math.max(2, lastRow - limit + 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim();
  });
  var values = sheet.getRange(startRow, 1, lastRow, lastCol).getValues();
  var rows = [];

  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var isEmpty = true;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;

    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      if (headers[i]) obj[headers[i]] = row[i];
    }
    rows.push(obj);
  }
  return rows;
}

function getField_(row, headerName) {
  if (!row || row[headerName] === undefined || row[headerName] === null) return '';
  return String(row[headerName]).trim();
}

/** 영문 / 한글 헤더 별칭 */
function getSiteField_(row, headerNames) {
  var names = headerNames || [];
  for (var i = 0; i < names.length; i++) {
    var v = getField_(row, names[i]);
    if (v !== '') return v;
  }
  return '';
}

function getSiteCodeFromRow_(row) {
  return getSiteField_(row, ['siteCode', '현장코드']);
}

function getSiteNameFromRow_(row) {
  return getSiteField_(row, ['siteName', '현장명']);
}

function getNotifyPhoneFromRow_(row) {
  return normalizeMobilePhone_(
    getSiteField_(row, [
      'notifyPhone',
      'notificationPhone',
      '알림수신번호',
      '담당자번호',
      'managerPhone'
    ])
  ) || normalizePhone_(
    getSiteField_(row, [
      'notifyPhone',
      'notificationPhone',
      '알림수신번호',
      '담당자번호',
      'managerPhone'
    ])
  );
}

function getSubmissionSpreadsheetId_(row) {
  return getSiteField_(row, ['submissionSpreadsheetId', '접수스프레드시트ID']);
}

/** Spreadsheet 파일명 (운영자 식별·공유용) — 예: L001_접수_더블역세권 */
function getSubmissionSpreadsheetName_(row) {
  return getSiteField_(row, ['submissionSpreadsheetName', '접수스프레드시트명']);
}

function getSubmissionSheetTabName_(row) {
  var name = getSiteField_(row, ['submissionSheetName', '접수시트명']);
  return name || '접수관리';
}

function openSpreadsheetByIdOptional_(spreadsheetId) {
  var id = String(spreadsheetId || '').trim();
  if (!id) return null;
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    return null;
  }
}

function getSheetInSpreadsheetOptional_(spreadsheet, sheetName) {
  if (!spreadsheet) return null;
  var name = String(sheetName || '').trim();
  if (!name) return null;
  return spreadsheet.getSheetByName(name);
}

function updateSiteFieldsByCode_(siteCode, updates) {
  var code = String(siteCode || '').trim();
  var sheet = getSheet_(SHEET_NAMES.SITE);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    throw createAppError_('SITE_NOT_FOUND', '현장관리 데이터 없음');
  }

  var headers = data[0].map(function (h) { return String(h).trim(); });
  var codeCol = -1;
  for (var h = 0; h < headers.length; h++) {
    if (headers[h] === 'siteCode' || headers[h] === '현장코드') {
      codeCol = h;
      break;
    }
  }
  if (codeCol < 0) {
    throw createAppError_('INTERNAL_ERROR', 'siteCode 컬럼 없음');
  }

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][codeCol]).trim() !== code) continue;

    Object.keys(updates || {}).forEach(function (field) {
      var col = headers.indexOf(field);
      if (col >= 0) data[r][col] = updates[field];
    });

    var updatedCol = headers.indexOf('updatedAt');
    if (updatedCol >= 0) {
      data[r][updatedCol] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }

    sheet.getRange(1, 1, data.length, headers.length).setValues(data);
    return true;
  }

  throw createAppError_('SITE_NOT_FOUND', '현장 없음: ' + code);
}

function getLogSheetName_() {
  var ss = getSpreadsheet_();
  if (ss.getSheetByName(SHEET_NAMES.LOG)) return SHEET_NAMES.LOG;
  if (ss.getSheetByName(SHEET_NAMES.LOG_LEGACY)) return SHEET_NAMES.LOG_LEGACY;
  return SHEET_NAMES.LOG;
}

function isSiteSubmissionEnabled_(siteRow) {
  return ynToBool_(getField_(siteRow, 'isActive'), true);
}

function getDuplicateBlockMinutes_(siteRow) {
  var v = getSiteField_(siteRow, ['duplicateBlockMinutes', '중복접수차단분']);
  return Number(v) || 120;
}

function findSiteByCode_(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) return null;
  var rows = sheetToObjects_(SHEET_NAMES.SITE);
  for (var i = 0; i < rows.length; i++) {
    if (getSiteCodeFromRow_(rows[i]) === code) return rows[i];
  }
  return null;
}

function appendRowByHeaders_(sheetName, rowData) {
  appendRowToSheet_(getSheet_(sheetName), rowData);
}

function appendRowToSheet_(sheet, rowData) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw createAppError_('INTERNAL_ERROR', '시트 헤더가 없습니다: ' + sheet.getName());
  }

  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var newRow = [];

  for (var i = 0; i < headerRow.length; i++) {
    var header = String(headerRow[i]).trim();
    if (!header) {
      newRow.push('');
      continue;
    }
    var value = rowData[header];
    if (value === undefined || value === null) {
      newRow.push('');
      continue;
    }
    /** 연락처 열은 텍스트로 강제 — Sheets 숫자 변환으로 앞자리 0 유실 방지 */
    if (isPhoneHeader_(header)) {
      newRow.push(toSheetPhoneText_(value));
    } else {
      newRow.push(value);
    }
  }

  sheet.appendRow(newRow);
}

/** 휴대폰 정규화: 10xxxxxxxx → 010xxxxxxxx, 이미 010이면 유지 */
function normalizeMobilePhone_(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (/^010\d{8}$/.test(digits)) return digits;
  if (/^10\d{8}$/.test(digits)) return '0' + digits;
  return '';
}

function normalizePhone_(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isPhoneHeader_(header) {
  var h = String(header || '').trim();
  return (
    h === 'phone' ||
    h === '연락처' ||
    h === '정규화연락처' ||
    h === 'notifyPhone' ||
    h === 'notificationPhone' ||
    h === 'managerPhone' ||
    h === '담당자번호' ||
    h === '알림수신번호' ||
    h === 'recipientPhone'
  );
}

/** Sheets에 숫자로 들어가지 않도록 텍스트 강제 (' 접두) */
function toSheetPhoneText_(phone) {
  var normalized = normalizeMobilePhone_(phone) || normalizePhone_(phone);
  if (!normalized) return '';
  return "'" + normalized;
}

function writeLog_(action, siteCode, message) {
  try {
    appendRowByHeaders_(getLogSheetName_(), {
      'occurredAt': new Date(),
      'action': action,
      'siteCode': siteCode || '',
      'provider': '',
      'recipientPhone': '',
      'errorMessage': '',
      'payload': '',
      'message': message || ''
    });
  } catch (e) {
    Logger.log('로그 기록 실패: ' + e.message);
  }
}

function writeNotificationFailureLog_(params) {
  try {
    var notification = params.payload || {};
    appendRowByHeaders_(getLogSheetName_(), {
      'occurredAt': new Date(),
      'action': 'NOTIFICATION_FAIL',
      'siteCode': notification.siteCode || '',
      'provider': params.providerId || '',
      'recipientPhone': notification.recipientPhone || '',
      'errorMessage': params.errorMessage || '',
      'payload': JSON.stringify(sanitizeNotificationPayloadForLog_(notification)),
      'message': ''
    });
  } catch (e) {
    Logger.log('알림 실패 로그 기록 실패: ' + e.message);
  }
}

function sanitizeNotificationPayloadForLog_(payload) {
  return {
    type: payload.type || '',
    siteCode: payload.siteCode || '',
    siteName: payload.siteName || '',
    recipientPhone: payload.recipientPhone || '',
    customerName: payload.customerName || '',
    customerPhone: payload.customerPhone || '',
    consultType: payload.consultType || '',
    reserveDisplay: payload.reserveDisplay || '',
    isTest: payload.isTest === true
  };
}

function ynToBool_(value, defaultVal) {
  if (value === '' || value === null || value === undefined) return defaultVal === true;
  return String(value).trim().toUpperCase() === 'Y';
}

function createAppError_(code, message) {
  var err = new Error(message);
  err.code = code;
  return err;
}
