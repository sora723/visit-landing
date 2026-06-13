/**
 * NotificationProviderSolapi.gs
 *
 * Solapi 알림 Provider (기본값).
 * NotificationService에서만 사용. 비즈니스 로직 직접 호출 금지.
 *
 * Script Properties:
 *   SOLAPI_API_KEY
 *   SOLAPI_API_SECRET
 *   SOLAPI_SENDER_PHONE
 *   SOLAPI_PF_ID            (선택, 알림톡)
 *   SOLAPI_TEMPLATE_ID_SUBMISSION (선택)
 *   SOLAPI_TEMPLATE_ID_TEST       (선택)
 */

var SolapiNotificationProvider_ = {
  id: 'solapi',

  /**
   * @param {NotificationPayload} notification
   * @returns {{ messageId: string }}
   */
  send: function (notification) {
    var config = getSolapiProviderConfig_();
    validateSolapiConfig_(config);

    var messageBody = SolapiNotificationProvider_.buildMessageBody(notification);
    var requestBody = buildSolapiRequestBody_(notification, messageBody, config);

    var response = callSolapiApi_(requestBody, config);
    return { messageId: response.messageId || '' };
  },

  /**
   * 알림 메시지 본문 (Provider 내부 포맷)
   */
  buildMessageBody: function (notification) {
    var prefix = notification.isTest ? '[테스트] ' : '';

    if (notification.type === 'test') {
      return (
        prefix + '[VIDAD 테스트 알림]\n' +
        '현장명: ' + notification.siteName + '\n' +
        '알림 발송이 정상 동작합니다.'
      );
    }

    return (
      prefix + '[방문예약]\n' +
      '이름 : ' + notification.customerName + '\n' +
      '연락처 : ' + formatPhoneDisplay_(notification.customerPhone) + '\n' +
      '유입경로 : ' + (notification.trafficSource || '직접유입') + '\n' +
      '접수시간 : ' + formatSubmittedAt_(notification.submittedAt)
    );
  }
};

function formatPhoneDisplay_(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
  }
  if (digits.length === 10) {
    return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  }
  return phone || '';
}

function formatSubmittedAt_(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}

function getSolapiProviderConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    apiKey: props.getProperty('SOLAPI_API_KEY') || '',
    apiSecret: props.getProperty('SOLAPI_API_SECRET') || '',
    senderPhone: normalizePhone_(props.getProperty('SOLAPI_SENDER_PHONE') || ''),
    pfId: props.getProperty('SOLAPI_PF_ID') || '',
    templateIdSubmission: props.getProperty('SOLAPI_TEMPLATE_ID_SUBMISSION') || '',
    templateIdTest: props.getProperty('SOLAPI_TEMPLATE_ID_TEST') || ''
  };
}

function validateSolapiConfig_(config) {
  if (!config.apiKey || !config.apiSecret || !config.senderPhone) {
    throw createAppError_(
      'NOT_CONFIGURED',
      'Solapi 설정이 없습니다 (SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE)'
    );
  }
}

function buildSolapiRequestBody_(notification, messageBody, config) {
  var to = normalizePhone_(notification.recipientPhone);
  if (!to) {
    throw createAppError_('VALIDATION_ERROR', '수신 번호가 없습니다');
  }

  var message = {
    to: to,
    from: config.senderPhone,
    text: messageBody
  };

  var templateId = notification.isTest
    ? config.templateIdTest
    : config.templateIdSubmission;

  // 알림톡 템플릿이 설정된 경우 kakaoOptions 사용
  if (config.pfId && templateId) {
    message.kakaoOptions = {
      pfId: config.pfId,
      templateId: templateId,
      variables: buildSolapiTemplateVariables_(notification)
    };
    delete message.text;
  }

  return { message: message };
}

function buildSolapiTemplateVariables_(notification) {
  return {
    '#{siteName}': notification.siteName || '',
    '#{customerName}': notification.customerName || '',
    '#{customerPhone}': notification.customerPhone || '',
    '#{consultType}': notification.consultType || '',
    '#{reserveDisplay}': notification.reserveDisplay || ''
  };
}

function callSolapiApi_(requestBody, config) {
  var url = 'https://api.solapi.com/messages/v4/send';
  var payload = JSON.stringify(requestBody);
  var authHeader = buildSolapiAuthHeader_(config.apiKey, config.apiSecret, payload);

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: authHeader
    },
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  var body = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw createAppError_('SOLAPI_ERROR', 'Solapi API 오류 (' + statusCode + '): ' + body);
  }

  var parsed = JSON.parse(body);
  return {
    messageId: parsed.messageId || parsed.groupId || ''
  };
}

/**
 * Solapi HMAC-SHA256 Authorization 헤더
 */
function buildSolapiAuthHeader_(apiKey, apiSecret, body) {
  var date = new Date().toISOString();
  var salt = Utilities.getUuid().replace(/-/g, '');
  var signatureData = date + salt;
  var signature = Utilities.computeHmacSha256Signature(signatureData, apiSecret);
  var signatureHex = signature.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');

  return (
    'HMAC-SHA256 ApiKey=' + apiKey +
    ', Date=' + date +
    ', Salt=' + salt +
    ', Signature=' + signatureHex
  );
}
