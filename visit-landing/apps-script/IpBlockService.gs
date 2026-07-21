/**
 * IP 차단 — `_IP차단` 시트 (수동 영구 + IP대량차단 자동 24h 임시)
 */

var IP_BLOCK_HEADERS = ['siteCode', 'ip', 'memo', 'enabled', 'createdAt', 'expiresAt'];

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
      '\n\nsiteCode · ip · memo · enabled(Y/N) · createdAt · expiresAt(비우면 영구)'
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

function parseIpBlockDateMs_(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  var parsed = new Date(value);
  return parsed.getTime();
}

function isIpBlockRowActive_(row) {
  if (ynToBool_(row.enabled, true) === false) return false;

  var expiresAt = row.expiresAt || row['만료일시'] || '';
  if (!expiresAt) return true;

  var expiresMs = parseIpBlockDateMs_(expiresAt);
  if (isNaN(expiresMs)) return true;
  return Date.now() <= expiresMs;
}

function ipBlockRowMatchesSite_(rowSite, siteCode) {
  var scoped = String(rowSite || '').trim();
  return !scoped || scoped === siteCode;
}

/**
 * _IP차단 시트 — enabled=Y 이고 siteCode 일치(또는 공통), expiresAt 지나면 무시
 */
function isIpBlocked_(ip, siteCode) {
  var normalized = normalizeClientIp_(ip);
  if (!normalized) return false;

  var sheet = getSheetOptional_(SHEET_NAMES.IP_BLOCK);
  if (!sheet) return false;

  var rows = sheetToObjects_(SHEET_NAMES.IP_BLOCK);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!isIpBlockRowActive_(row)) continue;

    var rowIp = normalizeClientIp_(row.ip);
    if (!rowIp || rowIp !== normalized) continue;

    if (!ipBlockRowMatchesSite_(row.siteCode, siteCode)) continue;
    return true;
  }
  return false;
}

/**
 * IP대량차단 시 _IP차단 에 24h 임시 등록 (수동 영구 차단은 건드리지 않음)
 */
function registerTemporaryIpBlockFromBulk_(ip, siteCode, recentCount, maxCount, windowSeconds) {
  var normalized = normalizeClientIp_(ip);
  var code = String(siteCode || '').trim();
  if (!normalized || !code) return;

  var cfg = SUBMIT_VALIDATION_CONFIG || {};
  var hours = Number(cfg.BULK_IP_AUTO_BLOCK_HOURS);
  if (!hours || hours <= 0) hours = 24;

  ensureIpBlockSheet_();
  var rows = sheetToObjects_(SHEET_NAMES.IP_BLOCK);
  var now = new Date();
  var expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  var memo =
    '자동 24h IP대량차단 bulk_ip:' +
    recentCount +
    '>=' +
    maxCount +
    '/' +
    windowSeconds +
    's';

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (normalizeClientIp_(row.ip) !== normalized) continue;
    if (!ipBlockRowMatchesSite_(row.siteCode, code)) continue;

    var existingExpires = row.expiresAt || row['만료일시'] || '';
    if (!existingExpires) {
      // 수동 영구 차단 — 덮어쓰지 않음
      return;
    }

    var existingMemo = String(row.memo || '').trim();
    if (existingMemo.indexOf('자동') < 0 && existingMemo.indexOf('IP대량차단') < 0) {
      return;
    }

    updateIpBlockRowByIndex_(i + 2, {
      enabled: 'Y',
      memo: memo,
      expiresAt: expiresAt
    });
    writeLog_('IP_BLOCK_AUTO_EXTEND', code, normalized + ' → ' + hours + 'h 연장');
    return;
  }

  appendRowByHeaders_(SHEET_NAMES.IP_BLOCK, {
    siteCode: code,
    ip: normalized,
    memo: memo,
    enabled: 'Y',
    createdAt: now,
    expiresAt: expiresAt
  });
  writeLog_('IP_BLOCK_AUTO_ADD', code, normalized + ' → ' + hours + 'h 임시 등록');
}

function updateIpBlockRowByIndex_(rowIndex, patch) {
  var sheet = getSheet_(SHEET_NAMES.IP_BLOCK);
  var map = getHeaderIndexMap_(sheet);

  Object.keys(patch).forEach(function (header) {
    if (map[header] === undefined) return;
    sheet.getRange(rowIndex, map[header] + 1).setValue(patch[header]);
  });
}

function buildIpBlockResult_(reason, elapsed) {
  return buildValidationResult_('IP차단', reason, false, false, elapsed, {
    shouldNotify: false
  });
}
