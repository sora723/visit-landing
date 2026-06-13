/**
 * SheetUtils.gs
 * 모든 시트 접근은 헤더명(1행) 기준으로만 수행한다. 열 번호 직접 접근 금지.
 */

var SHEET_NAMES = {
  SITE: '현장관리',
  CONTENT: '콘텐츠관리',
  SUBMISSION: '접수관리',
  LOG: '시스템로그',
  LOG_LEGACY: '_시스템로그'
};

/**
 * 스프레드시트 인스턴스 (Apps Script가 바인딩된 시트)
 */
function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * 탭 이름으로 시트 반환
 */
function getSheet_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw createAppError_('INTERNAL_ERROR', '시트를 찾을 수 없습니다: ' + sheetName);
  }
  return sheet;
}

/**
 * 1행 헤더 → { 헤더명: 열인덱스(0-based) } 맵
 */
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
 * 시트 전체를 헤더명 키 객체 배열로 변환 (빈 행 제외)
 */
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
 * 헤더명 기준 단일 필드 읽기
 */
function getField_(row, headerName) {
  if (!row || row[headerName] === undefined || row[headerName] === null) return '';
  return String(row[headerName]).trim();
}

/**
 * 복数 헤더 별칭 — VisitLanding_Master(영문) / 레거시(한글) 호환
 */
function getSiteField_(row, headerNames) {
  var names = headerNames || [];
  for (var i = 0; i < names.length; i++) {
    var v = getField_(row, names[i]);
    if (v !== '') return v;
  }
  return '';
}

/** siteCode / 현장코드 */
function getSiteCodeFromRow_(row) {
  return getSiteField_(row, ['siteCode', '현장코드']);
}

/** 현장명 / siteName */
function getSiteNameFromRow_(row) {
  return getSiteField_(row, ['siteName', '현장명']);
}

/** 담당자 알림 수신 번호 */
function getNotifyPhoneFromRow_(row) {
  return getSiteField_(row, ['notifyPhone', '담당자번호', 'managerPhone']);
}

/** 현장별 접수 Spreadsheet ID */
function getSubmissionSpreadsheetId_(row) {
  return getSiteField_(row, ['submissionSpreadsheetId', '접수스프레드시트ID']);
}

/** 현장 Spreadsheet 내 탭명 (기본: 접수관리) */
function getSubmissionSheetTabName_(row) {
  var name = getSiteField_(row, ['submissionSheetName', '접수시트명', 'submissionSheet']);
  return name || '접수관리';
}

/** @deprecated 동일 Spreadsheet 내 탭 — 레거시 호환 */
function getSubmissionSheetName_(row) {
  return getSubmissionSheetTabName_(row);
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

/**
 * 현장관리 행 필드 업데이트 (siteCode 기준)
 */
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
      if (col >= 0) {
        data[r][col] = updates[field];
      }
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

/**
 * 현장 접수 가능 여부
 * - 레거시: 운영상태=ACTIVE + 관심등록사용
 * - VisitLanding: isActive=Y
 */
function isSiteSubmissionEnabled_(siteRow) {
  var legacyStatus = getField_(siteRow, '운영상태');
  if (legacyStatus) {
    if (legacyStatus !== 'ACTIVE') return false;
    return ynToBool_(getField_(siteRow, '관심등록사용'), true);
  }
  return ynToBool_(getField_(siteRow, 'isActive'), true);
}

function getDuplicateBlockMinutes_(siteRow) {
  var v = getSiteField_(siteRow, ['duplicateBlockMinutes', '중복접수차단분']);
  return Number(v) || 120;
}

/**
 * 탭 이름으로 시트 반환 (없으면 null)
 */
function getSheetOptional_(sheetName) {
  var name = String(sheetName || '').trim();
  if (!name) return null;
  return getSpreadsheet_().getSheetByName(name);
}

/**
 * 현장코드로 현장관리 1행 조회
 */
function findSiteByCode_(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) return null;
  var rows = sheetToObjects_(SHEET_NAMES.SITE);
  for (var i = 0; i < rows.length; i++) {
    if (getSiteCodeFromRow_(rows[i]) === code) return rows[i];
  }
  return null;
}

/**
 * 현장코드로 콘텐츠관리 행 목록 조회
 */
function findContentBySiteCode_(siteCode) {
  var code = String(siteCode || '').trim();
  var rows = sheetToObjects_(SHEET_NAMES.CONTENT);
  return rows.filter(function (row) {
    return getSiteField_(row, ['siteCode', '현장코드']) === code;
  });
}

/**
 * 헤더명 기준으로 시트에 1행 추가 (열 번호 직접 접근 금지)
 * @param {string} sheetName
 * @param {Object} rowData - { 헤더명: 값 }
 */
function appendRowByHeaders_(sheetName, rowData) {
  var sheet = getSheet_(sheetName);
  appendRowToSheet_(sheet, rowData);
}

/**
 * 시트 객체에 헤더명 기준 1행 추가
 */
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
    newRow.push(value !== undefined && value !== null ? value : '');
  }

  sheet.appendRow(newRow);
}

/**
 * _시스템로그 — 일반 기록 (site.get, auth 등)
 */
function writeLog_(action, siteCode, message) {
  try {
    appendRowByHeaders_(getLogSheetName_(), {
      // VisitLanding 시스템로그 (영문)
      'occurredAt': new Date(),
      'action': action,
      'siteCode': siteCode || '',
      'provider': '',
      'recipientPhone': '',
      'errorMessage': '',
      'payload': '',
      'message': message || '',
      // 레거시 _시스템로그 (한글)
      '발생일시': new Date(),
      '액션': action,
      '현장코드': siteCode || '',
      '수신번호': '',
      '오류메시지': '',
      '메시지': message || ''
    });
  } catch (e) {
    Logger.log('로그 기록 실패: ' + e.message);
  }
}

/**
 * _시스템로그 — 알림 발송 실패 기록
 * 접수 성공 여부와 무관하게 호출됨
 *
 * @param {Object} params
 * @param {NotificationPayload} params.payload
 * @param {string} params.providerId
 * @param {string} params.errorMessage
 */
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
      'message': '',
      '발생일시': new Date(),
      '액션': 'NOTIFICATION_FAIL',
      '현장코드': notification.siteCode || '',
      '수신번호': notification.recipientPhone || '',
      '오류메시지': params.errorMessage || '',
      '메시지': ''
    });
  } catch (e) {
    Logger.log('알림 실패 로그 기록 실패: ' + e.message);
  }
}

/**
 * 로그용 payload — 민감 정보 그대로 저장 (운영 추적용)
 * 고객 연락처는 접수 알림 맥락이므로 payload에 포함
 */
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

/**
 * 앱 공통 에러 객체
 */
function createAppError_(code, message) {
  var err = new Error(message);
  err.code = code;
  return err;
}
