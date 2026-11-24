/**
 * Main.gs
 * VisitLanding Web App 진입점
 *
 * Actions: submit | reservations.recent | site.provision | site.config | site.domains | site.resolve
 */

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  var params = {};
  try {
    params = method === 'POST' ? parsePostBody_(e) : (e && e.parameter ? e.parameter : {});
    var action = params.action;

    if (!action) {
      return buildJsonResponse_({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'action은 필수입니다' }
      });
    }

    var result = routeAction_(action, params);
    return buildJsonResponse_({ success: true, data: result, error: null });
  } catch (err) {
    writeLog_(
      'ERROR',
      (params && params.siteCode) || '',
      err.message || String(err) || 'unknown_error'
    );
    return buildJsonResponse_({
      success: false,
      data: null,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || '서버 오류가 발생했습니다'
      }
    });
  }
}

function routeAction_(action, params) {
  switch (action) {
    case 'submit':
      return handleSubmit(params);

    case 'submit.full':
      return handleSubmitFull(params);

    case 'submit.postProcess':
      return handleSubmitPostProcess(params);

    case 'formToken.issue':
      return handleFormTokenIssue(params);

    case 'reservations.recent':
      return getRecentReservations(params.siteCode, params.limit);

    case 'site.provision':
      return provisionSiteSpreadsheet(params.siteCode);

    case 'site.config':
      return getSiteLiveConfig(params.siteCode);

    case 'site.domains':
      return getSiteDomains();

    case 'site.resolve':
      return resolveSiteByDomain(params.domain || params.hostname || params.host);

    case 'setup.ipBlockSheet':
      return handleSetupIpBlockSheet();

    case 'setup.siteConversion':
      return handleSetupSiteConversion(params);

    case 'setup.enableVisitTime':
      return handleSetupEnableVisitTime(params);

    case 'setup.reservationFormColumns':
      return ensureReservationFormColumns();

    case 'setup.benefitsEnabledColumn':
      return handleSetupBenefitsEnabledColumn();

    case 'setup.formTokenHmac':
      return handleSetupFormTokenHmac(params);

    case 'audit.verificationLog':
      return auditVerificationLog_(params);

    /** 레거시 _알림큐 잔여분 소진용 (신규 enqueue 없음) */
    case 'notify.flush':
      return handleNotifyFlush(params);

    case 'notify.requeueMissed':
      return handleNotifyRequeueMissed(params);

    case 'submission.reprocessMissed':
      return handleReprocessMissedSubmissions(params);

    /** Netlify → 시스템로그 한 줄 (BUSY 임시보관 등) */
    case 'ops.log':
      return handleOpsLog_(params);

    /** 운영 조회 — 시스템로그·검증로그 최근건 (siteCode 필터) */
    case 'ops.recentLogs':
      return handleOpsRecentLogs_(params);

    /** 운영 — 접수ID 기준 알림톡만 재발송 (시트 재적재 없음) */
    case 'ops.resendNotification':
      return handleOpsResendNotification_(params);

    /** 운영 — Solapi 템플릿 문안·변수명 조회 */
    case 'ops.solapiTemplate':
      return handleOpsSolapiTemplate_(params);

    /** 운영 — 현장별 알림 수신번호·템플릿/채널 */
    case 'ops.siteNotifyMeta':
      return handleOpsSiteNotifyMeta_(params);

    default:
      throw createAppError_('VALIDATION_ERROR', '알 수 없는 action: ' + action);
  }
}

/**
 * action=ops.log
 * params: siteCode, logAction (기본 BUSY_PENDING_SAVED), message
 */
function handleOpsLog_(params) {
  var siteCode = normalizeSiteCode_(params.siteCode) || String(params.siteCode || '').trim();
  var logAction = String(params.logAction || params.actionName || 'OPS_LOG').trim() || 'OPS_LOG';
  var message = String(params.message || '').trim();
  if (!message) {
    throw createAppError_('VALIDATION_ERROR', 'message는 필수입니다');
  }
  writeLog_(logAction, siteCode, message);
  return { logged: true, action: logAction, siteCode: siteCode };
}

/**
 * action=ops.recentLogs&siteCode=L019&limit=40
 * 시스템로그 + _검증로그 최근 행 (현장 필터)
 */
function handleOpsRecentLogs_(params) {
  var siteCode = normalizeSiteCode_(params.siteCode) || String(params.siteCode || '').trim();
  var limit = Number(params.limit || 40);
  if (!(limit > 0)) limit = 40;
  if (limit > 100) limit = 100;

  var systemLogs = [];
  var logSheet = getSheetOptional_(getLogSheetName_());
  if (logSheet && logSheet.getLastRow() >= 2) {
    var lastRow = logSheet.getLastRow();
    var width = Math.min(logSheet.getLastColumn(), 8);
    var start = Math.max(2, lastRow - 800);
    var values = logSheet.getRange(start, 1, lastRow, width).getValues();
    for (var i = values.length - 1; i >= 0 && systemLogs.length < limit; i--) {
      var row = values[i];
      var rowSite = String(row[2] || '').trim().toUpperCase();
      var line = row
        .map(function (v) {
          return v instanceof Date ? v.toISOString() : String(v || '');
        })
        .join('|');
      if (siteCode && rowSite !== siteCode && line.indexOf(siteCode) < 0) continue;
      systemLogs.push({
        time: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
        action: String(row[1] || ''),
        siteCode: String(row[2] || ''),
        provider: String(row[3] || ''),
        recipientPhone: String(row[4] || ''),
        errorMessage: String(row[5] || ''),
        payload: String(row[6] || '').slice(0, 500),
        message: String(row[7] || '').slice(0, 400)
      });
    }
  }

  var verification = [];
  ensureVerificationLogSheet_();
  var vSheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  if (vSheet && vSheet.getLastRow() >= 2) {
    var vMap = getHeaderIndexMap_(vSheet);
    var vLast = vSheet.getLastRow();
    var vWidth = vSheet.getLastColumn();
    var vStart = Math.max(2, vLast - 300);
    var vVals = vSheet.getRange(vStart, 1, vLast, vWidth).getValues();
    var iTime = vMap['기록시간'];
    var iStatus = vMap['검증상태'];
    var iReason = vMap['의심사유'];
    var iId = vMap.submissionId;
    var iSite = vMap.siteCode;
    var iName = vMap['이름'];
    var iPhone = vMap['연락처'];
    for (var j = vVals.length - 1; j >= 0 && verification.length < limit; j--) {
      var vr = vVals[j];
      var vSite = iSite !== undefined ? String(vr[iSite] || '').trim().toUpperCase() : '';
      if (siteCode && vSite !== siteCode) continue;
      var recorded = iTime !== undefined ? vr[iTime] : null;
      verification.push({
        time:
          recorded instanceof Date
            ? recorded.toISOString()
            : String(recorded || ''),
        status: iStatus !== undefined ? String(vr[iStatus] || '') : '',
        reason: iReason !== undefined ? String(vr[iReason] || '') : '',
        submissionId: iId !== undefined ? String(vr[iId] || '') : '',
        siteCode: vSite,
        name: iName !== undefined ? String(vr[iName] || '') : '',
        phone: iPhone !== undefined ? String(vr[iPhone] || '') : ''
      });
    }
  }

  var submissionIds = loadSubmissionIdSet_();
  for (var k = 0; k < verification.length; k++) {
    var id = verification[k].submissionId;
    verification[k].inSubmissions = id ? !!submissionIds[id] : false;
  }

  return {
    siteCode: siteCode || '',
    systemLogs: systemLogs,
    verification: verification
  };
}

/**
 * action=ops.resendNotification&submissionId=...
 * _검증로그 raw_payload 로 알림톡만 재발송
 */
function handleOpsResendNotification_(params) {
  var submissionId = String((params && params.submissionId) || '').trim();
  if (!submissionId) {
    throw createAppError_('VALIDATION_ERROR', 'submissionId는 필수입니다');
  }

  ensureVerificationLogSheet_();
  var sheet = getSheet_(SHEET_NAMES.VERIFICATION_LOG);
  var map = getHeaderIndexMap_(sheet);
  var iId = map.submissionId;
  var iPayload = map.raw_payload;
  var iSite = map.siteCode;
  if (iId === undefined) {
    throw createAppError_('INTERNAL_ERROR', '_검증로그 submissionId 컬럼 없음');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw createAppError_('NOT_FOUND', '검증로그가 비어 있습니다');
  }

  var width = sheet.getLastColumn();
  var values = sheet.getRange(2, 1, lastRow, width).getValues();
  var raw = '';
  var siteCode = '';
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][iId] || '').trim() !== submissionId) continue;
    raw = iPayload !== undefined ? String(values[i][iPayload] || '').trim() : '';
    siteCode = iSite !== undefined ? String(values[i][iSite] || '').trim() : '';
    if (!raw) {
      raw = findRawPayloadBySubmissionId_(values, iId, iPayload, submissionId);
    }
    break;
  }

  if (!raw) {
    throw createAppError_('NOT_FOUND', 'raw_payload 없음: ' + submissionId);
  }

  var rawPayload = JSON.parse(raw);
  siteCode = normalizeSiteCode_(siteCode || rawPayload.siteCode);
  var siteRow = findSiteByCode_(siteCode);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', '현장 없음: ' + siteCode);
  }

  var formType = getField_(siteRow, '폼타입') || 'simple';
  var validated = validateSubmitParams_(rawPayload, formType, {
    requireBirthDate: false
  });
  var result = notifyManagerOnSubmission_(siteRow, validated, rawPayload);
  writeLog_(
    result && result.success ? 'OPS_RESEND_NOTIFY_OK' : 'OPS_RESEND_NOTIFY_FAIL',
    siteCode,
    '접수ID=' + submissionId + ', err=' + ((result && result.error) || '')
  );
  return {
    submissionId: submissionId,
    siteCode: siteCode,
    success: !!(result && result.success),
    error: (result && result.error) || '',
    templateId: (result && result.templateId) || '',
    pfId: (result && result.pfId) || ''
  };
}

/**
 * action=ops.solapiTemplate&templateId=KA01TP...
 * (templateId 생략 시 Script Properties SOLAPI_TEMPLATE_ID_SUBMISSION)
 */
function handleOpsSolapiTemplate_(params) {
  var config = getSolapiProviderConfig_();
  validateSolapiConfig_(config);
  var templateId = String((params && params.templateId) || '').trim() ||
    config.templateIdSubmission;
  if (!templateId) {
    throw createAppError_('VALIDATION_ERROR', 'templateId가 없습니다');
  }

  var url = 'https://api.solapi.com/kakao/v2/templates/' + encodeURIComponent(templateId);
  var date = new Date().toISOString();
  var salt = Utilities.getUuid().replace(/-/g, '');
  var signatureData = date + salt;
  var signature = Utilities.computeHmacSha256Signature(signatureData, config.apiSecret);
  var signatureHex = signature.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
  var auth =
    'HMAC-SHA256 ApiKey=' +
    config.apiKey +
    ', Date=' +
    date +
    ', Salt=' +
    salt +
    ', Signature=' +
    signatureHex;

  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: auth },
    muteHttpExceptions: true
  });
  var statusCode = response.getResponseCode();
  var body = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw createAppError_(
      'SOLAPI_ERROR',
      '템플릿 조회 실패 (' + statusCode + '): ' + body.slice(0, 500)
    );
  }

  var parsed = JSON.parse(body);
  var vars = parsed.variables || [];
  var varNames = [];
  if (Array.isArray(vars)) {
    for (var i = 0; i < vars.length; i++) {
      if (typeof vars[i] === 'string') varNames.push(vars[i]);
      else if (vars[i] && vars[i].name) varNames.push(String(vars[i].name));
    }
  }

  return {
    templateId: parsed.templateId || templateId,
    name: parsed.name || '',
    status: parsed.status || '',
    content: parsed.content || '',
    emphasizeTitle: parsed.emphasizeTitle || '',
    emphasizeSubtitle: parsed.emphasizeSubtitle || '',
    header: parsed.header || '',
    variables: varNames,
    rawVariableCount: Array.isArray(vars) ? vars.length : 0
  };
}

/** action=ops.siteNotifyMeta — 현장관리 알림 설정 목록 */
function handleOpsSiteNotifyMeta_(params) {
  var config = getSolapiProviderConfig_();
  var defaultTemplateId = String(config.templateIdSubmission || '').trim();
  var defaultPfId = String(config.pfId || '').trim();
  var rows = sheetToObjects_(SHEET_NAMES.SITE);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var siteCode = normalizeSiteCode_(getSiteCodeFromRow_(row));
    if (!siteCode) continue;
    var active = isSiteSubmissionEnabled_(row);
    var onlyActive = params && (params.activeOnly === true || params.activeOnly === '1' || params.activeOnly === 'Y');
    if (onlyActive && !active) continue;
    var siteTpl = getSolapiTemplateIdFromRow_(row);
    var sitePf = getSolapiPfIdFromRow_(row);
    out.push({
      siteCode: siteCode,
      siteName: getSiteNameFromRow_(row) || '',
      active: active,
      notifyPhone: getNotifyPhoneFromRow_(row) || '',
      solapiTemplateId: siteTpl || defaultTemplateId || '',
      solapiTemplateSource: siteTpl ? 'site' : 'default',
      solapiPfId: sitePf || defaultPfId || '',
      solapiPfSource: sitePf ? 'site' : 'default'
    });
  }
  return {
    defaultTemplateId: defaultTemplateId,
    defaultPfId: defaultPfId,
    sites: out
  };
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw createAppError_('VALIDATION_ERROR', 'JSON body 파싱 실패');
  }
}

function buildJsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 시트 메뉴 — VisitLanding_Master 열 때 표시 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('VisitLanding')
    .addItem('누락 컬럼 전체 추가', 'runEnsureStickyPromoAndVerify')
    .addItem('푸터 컬럼 추가 (footerData)', 'runEnsureFooterColumns')
    .addItem('도메인 컬럼 추가 (domain)', 'runEnsureDomainColumn')
    .addSeparator()
    .addItem('메뉴 새로고침 (시트 닫았다 열기)', 'runVisitLandingMenuHint')
    .addItem('컬러 컬럼 추가 (main/sub/accent)', 'runEnsureSiteThemeColumns')
    .addItem('혜택카드노출 컬럼 정리 (benefitsEnabled)', 'runEnsureBenefitsEnabledColumn')
    .addItem('전환·소유확인 컬럼 추가', 'runEnsureConversionTrackingColumns')
    .addItem('솔라피 템플릿 컬럼 추가 (solapiTemplateId)', 'runEnsureSolapiNotificationColumns')
    .addItem('IP 차단 시트 추가 (_IP차단)', 'runEnsureIpBlockSheet')
    .addItem('누락 접수 재검열 및 복구 (알림+접수관리)', 'runReprocessMissedSubmissions')
    .addItem('(레거시) 알림 큐 잔여 발송', 'runFlushNotificationQueue')
    .addToUi();
}

function runEnsureBenefitsEnabledColumn() {
  var result = ensureBenefitsEnabledColumn();
  try {
    SpreadsheetApp.getUi().alert(result.message || JSON.stringify(result));
  } catch (e) {}
  return result;
}

/** onOpen 메뉴가 안 보이면 편집기에서 runEnsureFooterColumns() 실행 */
function runVisitLandingMenuHint() {
  SpreadsheetApp.getUi().alert(
    'VisitLanding 메뉴가 보이면 정상입니다.\n\n' +
      '메뉴가 없으면:\n' +
      '1) 시트를 새로고침(F5)\n' +
      '2) Apps Script 편집기 → runEnsureFooterColumns 실행\n' +
      '3) npm run setup:apps-script:push 로 최신 코드 배포'
  );
}
