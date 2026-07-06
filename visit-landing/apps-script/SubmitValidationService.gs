/**
 * 접수 검증 — 시트에서만 분류, 접수자에게는 항상 정상 UI
 */

function normalizePhoneStrict_(phone) {
  var digits = normalizePhone_(phone);
  if (/^010\d{8}$/.test(digits)) return digits;
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

    var rowPhone = normalizePhoneStrict_(getSiteField_(row, ['phone', '연락처']));
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
    return buildIpSuspicionResult_('ip_blocked', elapsed);
  }

  if (clientIp && hasPriorIpSubmission_(clientIp, siteCode)) {
    return buildIpSuspicionResult_('ip_repeat', elapsed);
  }

  if (!consumeFormToken_(params.formToken, siteCode)) {
    return buildValidationResult_('토큰차단', 'invalid_token', false, false, elapsed);
  }

  var strictPhone = normalizePhoneStrict_(validated.phone);
  if (!strictPhone) {
    return buildValidationResult_('오류', 'invalid_phone', false, false, elapsed);
  }
  validated.phone = strictPhone;

  if (hasPhoneDuplicateWithin_(siteCode, strictPhone, cfg.DUPLICATE_PHONE_TTL_SECONDS)) {
    return buildValidationResult_('중복접수', 'phone_24h', false, true, elapsed);
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
    return buildValidationResult_(noAdStatus, reasons.join(','), false, true, elapsed);
  }

  reasons.push('ad_signal');
  if (
    (elapsed != null && elapsed <= cfg.VERY_FAST_SUBMIT_SECONDS) ||
    behaviorSuspicious
  ) {
    if (elapsed != null && elapsed <= cfg.VERY_FAST_SUBMIT_SECONDS) reasons.push('very_fast');
    if (behaviorSuspicious) reasons.push('behavior');
    return buildValidationResult_('허수의심', reasons.join(','), false, true, elapsed);
  }

  if (elapsed != null && elapsed < cfg.FAST_SUBMIT_SECONDS) {
    reasons.push('fast_submit');
    var allowFast = cfg.ENABLE_FAST_SUBMIT_CONVERSION === true;
    return buildValidationResult_('빠른접수', reasons.join(','), allowFast, true, elapsed);
  }

  reasons.push('normal_timing');
  return buildValidationResult_('정상접수', reasons.join(','), true, true, elapsed);
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
