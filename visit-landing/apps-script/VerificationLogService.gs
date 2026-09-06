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

/**
 * 순간 장애(솔라피 등)로 _검증로그에는 있으나 접수관리 시트에 등록되지 않은 건 복구
 * 1) _검증로그 기준 누락 건 탐색
 * 2) 제외할 submissionId 필터링 (옵션: excludeSubmissionIds)
 * 3) 알림톡 발송 (sendNotification: true 일 때만)
 * 4) 접수관리 및 현장별 미러 시트에 행 추가
 */
var KNOWN_EXCLUDED_SUBMISSION_IDS = {
  '8bfae10f-ccbd-4f9a-a87b-f714144550b2': true, // 유석희 님 (관리자 수동 처리 완료)
  '709a0ffa-33ae-465d-b063-fb71112586b1': true  // 레거시 테스트 건
};

function handleReprocessMissedSubmissions(params) {
  var p = params || {};
  var maxLimit = Number(p.limit) || 20;
  if (maxLimit < 1) maxLimit = 20;
  if (maxLimit > 50) maxLimit = 50;

  var sendNotification = p.sendNotification !== false && p.sendNotification !== 'false' && p.sendNotification !== 'N';
  var excludeList = [];
  if (Array.isArray(p.excludeSubmissionIds)) {
    excludeList = p.excludeSubmissionIds.map(function (id) { return String(id || '').trim(); });
  } else if (typeof p.excludeSubmissionIds === 'string' && p.excludeSubmissionIds.trim()) {
    excludeList = p.excludeSubmissionIds.split(',').map(function (id) { return id.trim(); });
  }

  var excludeMap = {};
  Object.keys(KNOWN_EXCLUDED_SUBMISSION_IDS).forEach(function (k) {
    excludeMap[k] = true;
  });
  for (var e = 0; e < excludeList.length; e++) {
    if (excludeList[e]) excludeMap[excludeList[e]] = true;
  }

  ensureVerificationLogSheet_();
  var sheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  var map = getHeaderIndexMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, processedCount: 0, recovered: [], message: '_검증로그에 데이터가 없습니다.' };
  }

  var iStatus = map['검증상태'];
  var iId = map.submissionId;
  var iPayload = map.raw_payload;
  var iTime = map['기록시간'];
  var iSite = map.siteCode;
  var iReason = map['의심사유'];

  if (iStatus === undefined || iId === undefined) {
    return { success: false, error: '_검증로그 필수 컬럼(검증상태, submissionId)이 없습니다.' };
  }

  var FINAL_EXPECT_NOTIFY = {
    '정상접수': true,
    '빠른접수': true,
    '허수의심': true,
    '광고신호없음': true,
    '중복접수': true
  };

  var submissionIds = loadSubmissionIdSet_();
  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();

  var recovered = [];
  var skipped = [];

  for (var i = values.length - 1; i >= 0 && recovered.length < maxLimit; i--) {
    var row = values[i];
    var status = String(row[iStatus] || '').trim();
    var submissionId = String(row[iId] || '').trim();

    if (!submissionId) continue;
    if (!FINAL_EXPECT_NOTIFY[status]) continue;

    // 이미 접수관리에 있는 경우 스킵
    if (submissionIds[submissionId]) continue;

    // 명시적 제외 대상 스킵
    if (excludeMap[submissionId]) {
      skipped.push({ submissionId: submissionId, reason: 'EXCLUDED_BY_USER' });
      continue;
    }

    var raw = iPayload !== undefined ? String(row[iPayload] || '').trim() : '';
    if (!raw) {
      skipped.push({ submissionId: submissionId, reason: 'NO_RAW_PAYLOAD' });
      continue;
    }

    try {
      var rawPayload = JSON.parse(raw);
      var siteCode = String((iSite !== undefined && row[iSite]) || rawPayload.siteCode || '').trim();
      var siteRow = findSiteByCode_(siteCode);
      if (!siteRow) {
        skipped.push({ submissionId: submissionId, siteCode: siteCode, reason: 'SITE_NOT_FOUND' });
        continue;
      }

      var formType = getField_(siteRow, '폼타입') || 'simple';
      var validated = validateSubmitParams_(rawPayload, formType);
      var suspicionReasons = iReason !== undefined ? String(row[iReason] || '').trim() : '';

      var submittedAt = new Date();
      if (iTime !== undefined && row[iTime]) {
        var recTime = row[iTime];
        submittedAt = recTime instanceof Date ? recTime : new Date(recTime);
        if (isNaN(submittedAt.getTime())) submittedAt = new Date();
      }

      var notificationSent = false;
      var notifyError = '';

      if (sendNotification) {
        var notifyResult = notifyManagerOnSubmission_(siteRow, validated, rawPayload);
        notificationSent = notifyResult && notifyResult.success === true;
        if (!notificationSent) {
          notifyError = notifyResult && notifyResult.error ? notifyResult.error : 'NOTIFY_FAILED';
        }
      }

      // 접수관리 시트 추가 및 미러링
      var appendResult = appendSubmissionRow_(
        siteRow,
        validated,
        submissionId,
        submittedAt,
        rawPayload,
        {
          validationStatus: status,
          suspicionReasons: suspicionReasons,
          skipMirror: false
        }
      );

      submissionIds[submissionId] = true;

      writeLog_(
        'SUBMIT_REPROCESS_OK',
        siteCode,
        '접수ID=' + submissionId +
          ', 상태=' + status +
          ', 알림전송=' + (sendNotification ? (notificationSent ? 'OK' : 'FAIL(' + notifyError + ')') : 'SKIPPED') +
          ', 접수관리=Y'
      );

      recovered.push({
        submissionId: submissionId,
        siteCode: siteCode,
        name: validated.name,
        phone: validated.phone,
        status: status,
        notificationSent: notificationSent,
        notifyError: notifyError
      });
    } catch (err) {
      writeLog_(
        'SUBMIT_REPROCESS_FAIL',
        '',
        '접수ID=' + submissionId + ', ' + (err.message || String(err))
      );
      skipped.push({ submissionId: submissionId, reason: err.message || String(err) });
    }
  }

  return {
    success: true,
    processedCount: recovered.length,
    recovered: recovered,
    skipped: skipped
  };
}

/** 시트 메뉴에서 실행 */
function runReprocessMissedSubmissions() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    '누락 접수 재검열 및 복구',
    '순간 장애로 _검증로그에는 있으나 [접수관리] 시트에 등록되지 않은 건을 찾아\n' +
    '알림톡을 재발송하고 [접수관리] 시트에 등록합니다.\n\n' +
    '진행하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  var result = handleReprocessMissedSubmissions({
    limit: 30,
    sendNotification: true
  });

  if (!result.success) {
    ui.alert('복구 실패: ' + (result.error || '알 수 없는 오류'));
    return;
  }

  var msg = '복구 완료: 총 ' + result.processedCount + '건 복구됨\n';
  if (result.recovered && result.recovered.length > 0) {
    msg += '\n[복구 목록]\n';
    for (var i = 0; i < result.recovered.length; i++) {
      var r = result.recovered[i];
      msg += '- ' + r.siteCode + ' ' + r.name + ' (' + r.status + ') 알림:' + (r.notificationSent ? '성공' : '실패') + '\n';
    }
  } else {
    msg += '\n현재 누락된 접수 건이 없습니다.';
  }

  ui.alert(msg);
}
