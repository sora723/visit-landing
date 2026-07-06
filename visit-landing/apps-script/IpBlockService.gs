/**
 * IP 차단·반복 접수 감지
 * 시트 `_IP차단`에서 수동 차단 IP 관리
 */

var IP_BLOCK_HEADERS = ['siteCode', 'ip', 'memo', 'enabled', 'createdAt'];

function ensureIpBlockSheet_() {
  var sheet = getSheetOptional_(SHEET_NAMES.IP_BLOCK);
  if (!sheet) {
    var ss = getSpreadsheet_();
    sheet = ss.insertSheet(SHEET_NAMES.IP_BLOCK);
    sheet.getRange(1, 1, 1, IP_BLOCK_HEADERS.length).setValues([IP_BLOCK_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  ensureSheetColumnsAfter_(SHEET_NAMES.IP_BLOCK, ['siteCode'], IP_BLOCK_HEADERS);
  return sheet;
}

function runEnsureIpBlockSheet() {
  ensureIpBlockSheet_();
  SpreadsheetApp.getUi().alert('_IP차단 시트가 준비되었습니다.\n\nip · siteCode(비우면 전체) · enabled(Y/N) · memo');
}

function normalizeClientIp_(ip) {
  var raw = String(ip || '').trim();
  if (!raw) return '';
  return raw.split(',')[0].trim();
}

/**
 * _IP차단 시트 — enabled=Y 이고 siteCode 일치(또는 공통)
 */
function isIpBlocked_(ip, siteCode) {
  var normalized = normalizeClientIp_(ip);
  if (!normalized) return false;

  var sheet = getSheetOptional_(SHEET_NAMES.IP_BLOCK);
  if (!sheet) return false;

  var rows = sheetToObjects_(SHEET_NAMES.IP_BLOCK);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (ynToBool_(row.enabled, true) === false) continue;

    var rowIp = normalizeClientIp_(row.ip);
    if (!rowIp || rowIp !== normalized) continue;

    var rowSite = String(row.siteCode || '').trim();
    if (!rowSite || rowSite === siteCode) return true;
  }
  return false;
}

/**
 * 동일 IP 이전 접수 여부 (_검증로그 기준)
 * IP_REPEAT_WINDOW_SECONDS=0 이면 전체 이력
 */
function hasPriorIpSubmission_(ip, siteCode) {
  var normalized = normalizeClientIp_(ip);
  if (!normalized) return false;

  var sheet = getSheetOptional_(SHEET_NAMES.VERIFICATION_LOG);
  if (!sheet) return false;

  var cfg = SUBMIT_VALIDATION_CONFIG;
  var windowMs =
    cfg.IP_REPEAT_WINDOW_SECONDS > 0
      ? cfg.IP_REPEAT_WINDOW_SECONDS * 1000
      : 0;
  var now = Date.now();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var startRow = Math.max(2, lastRow - 1999);
  var width = sheet.getLastColumn();
  var values = sheet.getRange(startRow, 1, lastRow, width).getValues();
  var headers = sheet.getRange(1, 1, 1, width).getValues()[0];
  var ipCol = -1;
  var siteCol = -1;
  var timeCol = -1;
  for (var h = 0; h < headers.length; h++) {
    var label = String(headers[h]).trim();
    if (label === 'ip' || label === 'IP') ipCol = h;
    if (label === 'siteCode' || label === '현장코드') siteCol = h;
    if (label === '기록시간') timeCol = h;
  }
  if (ipCol < 0) return false;

  for (var r = values.length - 1; r >= 0; r--) {
    var rowIp = normalizeClientIp_(values[r][ipCol]);
    if (rowIp !== normalized) continue;

    if (siteCol >= 0) {
      var rowSite = String(values[r][siteCol] || '').trim();
      if (rowSite && rowSite !== siteCode) continue;
    }

    if (windowMs > 0 && timeCol >= 0) {
      var at = values[r][timeCol];
      var date = at instanceof Date ? at : new Date(at);
      if (!isNaN(date.getTime()) && now - date.getTime() > windowMs) continue;
    }

    return true;
  }
  return false;
}

function buildIpSuspicionResult_(reason, elapsed) {
  return buildValidationResult_('허수의심', reason, false, false, elapsed, {
    shouldNotify: false
  });
}
