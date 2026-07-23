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

function dispatchNotification_(payload) {
  var provider = getActiveNotificationProvider_();

  try {
    var result = provider.send(payload);
    writeLog_('NOTIFICATION_OK', payload.siteCode || '', '[' + provider.id + '] 발송 성공');
    return {
      success: true,
      providerId: provider.id,
      messageId: result && result.messageId ? result.messageId : ''
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
      error: message
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
    trafficSource: sub.trafficSource || '직접유입',
    submittedAt: sub.submittedAt || new Date(),
    isTest: false
  };
}

function buildReserveDisplay_(formType, reserveDate, reserveTime) {
  return formatVisitDateDisplay_(reserveDate);
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
