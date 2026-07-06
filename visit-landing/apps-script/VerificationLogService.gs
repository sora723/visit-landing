/**
 * _검증로그 시트 — 의심·차단 접수 전용 (접수자 UI에는 미노출)
 */

var VERIFICATION_LOG_HEADERS = [
  '기록시간',
  '검증상태',
  '의심사유',
  '네이버전환대상여부',
  'submissionId',
  'siteCode',
  'ip',
  '이름',
  '연락처',
  '정규화연락처',
  '관심타입',
  '방문예약일시',
  'NaPm',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'referrer',
  'landing_url',
  'form_token존재',
  'elapsed_seconds',
  'input_focus_count',
  'input_change_count',
  'click_count',
  'scroll_depth',
  'first_input_at',
  'last_input_at',
  'user_agent',
  'screen_width',
  'screen_height',
  'timezone',
  'language',
  'raw_payload'
];

function ensureVerificationLogSheet_() {
  var sheet = getSheetOptional_(SHEET_NAMES.VERIFICATION_LOG);
  if (!sheet) {
    var ss = getSpreadsheet_();
    sheet = ss.insertSheet(SHEET_NAMES.VERIFICATION_LOG);
    sheet.getRange(1, 1, 1, VERIFICATION_LOG_HEADERS.length).setValues([VERIFICATION_LOG_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  ensureSheetColumnsAfter_(SHEET_NAMES.VERIFICATION_LOG, ['기록시간'], VERIFICATION_LOG_HEADERS);
  return sheet;
}

function appendVerificationLogRow_(row) {
  ensureVerificationLogSheet_();
  appendRowByHeaders_(SHEET_NAMES.VERIFICATION_LOG, row);
}

function buildVerificationLogRow_(ctx) {
  var params = ctx.rawParams || {};
  var data = ctx.validated || {};
  var reserveDisplay = [data.reserveDate, data.reserveTime].filter(Boolean).join(' ');

  return {
    '기록시간': ctx.submittedAt || new Date(),
    '검증상태': ctx.validationStatus || '',
    '의심사유': ctx.suspicionReasons || '',
    '네이버전환대상여부': ctx.allowConversion ? 'Y' : 'N',
    'submissionId': ctx.submissionId || '',
    'siteCode': ctx.siteCode || '',
    'ip': normalizeClientIp_(params.clientIp || ctx.clientIp || ''),
    '이름': data.name || '',
    '연락처': String(params.phone || data.phone || ''),
    '정규화연락처': data.phone || '',
    '관심타입': data.consultType || '',
    '방문예약일시': reserveDisplay,
    'NaPm': String(params.napm || params.NaPm || '').trim(),
    'utm_source': String(params.utmSource || params.utm_source || '').trim(),
    'utm_medium': String(params.utmMedium || params.utm_medium || '').trim(),
    'utm_campaign': String(params.utmCampaign || params.utm_campaign || '').trim(),
    'utm_content': String(params.utmContent || params.utm_content || '').trim(),
    'referrer': String(params.referer || '').trim(),
    'landing_url': String(params.landingUrl || params.sourceUrl || '').trim(),
    'form_token존재': String(params.formToken || '').trim() ? 'Y' : 'N',
    'elapsed_seconds': ctx.elapsedSeconds != null ? ctx.elapsedSeconds : '',
    'input_focus_count': numOrBlank_(params.inputFocusCount),
    'input_change_count': numOrBlank_(params.inputChangeCount),
    'click_count': numOrBlank_(params.clickCount),
    'scroll_depth': numOrBlank_(params.scrollDepth),
    'first_input_at': numOrBlank_(params.firstInputAt),
    'last_input_at': numOrBlank_(params.lastInputAt),
    'user_agent': String(params.userAgent || '').trim(),
    'screen_width': numOrBlank_(params.screenWidth),
    'screen_height': numOrBlank_(params.screenHeight),
    'timezone': String(params.timezone || '').trim(),
    'language': String(params.language || '').trim(),
    'raw_payload': JSON.stringify(params).slice(0, 45000)
  };
}

function numOrBlank_(value) {
  if (value === '' || value === null || value === undefined) return '';
  var n = Number(value);
  return isNaN(n) ? '' : n;
}
