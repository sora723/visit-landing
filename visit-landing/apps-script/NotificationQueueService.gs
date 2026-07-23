/**
 * (레거시) 접수 후처리 큐
 * 신규 접수는 submit → _검증로그 → submit.postProcess 경로를 씁니다.
 * notify.flush 는 예전 _알림큐 pending 잔여분 소진용으로만 유지합니다.
 */

var NOTIFY_QUEUE_HEADERS = [
  'queuedAt',
  'jobType',
  'submissionId',
  'siteCode',
  'name',
  'phone',
  'inquiry',
  'consultType',
  'reserveDate',
  'reserveTime',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'referer',
  'needNotify',
  'needMirror',
  'rowPayload',
  'status',
  'attempts',
  'processedAt',
  'lastError'
];

function ensureNotifyQueueSheet_() {
  var sheet = getSheetOptional_(SHEET_NAMES.NOTIFY_QUEUE);
  if (!sheet) {
    var ss = getSpreadsheet_();
    sheet = ss.insertSheet(SHEET_NAMES.NOTIFY_QUEUE);
    sheet.getRange(1, 1, 1, NOTIFY_QUEUE_HEADERS.length).setValues([NOTIFY_QUEUE_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  ensureSheetColumnsAfter_(SHEET_NAMES.NOTIFY_QUEUE, ['queuedAt'], NOTIFY_QUEUE_HEADERS);
  return sheet;
}

function runEnsureNotifyQueueSheet() {
  ensureNotifyQueueSheet_();
  SpreadsheetApp.getUi().alert(
    '_알림큐 시트가 준비되었습니다.\n알림톡·현장미러는 이 큐에서 비동기로 처리됩니다.\n\n※ 설정 시 runFlushNotificationQueue 는 실행하지 마세요 (느림·실발송).'
  );
}

function serializeQueueRowData_(rowData) {
  var src = rowData || {};
  var out = {};
  Object.keys(src).forEach(function (key) {
    var value = src[key];
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  });
  return JSON.stringify(out);
}

function enqueueSubmissionNotification_(siteCode, submissionId, validated, rawParams, options) {
  ensureNotifyQueueSheet_();
  var params = rawParams || {};
  var opts = options || {};
  /**
   * options 생략 시(구버전 submit 호환) 알림 기본 Y.
   * options.needNotify 가 명시되면 그 값을 따름.
   */
  var needNotify =
    !options || opts.needNotify === undefined
      ? true
      : opts.needNotify === true;
  var needMirror = opts.needMirror !== false;

  appendRowByHeaders_(SHEET_NAMES.NOTIFY_QUEUE, {
    queuedAt: new Date(),
    jobType: 'notify',
    submissionId: submissionId,
    siteCode: siteCode,
    name: validated.name,
    phone: validated.phone,
    inquiry: validated.inquiry || '',
    consultType: validated.consultType || '관심등록',
    reserveDate: validated.reserveDate || '',
    reserveTime: validated.reserveTime || '',
    utmSource: validated.utmSource || '',
    utmMedium: validated.utmMedium || '',
    utmCampaign: validated.utmCampaign || '',
    referer: String(params.referer || '').trim(),
    needNotify: needNotify ? 'Y' : 'N',
    needMirror: needMirror ? 'Y' : 'N',
    rowPayload: needMirror ? serializeQueueRowData_(opts.rowData) : '',
    status: 'pending',
    attempts: 0,
    processedAt: '',
    lastError: ''
  });
}

/** _검증로그 행을 큐에 넣고 submit 응답을 먼저 반환 */
function enqueueVerificationLogDeferred_(logRow) {
  ensureNotifyQueueSheet_();
  appendRowByHeaders_(SHEET_NAMES.NOTIFY_QUEUE, {
    queuedAt: new Date(),
    jobType: 'verifyLog',
    submissionId: String((logRow && logRow.submissionId) || '').trim(),
    siteCode: String((logRow && (logRow.siteCode || logRow['현장코드'])) || '').trim(),
    name: String((logRow && (logRow['이름'] || logRow.name)) || '').trim(),
    phone: String((logRow && (logRow['정규화연락처'] || logRow['연락처'])) || '').trim(),
    inquiry: '',
    consultType: '',
    reserveDate: '',
    reserveTime: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    referer: '',
    needNotify: 'N',
    needMirror: 'N',
    rowPayload: serializeQueueRowData_(logRow || {}),
    status: 'pending',
    attempts: 0,
    processedAt: '',
    lastError: ''
  });
}

/**
 * POST action=notify.flush
 * 1) _검증로그 검수중 → postProcess (신규 흐름 / 구 프론트 호환)
 * 2) 레거시 _알림큐 pending 잔여분
 */
function handleNotifyFlush(params) {
  var limit = Number(params && params.limit);
  if (!limit || limit < 1) limit = 10;
  if (limit > 30) limit = 30;

  var pendingLog = processPendingVerificationLogs_(limit);
  var queueResult = { processed: 0, sent: 0, mirrored: 0, failed: 0 };
  try {
    queueResult = handleLegacyNotifyQueueFlush_(limit);
  } catch (queueErr) {
    writeLog_('NOTIFY_QUEUE_FLUSH_ERR', '', queueErr.message || String(queueErr));
  }

  return {
    verificationPending: pendingLog,
    legacyQueue: queueResult,
    processed: (pendingLog.processed || 0) + (queueResult.processed || 0),
    sent: (pendingLog.sent || 0) + (queueResult.sent || 0),
    mirrored: queueResult.mirrored || 0,
    failed: (pendingLog.failed || 0) + (queueResult.failed || 0)
  };
}

/** 레거시 _알림큐 flush (탭 없으면 스킵) */
function handleLegacyNotifyQueueFlush_(limit) {
  var sheet = getSheetOptional_(SHEET_NAMES.NOTIFY_QUEUE);
  if (!sheet) {
    return { processed: 0, sent: 0, mirrored: 0, failed: 0, skipped: true };
  }

  var map = getHeaderIndexMap_(sheet);
  var statusCol = map.status;
  var attemptsCol = map.attempts;
  var processedCol = map.processedAt;
  var errorCol = map.lastError;
  if (statusCol === undefined) {
    return { processed: 0, sent: 0, mirrored: 0, failed: 0, message: 'status 컬럼 없음' };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { processed: 0, sent: 0, mirrored: 0, failed: 0 };
  }

  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();
  var processed = 0;
  var sent = 0;
  var mirrored = 0;
  var failed = 0;

  for (var i = 0; i < values.length && processed < limit; i++) {
    var row = values[i];
    var status = String(row[statusCol] || '').trim().toLowerCase();
    if (status !== 'pending' && status !== 'error') continue;

    var attempts = Number(row[attemptsCol]) || 0;
    if (attempts >= 5 && status === 'error') continue;

    var rowIndex = i + 2;
    var job = notifyQueueRowToJob_(row, map);

    /** 검증로그 비동기 적재 — 알림보다 먼저 빠르게 처리 */
    if (job.jobType === 'verifyLog') {
      try {
        var logRow = job.rowPayload ? JSON.parse(job.rowPayload) : null;
        if (!logRow) {
          throw new Error('verifyLog_no_payload');
        }
        if (logRow['기록시간']) logRow['기록시간'] = new Date(logRow['기록시간']);
        appendVerificationLogRow_(logRow);
        sheet.getRange(rowIndex, statusCol + 1).setValue('done');
        if (attemptsCol !== undefined) {
          sheet.getRange(rowIndex, attemptsCol + 1).setValue(attempts + 1);
        }
        if (processedCol !== undefined) {
          sheet.getRange(rowIndex, processedCol + 1).setValue(new Date());
        }
        if (errorCol !== undefined) {
          sheet.getRange(rowIndex, errorCol + 1).setValue('');
        }
        processed++;
      } catch (logErr) {
        sheet.getRange(rowIndex, statusCol + 1).setValue('error');
        if (attemptsCol !== undefined) {
          sheet.getRange(rowIndex, attemptsCol + 1).setValue(attempts + 1);
        }
        if (errorCol !== undefined) {
          sheet.getRange(rowIndex, errorCol + 1).setValue(logErr.message || String(logErr));
        }
        processed++;
        failed++;
      }
      continue;
    }

    if (!job.siteCode || !job.submissionId) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('skipped');
      if (errorCol !== undefined) {
        sheet.getRange(rowIndex, errorCol + 1).setValue('incomplete_payload');
      }
      processed++;
      failed++;
      continue;
    }

    var siteRow = findSiteByCode_(job.siteCode);
    if (!siteRow) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('error');
      if (attemptsCol !== undefined) {
        sheet.getRange(rowIndex, attemptsCol + 1).setValue(attempts + 1);
      }
      if (errorCol !== undefined) {
        sheet.getRange(rowIndex, errorCol + 1).setValue('SITE_NOT_FOUND');
      }
      processed++;
      failed++;
      continue;
    }

    var errors = [];
    var notifyOk = !job.needNotify;
    var mirrorOk = !job.needMirror;
    var didNotify = false;

    if (job.needNotify) {
      if (!job.name || !job.phone) {
        errors.push('notify_incomplete');
      } else {
        try {
          var result = notifyManagerOnSubmission_(
            siteRow,
            {
              name: job.name,
              phone: normalizeMobilePhone_(job.phone) || job.phone,
              inquiry: job.inquiry,
              consultType: job.consultType,
              reserveDate: job.reserveDate,
              reserveTime: job.reserveTime,
              utmSource: job.utmSource,
              utmMedium: job.utmMedium,
              utmCampaign: job.utmCampaign
            },
            { referer: job.referer }
          );
          if (result && result.success === true) {
            notifyOk = true;
            didNotify = true;
            sent++;
          } else {
            errors.push((result && result.error) || 'notify_failed');
          }
        } catch (notifyErr) {
          errors.push(notifyErr.message || String(notifyErr));
        }
      }
    }

    if (job.needMirror) {
      try {
        var rowData = job.rowPayload ? JSON.parse(job.rowPayload) : null;
        if (!rowData) {
          errors.push('mirror_no_payload');
        } else {
          if (rowData.createdAt) rowData.createdAt = new Date(rowData.createdAt);
          if (rowData['접수일시']) rowData['접수일시'] = new Date(rowData['접수일시']);
          var mirrorResult = mirrorSubmissionToSiteSpreadsheet_(
            siteRow,
            rowData,
            job.submissionId
          );
          if (mirrorResult && mirrorResult.mirrored) {
            mirrorOk = true;
            mirrored++;
          } else if (
            mirrorResult &&
            (mirrorResult.reason === 'NO_SPREADSHEET_ID' ||
              mirrorResult.reason === 'TAB_NOT_FOUND' ||
              mirrorResult.reason === 'SPREADSHEET_NOT_FOUND')
          ) {
            /** 미러 대상 없음 — 실패로 재시도하지 않음 */
            mirrorOk = true;
          } else {
            errors.push((mirrorResult && mirrorResult.reason) || 'mirror_failed');
          }
        }
      } catch (err) {
        errors.push(err.message || String(err));
      }
    }

    processed++;
    if (attemptsCol !== undefined) {
      sheet.getRange(rowIndex, attemptsCol + 1).setValue(attempts + 1);
    }
    if (processedCol !== undefined) {
      sheet.getRange(rowIndex, processedCol + 1).setValue(new Date());
    }

    if (notifyOk && mirrorOk) {
      /** 알림 실발송이면 sent, 알림 없이 미러만이면 done */
      sheet.getRange(rowIndex, statusCol + 1).setValue(didNotify ? 'sent' : 'done');
      if (errorCol !== undefined) {
        sheet.getRange(rowIndex, errorCol + 1).setValue('');
      }
      writeLog_(
        didNotify ? 'NOTIFY_QUEUE_OK' : 'NOTIFY_QUEUE_DONE',
        job.siteCode,
        'submission=' + job.submissionId + ' notify=' + (didNotify ? 'Y' : 'N')
      );
    } else {
      sheet.getRange(rowIndex, statusCol + 1).setValue('error');
      if (errorCol !== undefined) {
        sheet.getRange(rowIndex, errorCol + 1).setValue(errors.join('|'));
      }
      failed++;
      writeLog_(
        'NOTIFY_QUEUE_FAIL',
        job.siteCode,
        'submission=' + job.submissionId + ' ' + errors.join('|')
      );
    }
  }

  return { processed: processed, sent: sent, mirrored: mirrored, failed: failed };
}

function notifyQueueRowToJob_(row, map) {
  function cell(key) {
    return map[key] === undefined ? '' : row[map[key]];
  }
  function yn(key, defaultVal) {
    var raw = String(cell(key) || '').trim().toUpperCase();
    if (!raw) return defaultVal === true;
    return raw === 'Y' || raw === 'TRUE' || raw === '1';
  }
  return {
    submissionId: String(cell('submissionId') || '').trim(),
    siteCode: String(cell('siteCode') || '').trim(),
    jobType: String(cell('jobType') || '').trim() || 'notify',
    name: String(cell('name') || '').trim(),
    phone: String(cell('phone') || '').trim(),
    inquiry: String(cell('inquiry') || '').trim(),
    consultType: String(cell('consultType') || '').trim() || '관심등록',
    reserveDate: String(cell('reserveDate') || '').trim(),
    reserveTime: String(cell('reserveTime') || '').trim(),
    utmSource: String(cell('utmSource') || '').trim(),
    utmMedium: String(cell('utmMedium') || '').trim(),
    utmCampaign: String(cell('utmCampaign') || '').trim(),
    referer: String(cell('referer') || '').trim(),
    needNotify: yn('needNotify', true),
    needMirror: yn('needMirror', true),
    rowPayload: String(cell('rowPayload') || '').trim()
  };
}

/** 에디터에서 수동/트리거 실행 — 설정 단계에서는 실행하지 말 것 */
function runFlushNotificationQueue() {
  var result = handleNotifyFlush({ limit: 20 });
  try {
    SpreadsheetApp.getUi().alert(
      '알림 큐 처리\n처리=' +
        result.processed +
        ' 알림=' +
        result.sent +
        ' 미러=' +
        result.mirrored +
        ' 실패=' +
        result.failed
    );
  } catch (e) {
    // 트리거 실행 시 UI 없음
  }
  return result;
}

/**
 * 알림 없이 done/sent 처리된 큐 행을 다시 pending+needNotify=Y 로 되돌린 뒤 flush
 * (needNotify 기본값 버그로 알림이 빠진 건 복구용)
 */
function handleNotifyRequeueMissed(params) {
  ensureNotifyQueueSheet_();
  var sheet = getSheet_(SHEET_NAMES.NOTIFY_QUEUE);
  var map = getHeaderIndexMap_(sheet);
  var statusCol = map.status;
  var needNotifyCol = map.needNotify;
  var nameCol = map.name;
  var phoneCol = map.phone;
  if (statusCol === undefined) {
    return { requeued: 0, message: 'status 컬럼 없음' };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { requeued: 0, flush: handleNotifyFlush(params || { limit: 10 }) };
  }

  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();
  var requeued = 0;

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var status = String(row[statusCol] || '').trim().toLowerCase();
    if (status !== 'sent' && status !== 'done' && status !== 'skipped') continue;

    var name = nameCol === undefined ? '' : String(row[nameCol] || '').trim();
    var phone = phoneCol === undefined ? '' : String(row[phoneCol] || '').trim();
    if (!name || !phone) continue;

    var needNotifyRaw =
      needNotifyCol === undefined ? '' : String(row[needNotifyCol] || '').trim().toUpperCase();
    /** N 이거나 비어 있는데 이미 sent/done 인 경우 → 알림 누락 가능 */
    if (needNotifyRaw === 'Y' && status === 'sent') continue;

    var rowIndex = i + 2;
    sheet.getRange(rowIndex, statusCol + 1).setValue('pending');
    if (needNotifyCol !== undefined) {
      sheet.getRange(rowIndex, needNotifyCol + 1).setValue('Y');
    }
    requeued++;
  }

  var flush = handleNotifyFlush({
    limit: (params && params.limit) || Math.max(10, requeued)
  });
  return { requeued: requeued, flush: flush };
}

function runNotifyRequeueMissed() {
  var result = handleNotifyRequeueMissed({ limit: 30 });
  try {
    SpreadsheetApp.getUi().alert(
      '알림 누락 재큐\n재큐=' +
        result.requeued +
        '\nflush 처리=' +
        (result.flush && result.flush.processed) +
        ' 알림=' +
        (result.flush && result.flush.sent) +
        ' 실패=' +
        (result.flush && result.flush.failed)
    );
  } catch (e) {}
  return result;
}
