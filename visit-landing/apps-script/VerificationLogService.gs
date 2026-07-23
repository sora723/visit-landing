/**
 * _검증로그 시트 — 관심등록 시도 원장 (접수자 UI에는 미노출)
 * submit 시 먼저 기록 → postProcess에서 검수 결과로 갱신
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

/** submissionId 로 최근 행을 찾아 컬럼 갱신 (postProcess용) */
function updateVerificationLogBySubmissionId_(submissionId, fields) {
  var id = String(submissionId || '').trim();
  if (!id || !fields) return false;

  ensureVerificationLogSheet_();
  var sheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  var map = getHeaderIndexMap_(sheet);
  var idCol = map.submissionId;
  if (idCol === undefined) return false;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var idValues = sheet.getRange(2, idCol + 1, lastRow, idCol + 1).getValues();
  var rowIndex = -1;
  for (var i = idValues.length - 1; i >= 0; i--) {
    if (String(idValues[i][0] || '').trim() === id) {
      rowIndex = i + 2;
      break;
    }
  }
  if (rowIndex < 0) return false;

  Object.keys(fields).forEach(function (header) {
    var col = map[header];
    if (col === undefined) return;
    sheet.getRange(rowIndex, col + 1).setValue(fields[header]);
  });
  return true;
}

function getVerificationLogStatusBySubmissionId_(submissionId) {
  var id = String(submissionId || '').trim();
  if (!id) return '';
  ensureVerificationLogSheet_();
  var sheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  var map = getHeaderIndexMap_(sheet);
  var idCol = map.submissionId;
  var statusCol = map['검증상태'];
  if (idCol === undefined || statusCol === undefined) return '';

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return '';

  var idValues = sheet.getRange(2, idCol + 1, lastRow, idCol + 1).getValues();
  for (var i = idValues.length - 1; i >= 0; i--) {
    if (String(idValues[i][0] || '').trim() === id) {
      return String(sheet.getRange(i + 2, statusCol + 1).getValue() || '').trim();
    }
  }
  return '';
}

/**
 * 검수중 행을 raw_payload 로 postProcess (구 Netlify notify.flush 호환)
 */
function processPendingVerificationLogs_(limit) {
  var max = Number(limit) || 10;
  if (max < 1) max = 10;
  if (max > 20) max = 20;

  ensureVerificationLogSheet_();
  var sheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  var map = getHeaderIndexMap_(sheet);
  var statusCol = map['검증상태'];
  var idCol = map.submissionId;
  var payloadCol = map.raw_payload;
  var timeCol = map['기록시간'];
  if (statusCol === undefined || idCol === undefined || payloadCol === undefined) {
    return { processed: 0, message: 'verification_log_columns_missing' };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { processed: 0, sent: 0, saved: 0, failed: 0 };

  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();
  var processed = 0;
  var sent = 0;
  var saved = 0;
  var failed = 0;

  for (var i = values.length - 1; i >= 0 && processed < max; i--) {
    var status = String(values[i][statusCol] || '').trim();
    if (status !== '검수중') continue;

    var submissionId = String(values[i][idCol] || '').trim();
    var raw = String(values[i][payloadCol] || '').trim();
    if (!submissionId || !raw) {
      failed++;
      processed++;
      continue;
    }

    try {
      var payload = JSON.parse(raw);
      payload.submissionId = submissionId;
      payload.action = 'submit.postProcess';
      if (timeCol !== undefined && values[i][timeCol]) {
        var recorded = values[i][timeCol];
        payload.submittedAt =
          recorded instanceof Date
            ? recorded.toISOString()
            : new Date(recorded).toISOString();
      }
      var result = handleSubmitPostProcess(payload);
      if (result && result.notificationSent) sent++;
      if (result && result.savedToSubmissions) saved++;
      processed++;
    } catch (err) {
      failed++;
      processed++;
      writeLog_(
        'POSTPROCESS_PENDING_FAIL',
        '',
        'submissionId=' + submissionId + ', ' + (err.message || String(err))
      );
    }
  }

  return { processed: processed, sent: sent, saved: saved, failed: failed };
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
