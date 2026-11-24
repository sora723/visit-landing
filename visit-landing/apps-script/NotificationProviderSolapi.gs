/**
 * NotificationProviderSolapi.gs
 * VisitLanding — Solapi 알림 Provider (기본)
 *
 * Script Properties:
 *   SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE
 *   SOLAPI_PF_ID, SOLAPI_TEMPLATE_ID_SUBMISSION (선택, 알림톡)
 *
 * 현장관리 오버라이드 (선택):
 *   solapiTemplateId — 비우면 SOLAPI_TEMPLATE_ID_SUBMISSION
 *   solapiPfId — 비우면 SOLAPI_PF_ID (채널이 다른 템플릿일 때만)
 */

var SolapiNotificationProvider_ = {
  id: 'solapi',

  send: function (notification) {
    var config = getSolapiProviderConfig_();
    validateSolapiConfig_(config);

    var messageBody = SolapiNotificationProvider_.buildMessageBody(notification);
    var requestBody = buildSolapiRequestBody_(notification, messageBody, config);

    var response = callSolapiApi_(requestBody, config);
    return { messageId: response.messageId || '' };
  },

  buildMessageBody: function (notification) {
    var prefix = notification.isTest ? '[테스트] ' : '';

    if (notification.type === 'test') {
      return (
        prefix + '[VisitLanding 테스트 알림]\n' +
        '현장명: ' + notification.siteName + '\n' +
        '알림 발송이 정상 동작합니다.'
      );
    }

    var lines = [
      prefix + notification.siteName,
      '',
      '관심등록이 접수되었습니다.',
      '',
      '이름: ' + notification.customerName,
      '연락처: ' + formatPhoneDisplay_(notification.customerPhone),
      '유형:' + (notification.consultType || '관심등록'),
      '방문일자:' + (notification.reserveDisplay || '미정')
    ];
    if (notification.birthDate) {
      lines.push('생년월일:' + notification.birthDate);
    }
    if (notification.region) {
      lines.push('지역:' + notification.region);
    }
    if (notification.trafficSource) {
      lines.push('경로:' + notification.trafficSource);
    }
    return lines.join('\n');
  }
};

function formatPhoneDisplay_(phone) {
  var digits = normalizeMobilePhone_(phone) || String(phone || '').replace(/\D/g, '');
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

function formatVisitDateDisplay_(dateStr) {
  if (!dateStr) return '미정';
  var raw = String(dateStr).trim();
  var parts = raw.split('-');
  if (parts.length !== 3) return raw;
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  if (!year || !month || !day) return raw;
  var d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return raw;
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  return month + '월 ' + day + '일 (' + days[d.getDay()] + ')';
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
    /** 알림톡 실패 시 LMS 대체·일부 템플릿 경로용 — 비우지 않음 */
    text: messageBody
  };

  var templateId = notification.isTest
    ? config.templateIdTest
    : String(notification.solapiTemplateId || '').trim() ||
      config.templateIdSubmission;
  var pfId =
    String(notification.solapiPfId || '').trim() || config.pfId;

  if (pfId && templateId) {
    message.kakaoOptions = {
      pfId: pfId,
      templateId: templateId,
      variables: buildSolapiTemplateVariables_(notification)
    };
  }

  return { message: message };
}

/**
 * 알림톡 템플릿 치환값.
 * 템플릿에 있는 키만 쓰이므로 현장별 문안 차이를 위해 별칭을 함께 넣음.
 * (예: [#{현장명}] / 이름·연락처·문의내용)
 */
function buildSolapiTemplateVariables_(notification) {
  var site = String(notification.siteName || '').trim();
  var name = String(notification.customerName || '').trim();
  var phone = formatPhoneDisplay_(notification.customerPhone) || '';
  var type = String(notification.consultType || '').trim() || '관심등록';
  var visitDate = String(notification.reserveDisplay || '').trim() || '미정';
  var birthDate = String(notification.birthDate || '').trim();
  var region = String(notification.region || '').trim();
  var inquiry = String(notification.inquiry || '').trim();
  var trafficSource = String(notification.trafficSource || '').trim();
  if (trafficSource === '직접유입') trafficSource = '';

  /** 문의내용 — 유형·방문·기타문의 묶음 (빈 칸 방지) */
  var inquiryParts = [];
  if (type) inquiryParts.push(type);
  if (visitDate && visitDate !== '미정') inquiryParts.push('방문 ' + visitDate);
  if (birthDate) inquiryParts.push('생년월일 ' + birthDate);
  if (region) inquiryParts.push('지역 ' + region);
  if (inquiry) inquiryParts.push(inquiry);
  if (trafficSource) inquiryParts.push('경로 ' + trafficSource);
  var inquiryContent = inquiryParts.join(' / ') || type;

  var vars = {};
  function put_(key, value) {
    vars[key] = value == null ? '' : String(value);
  }

  /** 영문 키 — 솔라피 「단일페이지 고급형」 등 (#{site}/#{name}/#{phone}/#{inquiry}) */
  put_('#{site}', site);
  put_('#{name}', name);
  put_('#{phone}', phone);
  put_('#{inquiry}', inquiryContent);

  /** 한글 키 — 구 템플릿 호환 */
  put_('#{현장명}', site);
  put_('#{브랜드}', site);
  put_('#{단지명}', site);
  put_('#{프로젝트}', site);
  put_('#{광고명}', site);

  put_('#{이름}', name);
  put_('#{성함}', name);
  put_('#{고객명}', name);

  put_('#{연락처}', phone);
  put_('#{휴대폰}', phone);
  put_('#{전화번호}', phone);

  put_('#{유형}', type);
  put_('#{문의내용}', inquiryContent);
  put_('#{문의}', inquiryContent);
  put_('#{상담내용}', inquiryContent);

  put_('#{방문일자}', visitDate);
  put_('#{방문일시}', visitDate);
  put_('#{생년월일}', birthDate);
  put_('#{지역}', region);
  put_('#{경로}', trafficSource);
  put_('#{예상경로}', trafficSource);
  put_('#{유입경로}', trafficSource);
  put_('#{utm_source}', trafficSource);

  return vars;
}

function callSolapiApi_(requestBody, config) {
  var url = 'https://api.solapi.com/messages/v4/send';
  var payload = JSON.stringify(requestBody);
  var authHeader = buildSolapiAuthHeader_(config.apiKey, config.apiSecret, payload);

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: authHeader },
    payload: payload,
    muteHttpExceptions: true
  });

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
