/**
 * 접수 알림 비동기 큐 — submit 응답을 알림톡보다 먼저 반환하기 위함
 * 탭을 닫아도 접수관리 저장은 이미 끝난 뒤라 유실 위험이 줄어듦
 */

var NOTIFY_QUEUE_HEADERS = [
  'queuedAt',
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
    '_알림큐 시트가 준비되었습니다.\n접수 저장 후 알림톡은 이 큐에서 비동기로 발송됩니다.'
  );
}

function enqueueSubmissionNotification_(siteCode, submissionId, validated, rawParams) {
  ensureNotifyQueueSheet_();
  var params = rawParams || {};
  appendRowByHeaders_(SHEET_NAMES.NOTIFY_QUEUE, {
    queuedAt: new Date(),
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
    status: 'pending',
    attempts: 0,
    processedAt: '',
    lastError: ''
  });
}

/**
 * POST action=notify.flush — pending 알림 발송 (Next after / 수동 실행)
 */
function handleNotifyFlush(params) {
  var limit = Number(params && params.limit);
  if (!limit || limit < 1) limit = 10;
  if (limit > 30) limit = 30;

  ensureNotifyQueueSheet_();
  var sheet = getSheet_(SHEET_NAMES.NOTIFY_QUEUE);
  var map = getHeaderIndexMap_(sheet);
  var statusCol = map.status;
  var attemptsCol = map.attempts;
  var processedCol = map.processedAt;
  var errorCol = map.lastError;
  if (statusCol === undefined) {
    return { processed: 0, sent: 0, failed: 0, message: 'status 컬럼 없음' };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();
  var processed = 0;
  var sent = 0;
  var failed = 0;

  for (var i = 0; i < values.length && processed < limit; i++) {
    var row = values[i];
    var status = String(row[statusCol] || '').trim().toLowerCase();
    if (status !== 'pending' && status !== 'error') continue;

    var attempts = Number(row[attemptsCol]) || 0;
    if (attempts >= 5 && status === 'error') continue;

    var rowIndex = i + 2;
    var job = notifyQueueRowToJob_(row, map);
    if (!job.siteCode || !job.name || !job.phone) {
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

    var result = notifyManagerOnSubmission_(
      siteRow,
      {
        name: job.name,
        phone: job.phone,
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

    processed++;
    if (attemptsCol !== undefined) {
      sheet.getRange(rowIndex, attemptsCol + 1).setValue(attempts + 1);
    }
    if (processedCol !== undefined) {
      sheet.getRange(rowIndex, processedCol + 1).setValue(new Date());
    }

    if (result && result.success === true) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('sent');
      if (errorCol !== undefined) {
        sheet.getRange(rowIndex, errorCol + 1).setValue('');
      }
      sent++;
      writeLog_('NOTIFY_QUEUE_OK', job.siteCode, 'submission=' + job.submissionId);
    } else {
      sheet.getRange(rowIndex, statusCol + 1).setValue('error');
      if (errorCol !== undefined) {
        sheet
          .getRange(rowIndex, errorCol + 1)
          .setValue((result && result.error) || 'notify_failed');
      }
      failed++;
      writeLog_(
        'NOTIFY_QUEUE_FAIL',
        job.siteCode,
        'submission=' + job.submissionId + ' ' + ((result && result.error) || '')
      );
    }
  }

  return { processed: processed, sent: sent, failed: failed };
}

function notifyQueueRowToJob_(row, map) {
  function cell(key) {
    return map[key] === undefined ? '' : row[map[key]];
  }
  return {
    submissionId: String(cell('submissionId') || '').trim(),
    siteCode: String(cell('siteCode') || '').trim(),
    name: String(cell('name') || '').trim(),
    phone: String(cell('phone') || '').trim(),
    inquiry: String(cell('inquiry') || '').trim(),
    consultType: String(cell('consultType') || '').trim() || '관심등록',
    reserveDate: String(cell('reserveDate') || '').trim(),
    reserveTime: String(cell('reserveTime') || '').trim(),
    utmSource: String(cell('utmSource') || '').trim(),
    utmMedium: String(cell('utmMedium') || '').trim(),
    utmCampaign: String(cell('utmCampaign') || '').trim(),
    referer: String(cell('referer') || '').trim()
  };
}

/** 에디터에서 수동/트리거 실행 */
function runFlushNotificationQueue() {
  var result = handleNotifyFlush({ limit: 20 });
  try {
    SpreadsheetApp.getUi().alert(
      '알림 큐 처리\n처리=' +
        result.processed +
        ' 성공=' +
        result.sent +
        ' 실패=' +
        result.failed
    );
  } catch (e) {
    // 트리거 실행 시 UI 없음
  }
  return result;
}
