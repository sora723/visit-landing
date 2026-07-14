/**
 * IP 차단 — `_IP차단` 시트 수동 등록만 차단 (자동 IP 반복 차단 없음)
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
  var result = handleSetupIpBlockSheet();
  SpreadsheetApp.getUi().alert(
    '_IP차단 시트가 준비되었습니다.\n\n' +
      (result.created ? '새 탭을 만들었습니다.' : '이미 존재합니다.') +
      '\n\nip · siteCode(비우면 전체) · enabled(Y/N) · memo'
  );
}

function handleSetupIpBlockSheet() {
  var existed = !!getSheetOptional_(SHEET_NAMES.IP_BLOCK);
  ensureIpBlockSheet_();
  return { sheetName: SHEET_NAMES.IP_BLOCK, created: !existed, existed: existed };
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

function buildIpBlockResult_(reason, elapsed) {
  return buildValidationResult_('IP차단', reason, false, false, elapsed, {
    shouldNotify: false
  });
}
