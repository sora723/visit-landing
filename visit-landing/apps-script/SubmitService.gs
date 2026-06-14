/**
 * SubmitService.gs
 * VisitLanding — submit (접수 저장 + 현장 Spreadsheet 미러 + 알림)
 */

var DUPLICATE_WINDOW_MS = 2 * 60 * 60 * 1000; // 기본 120분, 현장별 설정 우선

/**
 * POST action=submit
 */
function handleSubmit(params) {
  var siteCode = String(params.siteCode || '').trim();
  if (!siteCode) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode는 필수입니다');
  }

  if (params.isVirtual === true || params.isVirtual === 'true') {
    throw createAppError_('VALIDATION_ERROR', '가상 접수는 저장할 수 없습니다');
  }
  if (String(params.source || '').trim() === 'live_feed_virtual') {
    throw createAppError_('VALIDATION_ERROR', '가상 접수는 저장할 수 없습니다');
  }

  var siteRow = findSiteByCode_(siteCode);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', '현장을 찾을 수 없습니다: ' + siteCode);
  }

  if (!isSiteSubmissionEnabled_(siteRow)) {
    throw createAppError_('SITE_INACTIVE', '관심고객 접수가 마감되었습니다');
  }

  var formType = getField_(siteRow, '폼타입') || 'simple';
  var validated = validateSubmitParams_(params, formType);

  var blockMinutes = getDuplicateBlockMinutes_(siteRow);
  var blockMs = blockMinutes * 60 * 1000;

  if (checkFullDuplicateSubmission_(siteCode, validated, blockMs)) {
    var dupSubmissionId = Utilities.getUuid();
    var dupSubmittedAt = new Date();

    appendSubmissionRow_(
      siteRow,
      validated,
      dupSubmissionId,
      dupSubmittedAt,
      params,
      { isDuplicate: true }
    );

    writeLog_(
      'SUBMIT_DUPLICATE',
      siteCode,
      '접수ID=' + dupSubmissionId + ', 알림=SKIP (2시간 내 동일 접수)'
    );

    return {
      submissionId: dupSubmissionId,
      isDuplicate: true,
      redirectUrl: buildCompleteRedirectUrl_(siteCode, validated),
      notificationSent: false
    };
  }

  var submissionId = Utilities.getUuid();
  var submittedAt = new Date();

  appendSubmissionRow_(siteRow, validated, submissionId, submittedAt, params);

  var notificationResult = notifyManagerOnSubmission_(siteRow, validated, params);

  writeLog_(
    'SUBMIT',
    siteCode,
    '접수ID=' + submissionId + ', 알림=' + (notificationResult.success ? 'OK' : 'FAIL')
  );

  return {
    submissionId: submissionId,
    isDuplicate: false,
    redirectUrl: buildCompleteRedirectUrl_(siteCode, validated),
    notificationSent: notificationResult.success === true
  };
}

/**
 * simple / full 폼 필드 검증
 */
function validateSubmitParams_(params, formType) {
  var name = String(params.name || '').trim();
  var phone = normalizePhone_(params.phone);
  var privacyAgreed = (
    params.privacyAgreed === true ||
    params.privacyAgreed === 'true' ||
    params.privacyAgreed === 'Y'
  );

  if (!name) {
    throw createAppError_('VALIDATION_ERROR', '성함은 필수입니다');
  }
  if (!phone || phone.length < 10 || phone.length > 11) {
    throw createAppError_('VALIDATION_ERROR', '올바른 연락처를 입력해주세요');
  }
  if (!privacyAgreed) {
    throw createAppError_('VALIDATION_ERROR', '개인정보 수집 및 이용에 동의해주세요');
  }

  var result = {
    name: name,
    phone: phone,
    ageRange: '',
    consultType: String(params.unitType || params.consultType || '').trim(),
    reserveDate: String(params.visitDate || params.reserveDate || '').trim(),
    reserveTime: String(params.visitTime || params.reserveTime || '').trim(),
    inquiry: String(params.inquiry || params.source || '').trim(),
    utmSource: String(params.utmSource || params.utm_source || '').trim(),
    utmMedium: String(params.utmMedium || params.utm_medium || '').trim(),
    utmCampaign: String(params.utmCampaign || params.utm_campaign || '').trim()
  };

  if (formType === 'full') {
    result.ageRange = String(params.ageRange || '').trim();
    result.consultType = String(params.consultType || '').trim();
    result.reserveDate = String(params.reserveDate || '').trim();
    result.reserveTime = String(params.reserveTime || '').trim();

    if (!result.ageRange) {
      throw createAppError_('VALIDATION_ERROR', '연령대는 필수입니다');
    }
    if (!result.consultType) {
      throw createAppError_('VALIDATION_ERROR', '상담유형은 필수입니다');
    }
    if (!result.reserveDate) {
      throw createAppError_('VALIDATION_ERROR', '예약날짜는 필수입니다');
    }
    if (!result.reserveTime) {
      throw createAppError_('VALIDATION_ERROR', '예약시간은 필수입니다');
    }
  }

  return result;
}

/**
 * 접수관리 시트 저장 (헤더명 기준)
 * 1) VisitLanding_Master → 접수관리
 * 2) 현장관리.submissionSpreadsheetId → 현장별 독립 Spreadsheet
 */
function appendSubmissionRow_(siteRow, data, submissionId, submittedAt, rawParams, options) {
  var rowData = buildSubmissionRowData_(
    siteRow,
    data,
    submissionId,
    submittedAt,
    rawParams,
    options
  );

  appendRowByHeaders_(SHEET_NAMES.SUBMISSION, rowData);

  mirrorSubmissionToSiteSpreadsheet_(siteRow, rowData, submissionId);
}

/**
 * 마스터·현장 시트 공통 행 데이터 (영문/한글 헤더 동시 키)
 */
function buildSubmissionRowData_(siteRow, data, submissionId, submittedAt, rawParams, options) {
  var params = rawParams || {};
  var opts = options || {};
  var siteCode = getSiteCodeFromRow_(siteRow);
  var siteName = getSiteNameFromRow_(siteRow);
  var managerName = getSiteField_(siteRow, ['managerName', '담당자명']);
  var managerPhone = getNotifyPhoneFromRow_(siteRow);
  var sourceUrl = String(params.sourceUrl || params.pageUrl || '').trim();
  var referer = String(params.referer || '').trim();
  var device = String(params.device || '').trim();
  var clientIp = String(params.clientIp || '').trim();
  var consultType = data.consultType || '방문예약';

  return {
    // VisitLanding_Master (영문)
    'id': submissionId,
    'siteCode': siteCode,
    'createdAt': submittedAt,
    'name': data.name,
    'phone': data.phone,
    'utmSource': data.utmSource,
    'utmMedium': data.utmMedium,
    'utmCampaign': data.utmCampaign,
    'referer': referer,
    'device': device,
    'ip': clientIp,
    'status': '접수완료',
    'memo': '',
    // 레거시 (한글)
    '접수ID': submissionId,
    '접수일시': submittedAt,
    '현장코드': siteCode,
    '현장명': siteName,
    '성함': data.name,
    '연락처': data.phone,
    '연령대': data.ageRange,
    '상담유형': consultType,
    '예약날짜': data.reserveDate,
    '예약시간': data.reserveTime,
    '기타문의': data.inquiry,
    'utm_source': data.utmSource,
    'utm_medium': data.utmMedium,
    'utm_campaign': data.utmCampaign,
    '유입URL': sourceUrl,
    'Referer': referer,
    '디바이스': device,
    'IP': clientIp,
    '담당자명': managerName,
    '담당자번호': managerPhone,
    '중복여부': opts.isDuplicate === true ? 'Y' : 'N'
  };
}

/**
 * 현장별 독립 Spreadsheet에 미러 저장
 * submissionSpreadsheetId 미설정 → 스킵 (마스터만 저장)
 * 저장 실패 → 시스템로그 기록, 접수 성공 유지
 */
function mirrorSubmissionToSiteSpreadsheet_(siteRow, rowData, submissionId) {
  var siteCode = getSiteCodeFromRow_(siteRow);
  var spreadsheetId = getSubmissionSpreadsheetId_(siteRow);

  if (!spreadsheetId) {
    return { mirrored: false, reason: 'NO_SPREADSHEET_ID' };
  }

  var tabName = getSubmissionSheetTabName_(siteRow);
  var ss = openSpreadsheetByIdOptional_(spreadsheetId);

  if (!ss) {
    writeLog_(
      'SUBMISSION_MIRROR_SKIP',
      siteCode,
      'Spreadsheet 열기 실패 id=' + spreadsheetId + ' submission=' + submissionId
    );
    return { mirrored: false, reason: 'SPREADSHEET_NOT_FOUND', spreadsheetId: spreadsheetId };
  }

  var sheet = getSheetInSpreadsheetOptional_(ss, tabName);
  if (!sheet) {
    writeLog_(
      'SUBMISSION_MIRROR_SKIP',
      siteCode,
      '탭 없음: ' + tabName + ' in ' + spreadsheetId
    );
    return { mirrored: false, reason: 'TAB_NOT_FOUND', spreadsheetId: spreadsheetId, sheetName: tabName };
  }

  try {
    appendRowToSheet_(sheet, rowData);
    writeLog_(
      'SUBMISSION_MIRROR_OK',
      siteCode,
      spreadsheetId + '/' + tabName + ' id=' + submissionId
    );
    return { mirrored: true, spreadsheetId: spreadsheetId, sheetName: tabName };
  } catch (err) {
    writeLog_(
      'SUBMISSION_MIRROR_FAIL',
      siteCode,
      spreadsheetId + ': ' + (err.message || String(err))
    );
    return { mirrored: false, reason: 'WRITE_ERROR', spreadsheetId: spreadsheetId };
  }
}

/**
 * complete.html 리다이렉트 URL (UTM 유지)
 */
function buildCompleteRedirectUrl_(siteCode, data) {
  var url = '/complete.html?site=' + encodeURIComponent(siteCode);
  if (data.utmSource) url += '&utm_source=' + encodeURIComponent(data.utmSource);
  if (data.utmMedium) url += '&utm_medium=' + encodeURIComponent(data.utmMedium);
  if (data.utmCampaign) url += '&utm_campaign=' + encodeURIComponent(data.utmCampaign);
  return url;
}

/**
 * 접수 성공 후 알림 발송 — 실패해도 예외 없음
 */
function notifyManagerOnSubmission_(siteRow, submission, rawParams) {
  var params = rawParams || {};
  var formType = getField_(siteRow, '폼타입') || 'simple';
  var reserveDisplay = buildReserveDisplay_(
    formType,
    submission.reserveDate,
    submission.reserveTime
  );

  var trafficSource = buildTrafficSourceLabel_(submission, params);

  return sendSubmissionNotification({
    siteRow: siteRow,
    submission: {
      name: submission.name,
      phone: submission.phone,
      inquiry: submission.inquiry || '',
      consultType: submission.consultType || '관심등록',
      reserveDisplay: reserveDisplay,
      trafficSource: trafficSource,
      submittedAt: new Date()
    }
  });
}

function buildTrafficSourceLabel_(submission, params) {
  if (submission.utmSource) return submission.utmSource;
  if (submission.utmMedium) return submission.utmMedium;
  if (submission.utmCampaign) return submission.utmCampaign;
  if (params.referer) {
    try {
      return new URL(params.referer).hostname;
    } catch (e) {
      return params.referer;
    }
  }
  return '직접유입';
}

/**
 * 중복 접수 검사 — 설정 시간(기본 2시간) 내 모든 접수 필드 일치
 * @returns {boolean} true = 완전 중복 (알림톡 생략, 시트 저장)
 */
function checkFullDuplicateSubmission_(siteCode, validated, blockMs) {
  var rows = sheetToObjects_(SHEET_NAMES.SUBMISSION);
  var now = new Date();
  var windowMs = blockMs || DUPLICATE_WINDOW_MS;

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowSiteCode = getSiteField_(row, ['siteCode', '현장코드']);
    if (rowSiteCode !== siteCode) continue;

    var submittedAt = row['createdAt'] || row['접수일시'];
    if (!submittedAt) continue;

    var submittedDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
    if (isNaN(submittedDate.getTime())) continue;
    if (now.getTime() - submittedDate.getTime() > windowMs) continue;

    if (isSameSubmissionContent_(row, validated)) {
      return true;
    }
  }
  return false;
}

function normalizeSubmissionField_(value) {
  return String(value || '').trim();
}

function normalizeConsultTypeForCompare_(value) {
  return normalizeSubmissionField_(value) || '방문예약';
}

function isSameSubmissionContent_(row, validated) {
  var rowName = getSiteField_(row, ['name', '성함']);
  var rowPhone = normalizePhone_(getSiteField_(row, ['phone', '연락처']));
  var rowConsult = getSiteField_(row, ['consultType', '상담유형']);
  var rowDate = getSiteField_(row, ['reserveDate', '예약날짜', 'visitDate']);
  var rowTime = getSiteField_(row, ['reserveTime', '예약시간', 'visitTime']);
  var rowInquiry = getSiteField_(row, ['inquiry', '기타문의', 'source']);
  var rowAge = getSiteField_(row, ['ageRange', '연령대']);

  return (
    normalizeSubmissionField_(rowName) === normalizeSubmissionField_(validated.name) &&
    rowPhone === normalizePhone_(validated.phone) &&
    normalizeConsultTypeForCompare_(rowConsult) === normalizeConsultTypeForCompare_(validated.consultType) &&
    normalizeSubmissionField_(rowDate) === normalizeSubmissionField_(validated.reserveDate) &&
    normalizeSubmissionField_(rowTime) === normalizeSubmissionField_(validated.reserveTime) &&
    normalizeSubmissionField_(rowInquiry) === normalizeSubmissionField_(validated.inquiry) &&
    normalizeSubmissionField_(rowAge) === normalizeSubmissionField_(validated.ageRange)
  );
}
