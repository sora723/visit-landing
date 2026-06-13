/**
 * NotificationService.gs
 *
 * 알림 발송 공통 계층.
 * 비즈니스 로직(SubmitService, AdminService 등)은 이 모듈만 호출한다.
 * Solapi / BizM / NHN Cloud 등 Provider 직접 호출 금지.
 *
 * Provider 교체: Script Properties → NOTIFICATION_PROVIDER
 *   - solapi (기본)
 *   - bizm
 *   - nhn
 */

var DEFAULT_NOTIFICATION_PROVIDER = 'solapi';

/**
 * Provider 레지스트리
 * @type {Object.<string, NotificationProvider>}
 */
function getNotificationProviderRegistry_() {
  return {
    solapi: SolapiNotificationProvider_,
    bizm: BizmNotificationProvider_,
    nhn: NhnCloudNotificationProvider_
  };
}

/**
 * @typedef {Object} NotificationProvider
 * @property {string} id
 * @property {function(NotificationPayload): NotificationResult} send
 */

/**
 * @typedef {Object} NotificationPayload
 * @property {string} type          - 'submission' | 'test'
 * @property {string} recipientPhone
 * @property {string} siteCode
 * @property {string} siteName
 * @property {string} [customerName]
 * @property {string} [customerPhone]
 * @property {string} [consultType]
 * @property {string} [reserveDisplay]
 * @property {boolean} [isTest]
 */

/**
 * @typedef {Object} NotificationResult
 * @property {boolean} success
 * @property {string} providerId
 * @property {string} [messageId]
 * @property {string} [error]
 */

/**
 * 활성 Provider 반환
 */
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

/**
 * Provider를 통해 알림 발송 (내부 공통)
 * 실패해도 예외를 밖으로 던지지 않음 — 접수 성공 여부에 영향 없음
 */
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

// ─── 비즈니스 로직용 공개 API ─────────────────────────────────

/**
 * 관심고객 접수 알림 (담당자 → 알림톡/SMS)
 * SubmitService에서 호출
 */
function sendSubmissionNotification(params) {
  var payload = buildSubmissionNotificationPayload_(params);
  return dispatchNotification_(payload);
}

/**
 * 테스트 알림 (설정 화면)
 * AdminService에서 호출
 */
function sendTestNotification(params) {
  var payload = buildTestNotificationPayload_(params);
  return dispatchNotification_(payload);
}

/**
 * @param {Object} params
 * @param {Object} params.siteRow   - 현장관리 행 객체 (헤더명 키)
 * @param {Object} params.submission
 */
function buildSubmissionNotificationPayload_(params) {
  var siteRow = params.siteRow;
  var sub = params.submission || {};

  return {
    type: 'submission',
    recipientPhone: normalizePhone_(getNotifyPhoneFromRow_(siteRow)),
    siteCode: getSiteCodeFromRow_(siteRow),
    siteName: getSiteNameFromRow_(siteRow),
    customerName: sub.name || '',
    customerPhone: sub.phone || '',
    consultType: sub.consultType || '방문예약',
    reserveDisplay: sub.reserveDisplay || '방문예약',
    trafficSource: sub.trafficSource || '직접유입',
    submittedAt: sub.submittedAt || new Date(),
    isTest: false
  };
}

/**
 * @param {Object} params
 * @param {Object} params.siteRow
 */
function buildTestNotificationPayload_(params) {
  var siteRow = params.siteRow;

  return {
    type: 'test',
    recipientPhone: normalizePhone_(getNotifyPhoneFromRow_(siteRow)),
    siteCode: getSiteCodeFromRow_(siteRow),
    siteName: getSiteNameFromRow_(siteRow),
    customerName: '테스트',
    customerPhone: '01000000000',
    consultType: '테스트',
    reserveDisplay: '테스트',
    isTest: true
  };
}

/**
 * full/simple 폼에 따른 예약일시 표시 문자열
 */
function buildReserveDisplay_(formType, reserveDate, reserveTime) {
  if (formType === 'simple') return '일반문의';
  if (reserveDate && reserveTime) return reserveDate + ' ' + reserveTime;
  if (reserveDate) return reserveDate;
  return '일반문의';
}

// ─── 테스트 / 검증 ───────────────────────────────────────────

/**
 * Apps Script 편집기 — Provider 연결 테스트 (실발송)
 */
function testNotificationProvider() {
  var siteRow = findSiteByCode_('A001');
  if (!siteRow) throw new Error('A001 현장 데이터 없음');

  var provider = getActiveNotificationProvider_();
  Logger.log('Active Provider: ' + provider.id);

  var result = sendTestNotification({ siteRow: siteRow });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Apps Script 편집기 — 알림 실패 로그 기록 테스트 (실발송 없음)
 * _시스템로그에 NOTIFICATION_FAIL 행이 추가되는지 확인
 */
function testNotificationFailureLog() {
  var siteRow = findSiteByCode_('A001');
  if (!siteRow) throw new Error('A001 현장 데이터 없음');

  var payload = buildTestNotificationPayload_({ siteRow: siteRow });

  writeNotificationFailureLog_({
    payload: payload,
    providerId: 'solapi',
    errorMessage: '[테스트] Solapi API 오류 시뮬레이션'
  });

  Logger.log('NOTIFICATION_FAIL 로그 기록 완료 — _시스템로그 시트를 확인하세요');
  return payload;
}

/**
 * Apps Script 편집기 — 메시지 본문만 확인 (발송 없음)
 */
function testNotificationMessagePreview() {
  var siteRow = findSiteByCode_('A001');
  if (!siteRow) throw new Error('A001 현장 데이터 없음');

  var payload = buildSubmissionNotificationPayload_({
    siteRow: siteRow,
    submission: {
      name: '홍길동',
      phone: '01012345678',
      consultType: '방문상담',
      reserveDisplay: '2026-06-15 14:00'
    }
  });

  var body = SolapiNotificationProvider_.buildMessageBody(payload);
  Logger.log(body);
  return body;
}
