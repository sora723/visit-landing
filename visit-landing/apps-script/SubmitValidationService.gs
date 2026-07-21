/**
 * 접수 검증 — 시트에서만 분류, 접수자에게는 항상 정상 UI
 *
 * 의심표시(접수관리 O, 알림톡 O, 네이버전환 X): 허수의심, 광고신호없음, 중복접수
 * 확정 차단(접수관리 X, _검증로그만): IP차단, IP대량차단, 허니팟차단, 토큰차단
 */

function normalizePhoneStrict_(phone) {
  var digits = normalizePhone_(phone);
  if (/^010\d{8}$/.test(digits)) return digits;
  return '';
}

/** 시트 숫자형(앞 0 누락) 연락처 보정 */
function normalizePhoneStrictFromSheet_(phone) {
  var digits = normalizePhone_(phone);
  if (/^010\d{8}$/.test(digits)) return digits;
  if (/^10\d{8}$/.test(digits)) return '0' + digits;
  return '';
}

function computeElapsedSeconds_(params) {
  var loaded = Number(params.pageLoadedAt);
  if (!loaded || isNaN(loaded)) return null;
  var now = Date.now();
  return Math.max(0, Math.round((now - loaded) / 1000));
}

function hasAdTrafficSignal_(params) {
  var napm = String(params.napm || params.NaPm || '').trim();
  if (napm) return true;
  var utmSource = String(params.utmSource || params.utm_source || '').toLowerCase();
  if (utmSource.indexOf('naver') >= 0) return true;
  var utmMedium = String(params.utmMedium || params.utm_medium || '').toLowerCase();
  if (utmMedium.indexOf('gfa') >= 0 || utmMedium.indexOf('display') >= 0 || utmMedium.indexOf('cpc') >= 0) {
    return true;
  }
  var referer = String(params.referer || '').toLowerCase();
  if (referer.indexOf('naver') >= 0) return true;
  return false;
}

function isBehaviorSuspicious_(params) {
  var changes = Number(params.inputChangeCount || 0);
  var focus = Number(params.inputFocusCount || 0);
  if (changes < 2) return true;
  if (focus < 1) return true;
  return false;
}

function hasPhoneDuplicateWithin_(siteCode, normalizedPhone, ttlSeconds) {
  var rows = sheetToObjects_(SHEET_NAMES.SUBMISSION);
  var now = Date.now();
  var windowMs = (ttlSeconds || 86400) * 1000;

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowSite = getSiteField_(row, ['siteCode', '현장코드']);
    if (rowSite !== siteCode) continue;

    var rowPhone = normalizePhoneStrictFromSheet_(getSiteField_(row, ['phone', '연락처']));
    if (rowPhone !== normalizedPhone) continue;

    var status = String(getSiteField_(row, ['validationStatus', '검증상태']) || '').trim();
    if (status && status !== '정상접수' && status !== '빠른접수') continue;

    var submittedAt = row['createdAt'] || row['접수일시'];
    if (!submittedAt) continue;
    var submittedDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
    if (isNaN(submittedDate.getTime())) continue;
    if (now - submittedDate.getTime() <= windowMs) return true;
  }
  return false;
}

function parseSheetDateMs_(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  var parsed = new Date(value);
  return parsed.getTime();
}

/**
 * _검증로그 기준 — 동일 siteCode + IP 의 최근 시도 건수 (차단 건 포함)
 * 현재 접수는 아직 로그에 없으므로, MAX=3 이면 기존 3건 이후(4건째)부터 차단
 */
function countIpAttemptsWithin_(siteCode, clientIp, windowSeconds) {
  var normalized = normalizeClientIp_(clientIp);
  if (!normalized) return 0;

  var sheet = getSheetOptional_(SHEET_NAMES.VERIFICATION_LOG);
  if (!sheet) return 0;

  var rows = sheetToObjects_(SHEET_NAMES.VERIFICATION_LOG);
  var now = Date.now();
  var windowMs = Math.max(1, Number(windowSeconds) || 600) * 1000;
  var count = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowSite = String(row.siteCode || row['현장코드'] || '').trim();
    if (rowSite !== siteCode) continue;

    var rowIp = normalizeClientIp_(row.ip || row['IP'] || '');
    if (!rowIp || rowIp !== normalized) continue;

    var recordedAt = row['기록시간'] || row.createdAt || row['접수일시'];
    var recordedMs = parseSheetDateMs_(recordedAt);
    if (isNaN(recordedMs)) continue;
    if (now - recordedMs > windowMs) break;
    count += 1;
  }
  return count;
}

function buildBulkIpBlockResult_(elapsed, count, maxCount, windowSeconds) {
  return buildValidationResult_(
    'IP대량차단',
    'bulk_ip:' + count + '>=' + maxCount + '/' + windowSeconds + 's',
    false,
    false,
    elapsed,
    { shouldNotify: false }
  );
}

function classifySubmission_(params, validated, siteCode) {
  var cfg = SUBMIT_VALIDATION_CONFIG;
  var reasons = [];
  var elapsed = computeElapsedSeconds_(params);
  var adSignal = hasAdTrafficSignal_(params);
  var behaviorSuspicious = isBehaviorSuspicious_(params);
  var clientIp = normalizeClientIp_(params.clientIp);

  if (String(params.company || '').trim()) {
    return buildValidationResult_('허니팟차단', 'honeypot', false, false, elapsed);
  }

  if (clientIp && isIpBlocked_(clientIp, siteCode)) {
    return buildIpBlockResult_('ip_blocked', elapsed);
  }

  if (!consumeFormToken_(params.formToken, siteCode)) {
    return buildValidationResult_('토큰차단', 'invalid_token', false, false, elapsed);
  }

  var strictPhone = normalizePhoneStrict_(validated.phone);
  if (!strictPhone) {
    return buildValidationResult_('오류', 'invalid_phone', false, false, elapsed);
  }
  validated.phone = strictPhone;

  var bulkWindow = Number(cfg.BULK_IP_WINDOW_SECONDS) || 600;
  var bulkMax = Number(cfg.BULK_IP_MAX_COUNT) || 3;
  if (clientIp && bulkMax > 0) {
    var recentIpCount = countIpAttemptsWithin_(siteCode, clientIp, bulkWindow);
    if (recentIpCount >= bulkMax) {
      registerTemporaryIpBlockFromBulk_(
        clientIp,
        siteCode,
        recentIpCount,
        bulkMax,
        bulkWindow
      );
      return buildBulkIpBlockResult_(elapsed, recentIpCount, bulkMax, bulkWindow);
    }
  }

  if (hasPhoneDuplicateWithin_(siteCode, strictPhone, cfg.DUPLICATE_PHONE_TTL_SECONDS)) {
    return buildSuspicionResult_('중복접수', 'phone_24h', elapsed);
  }

  if (!adSignal) {
    reasons.push('no_ad_signal');
    if (behaviorSuspicious) reasons.push('behavior');
    if (elapsed != null && elapsed <= cfg.VERY_FAST_SUBMIT_SECONDS) reasons.push('very_fast');
    if (
      !cfg.REQUIRE_AD_SIGNAL_FOR_CONVERSION &&
      !behaviorSuspicious &&
      elapsed != null &&
      elapsed >= cfg.FAST_SUBMIT_SECONDS
    ) {
      return buildValidationResult_('정상접수', reasons.join(','), true, true, elapsed);
    }
    var noAdStatus = behaviorSuspicious ? '허수의심' : '광고신호없음';
    return buildSuspicionResult_(noAdStatus, reasons.join(','), elapsed);
  }

  reasons.push('ad_signal');
  if (
    (elapsed != null && elapsed <= cfg.VERY_FAST_SUBMIT_SECONDS) ||
    behaviorSuspicious
  ) {
    if (elapsed != null && elapsed <= cfg.VERY_FAST_SUBMIT_SECONDS) reasons.push('very_fast');
    if (behaviorSuspicious) reasons.push('behavior');
    return buildSuspicionResult_('허수의심', reasons.join(','), elapsed);
  }

  if (elapsed != null && elapsed < cfg.FAST_SUBMIT_SECONDS) {
    reasons.push('fast_submit');
    var allowFast = cfg.ENABLE_FAST_SUBMIT_CONVERSION === true;
    return buildValidationResult_('빠른접수', reasons.join(','), allowFast, true, elapsed);
  }

  reasons.push('normal_timing');
  return buildValidationResult_('정상접수', reasons.join(','), true, true, elapsed);
}

function buildSuspicionResult_(status, reasons, elapsed) {
  return buildValidationResult_(status, reasons, false, true, elapsed, {
    shouldNotify: true
  });
}

function buildValidationResult_(status, reasons, allowConversion, shouldSave, elapsed, options) {
  var opts = options || {};
  var shouldNotify =
    opts.shouldNotify !== undefined
      ? opts.shouldNotify === true
      : isAcceptedSubmissionStatus_(status);

  return {
    validationStatus: status,
    suspicionReasons: reasons || '',
    allowConversion: allowConversion === true,
    shouldSaveToSubmissions: shouldSave === true,
    shouldNotify: shouldNotify,
    elapsedSeconds: elapsed,
    clientIp: opts.clientIp || ''
  };
}

function isAcceptedSubmissionStatus_(status) {
  return status === '정상접수' || status === '빠른접수';
}
