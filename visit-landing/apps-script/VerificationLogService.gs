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
      payload._skipPendingFlush = true;
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

/**
 * 운영 점검 — 검수중 정체 / 토큰차단 / 알림·접수관리 누락
 * action=audit.verificationLog&stuckMinutes=5&limit=50
 */
function auditVerificationLog_(params) {
  var stuckMinutes = Number((params && params.stuckMinutes) || 5);
  if (!(stuckMinutes > 0)) stuckMinutes = 5;
  var sampleLimit = Number((params && params.limit) || 40);
  if (!(sampleLimit > 0)) sampleLimit = 40;
  if (sampleLimit > 100) sampleLimit = 100;

  ensureVerificationLogSheet_();
  var sheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  var map = getHeaderIndexMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      total: 0,
      byStatus: {},
      stuckPending: [],
      tokenBlocked: { total: 0, withTokenY: 0, withTokenN: 0, samples: [] },
      notifyExpectedMissingSubmission: []
    };
  }

  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();
  var iTime = map['기록시간'];
  var iStatus = map['검증상태'];
  var iReason = map['의심사유'];
  var iId = map.submissionId;
  var iSite = map.siteCode;
  var iName = map['이름'];
  var iPhone = map['연락처'];
  var iToken = map['form_token존재'];

  var byStatus = {};
  var stuckPending = [];
  var tokenBlockedSamples = [];
  var tokenY = 0;
  var tokenN = 0;
  var tokenTotal = 0;
  var finalCandidates = [];
  var now = Date.now();
  var stuckMs = stuckMinutes * 60 * 1000;

  var FINAL_EXPECT_NOTIFY = {
    '정상접수': true,
    '빠른접수': true,
    '허수의심': true,
    '광고신호없음': true,
    '중복접수': true
  };

  for (var i = 0; i < values.length; i++) {
    var status = String(values[i][iStatus] || '').trim();
    byStatus[status || '(empty)'] = (byStatus[status || '(empty)'] || 0) + 1;

    var recorded = iTime !== undefined ? values[i][iTime] : null;
    var t =
      recorded instanceof Date
        ? recorded.getTime()
        : recorded
          ? new Date(recorded).getTime()
          : NaN;
    var ageMs = isNaN(t) ? null : now - t;
    var row = {
      row: i + 2,
      time:
        recorded instanceof Date
          ? recorded.toISOString()
          : String(recorded || ''),
      ageMinutes: ageMs == null ? null : Math.round(ageMs / 60000),
      status: status,
      reason: String(values[i][iReason] || '').trim(),
      submissionId: String(values[i][iId] || '').trim(),
      siteCode: String(values[i][iSite] || '').trim(),
      name: String(values[i][iName] || '').trim(),
      phone: String(values[i][iPhone] || '').trim(),
      formToken: String(values[i][iToken] || '').trim()
    };

    if (status === '검수중' && (ageMs == null || ageMs >= stuckMs)) {
      stuckPending.push(row);
    }

    if (status === '토큰차단') {
      tokenTotal++;
      if (row.formToken === 'Y') tokenY++;
      else tokenN++;
      tokenBlockedSamples.push(row);
    }

    if (FINAL_EXPECT_NOTIFY[status] && row.submissionId) {
      finalCandidates.push(row);
    }
  }

  var submissionIds = loadSubmissionIdSet_();
  var missingSubmission = [];
  for (var j = 0; j < finalCandidates.length; j++) {
    var c = finalCandidates[j];
    if (!submissionIds[c.submissionId]) missingSubmission.push(c);
  }

  var skipLogs = loadRecentSystemLogMatches_([
    'NOTIFICATION_FAIL',
    'SUBMIT_POST_SKIP',
    'POSTPROCESS_PENDING_FAIL',
    'SUBMIT_BLOCKED_EARLY'
  ], sampleLimit);

  return {
    total: values.length,
    stuckMinutes: stuckMinutes,
    byStatus: byStatus,
    stuckPendingCount: stuckPending.length,
    stuckPending: stuckPending.slice(-sampleLimit),
    tokenBlocked: {
      total: tokenTotal,
      withTokenY: tokenY,
      withTokenN: tokenN,
      samples: tokenBlockedSamples.slice(-sampleLimit)
    },
    notifyExpectedMissingSubmissionCount: missingSubmission.length,
    notifyExpectedMissingSubmission: missingSubmission.slice(-sampleLimit),
    systemLogHits: skipLogs
  };
}

function loadSubmissionIdSet_() {
  var out = {};
  var sheet = getSheetOptional_(SHEET_NAMES.SUBMISSION);
  if (!sheet || sheet.getLastRow() < 2) return out;
  var map = getHeaderIndexMap_(sheet);
  var idCol = map.submissionId;
  if (idCol === undefined) idCol = map['접수ID'];
  if (idCol === undefined) idCol = map.id;
  if (idCol === undefined) return out;
  var lastRow = sheet.getLastRow();
  var vals = sheet.getRange(2, idCol + 1, lastRow, idCol + 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var id = String(vals[i][0] || '').trim();
    if (id) out[id] = true;
  }
  return out;
}

function loadRecentSystemLogMatches_(needles, limit) {
  var logName = getLogSheetName_();
  var sheet = getSheetOptional_(logName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var lastRow = sheet.getLastRow();
  var width = Math.min(sheet.getLastColumn(), 8);
  var start = Math.max(2, lastRow - 400);
  var values = sheet.getRange(start, 1, lastRow, width).getValues();
  var hits = [];
  for (var i = values.length - 1; i >= 0 && hits.length < limit; i--) {
    var line = values[i].join('|');
    for (var n = 0; n < needles.length; n++) {
      if (line.indexOf(needles[n]) >= 0) {
        hits.push(values[i].map(function (v) {
          return v instanceof Date ? v.toISOString() : String(v || '');
        }));
        break;
      }
    }
  }
  return hits;
}
