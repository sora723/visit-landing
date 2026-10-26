/**
 * NotificationService.gs
 * VisitLanding — 알림 발송 (Solapi / BizM / NHN)
 *
 * Provider 교체: Script Properties → NOTIFICATION_PROVIDER (기본 solapi)
 */

var DEFAULT_NOTIFICATION_PROVIDER = 'solapi';

function getNotificationProviderRegistry_() {
  return {
    solapi: SolapiNotificationProvider_,
    bizm: BizmNotificationProvider_,
    nhn: NhnCloudNotificationProvider_
  };
}

function getActiveNotificationProvider_() {
  var props = PropertiesService.getScriptProperties();
  var providerId = (props.getProperty('NOTIFICATION_PROVIDER') || DEFAULT_NOTIFICATION_PROVIDER).toLowerCase();
  var registry = getNotificationProviderRegistry_();
  var provider = registry[providerId];

  if (!provider) {
    throw createAppError_('INTERNAL_ERROR', '알 수 없는 Notification Provider: ' + providerId);
  }
  return provider;
}

function resolveNotificationTemplateMeta_(payload) {
  var props = PropertiesService.getScriptProperties();
  var isTest = payload && payload.isTest === true;
  var templateId = isTest
    ? String(props.getProperty('SOLAPI_TEMPLATE_ID_TEST') || '').trim()
    : String(payload && payload.solapiTemplateId || '').trim() ||
      String(props.getProperty('SOLAPI_TEMPLATE_ID_SUBMISSION') || '').trim();
  var pfId =
    String(payload && payload.solapiPfId || '').trim() ||
    String(props.getProperty('SOLAPI_PF_ID') || '').trim();
  return { templateId: templateId, pfId: pfId };
}

function dispatchNotification_(payload) {
  var provider = getActiveNotificationProvider_();
  var meta = resolveNotificationTemplateMeta_(payload);

  try {
    var result = provider.send(payload);
    writeLog_(
      'NOTIFICATION_OK',
      payload.siteCode || '',
      '[' +
        provider.id +
        '] 발송 성공 templateId=' +
        (meta.templateId || '-') +
        ' pfId=' +
        (meta.pfId || '-')
    );
    return {
      success: true,
      providerId: provider.id,
      messageId: result && result.messageId ? result.messageId : '',
      templateId: meta.templateId,
      pfId: meta.pfId
    };
  } catch (err) {
    var message = err.message || String(err);

    writeNotificationFailureLog_({
      payload: payload,
      providerId: provider.id,
      errorMessage: message
    });

    return {
      success: false,
      providerId: provider.id,
      error: message,
      templateId: meta.templateId,
      pfId: meta.pfId
    };
  }
}

function sendSubmissionNotification(params) {
  var payload = buildSubmissionNotificationPayload_(params);
  return dispatchNotification_(payload);
}

function buildSubmissionNotificationPayload_(params) {
  var siteRow = params.siteRow;
  var sub = params.submission || {};

  return {
    type: 'submission',
    recipientPhone: normalizePhone_(getNotifyPhoneFromRow_(siteRow)),
    siteCode: getSiteCodeFromRow_(siteRow),
    siteName: getSiteNameFromRow_(siteRow),
    customerName: sub.name || '',
    customerPhone: normalizeMobilePhone_(sub.phone) || String(sub.phone || ''),
    inquiry: sub.inquiry != null ? String(sub.inquiry).trim() : '',
    consultType: sub.consultType || '관심등록',
    reserveDisplay: sub.reserveDisplay || '미정',
    birthDate: sub.birthDate || '',
    region: sub.region || '',
    trafficSource: sub.trafficSource != null ? String(sub.trafficSource).trim() : '',
    submittedAt: sub.submittedAt || new Date(),
    isTest: false,
    /** 비우면 Script Properties 공통 템플릿/채널 */
    solapiTemplateId: getSolapiTemplateIdFromRow_(siteRow),
    solapiPfId: getSolapiPfIdFromRow_(siteRow)
  };
}

function buildReserveDisplay_(formType, reserveDate, reserveTime) {
  var datePart = formatVisitDateDisplay_(reserveDate);
  var timePart = String(reserveTime || '').trim();
  if (!timePart) return datePart;
  if (!reserveDate) return timePart;
  if (datePart === '미정') return timePart;
  return datePart + ' ' + timePart;
}

function testNotificationProvider() {
  var siteRow = findSiteByCode_('L001');
  if (!siteRow) throw new Error('L001 현장 데이터 없음');

  var payload = buildSubmissionNotificationPayload_({
    siteRow: siteRow,
    submission: {
      name: '테스트',
      phone: '01000000000',
      consultType: '방문예약',
      reserveDisplay: '방문예약',
      trafficSource: 'setup-test',
      submittedAt: new Date()
    }
  });

  payload.isTest = true;
  return dispatchNotification_(payload);
}

function testNotificationMessagePreview() {
  var siteRow = findSiteByCode_('L001');
  if (!siteRow) throw new Error('L001 현장 데이터 없음');

  var payload = buildSubmissionNotificationPayload_({
    siteRow: siteRow,
    submission: {
      name: '홍길동',
      phone: '01012345678',
      consultType: '방문상담',
      reserveDisplay: '방문예약',
      trafficSource: 'naver',
      submittedAt: new Date()
    }
  });

  return SolapiNotificationProvider_.buildMessageBody(payload);
}
