/**
 * 접수 검증 — postProcess에서 분류, 접수자에게는 항상 정상 UI
 *
 * 알림톡 발송 성공 건만 접수관리에 추가
 * 확정 차단·알림 실패: _검증로그만
 */

function normalizePhoneStrict_(phone) {
  return normalizeMobilePhone_(phone);
}

/** 시트 숫자형(앞 0 누락) 연락처 보정 */
function normalizePhoneStrictFromSheet_(phone) {
  return normalizeMobilePhone_(phone);
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
  var cache = CacheService.getScriptCache();
  var cacheKey = 'ph:' + siteCode + ':' + normalizedPhone;
  if (cache.get(cacheKey)) return true;

  var cfg = SUBMIT_VALIDATION_CONFIG || {};
  var maxRows = Number(cfg.VALIDATION_RECENT_SUBMISSION_ROWS) || 800;
  var rows = readRecentSheetObjects_(SHEET_NAMES.SUBMISSION, maxRows);
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
    if (now - submittedDate.getTime() <= windowMs) {
      /** CacheService 최대 6시간 — 24h 전체는 시트 최근행으로 보완 */
      cache.put(cacheKey, '1', Math.min(21600, Math.max(60, ttlSeconds || 86400)));
      return true;
    }
  }
  return false;
}

function markPhoneSubmittedCache_(siteCode, normalizedPhone, ttlSeconds) {
  if (!siteCode || !normalizedPhone) return;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'ph:' + siteCode + ':' + normalizedPhone;
  cache.put(cacheKey, '1', Math.min(21600, Math.max(60, Number(ttlSeconds) || 86400)));
}

function parseSheetDateMs_(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  var parsed = new Date(value);
  return parsed.getTime();
}

function ipAttemptCacheKey_(siteCode, clientIp) {
  return 'bip:' + siteCode + ':' + normalizeClientIp_(clientIp);
}

function countIpAttemptsFromRecentSheet_(siteCode, normalizedIp, windowSeconds) {
  var cfg = SUBMIT_VALIDATION_CONFIG || {};
  var maxRows = Number(cfg.VALIDATION_RECENT_LOG_ROWS) || 400;
  var rows = readRecentSheetObjects_(SHEET_NAMES.VERIFICATION_LOG, maxRows);
  var now = Date.now();
  var windowMs = Math.max(1, Number(windowSeconds) || 600) * 1000;
  var count = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowSite = String(row.siteCode || row['현장코드'] || '').trim();
    if (rowSite !== siteCode) continue;

    var rowIp = normalizeClientIp_(row.ip || row['IP'] || '');
    if (!rowIp || rowIp !== normalizedIp) continue;

    var recordedAt = row['기록시간'] || row.createdAt || row['접수일시'];
    var recordedMs = parseSheetDateMs_(recordedAt);
    if (isNaN(recordedMs)) continue;
    if (now - recordedMs > windowMs) continue;
    count += 1;
  }
  return count;
}

/**
 * _검증로그 기준 — 동일 siteCode + IP 의 최근 시도 건수
 * CacheService 우선 (검증로그 비동기화 대응), 없으면 최근 N행만 스캔
 * 현재 접수는 아직 카운트에 없으므로, MAX=3 이면 기존 3건 이후(4건째)부터 차단
 */
function countIpAttemptsWithin_(siteCode, clientIp, windowSeconds) {
  var normalized = normalizeClientIp_(clientIp);
  if (!normalized) return 0;

  var cache = CacheService.getScriptCache();
  var key = ipAttemptCacheKey_(siteCode, normalized);
  var cached = cache.get(key);
  if (cached !== null && cached !== undefined && cached !== '') {
    var n = Number(cached);
    return isNaN(n) ? 0 : n;
  }

  var fromSheet = countIpAttemptsFromRecentSheet_(siteCode, normalized, windowSeconds);
  var ttl = Math.min(21600, Math.max(60, Number(windowSeconds) || 600));
  cache.put(key, String(fromSheet), ttl);
  return fromSheet;
}

function bumpIpAttemptCache_(siteCode, clientIp, windowSeconds) {
  var normalized = normalizeClientIp_(clientIp);
  if (!normalized) return 0;
  var current = countIpAttemptsWithin_(siteCode, normalized, windowSeconds);
  var next = current + 1;
  var cache = CacheService.getScriptCache();
  var ttl = Math.min(21600, Math.max(60, Number(windowSeconds) || 600));
  cache.put(ipAttemptCacheKey_(siteCode, normalized), String(next), ttl);
  return next;
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

/**
 * options.skipTokenConsume — submit에서 이미 토큰 소모한 뒤 postProcess용
 * options.skipHoneypot — submit에서 이미 허니팟 처리한 뒤
 */
function classifySubmission_(params, validated, siteCode, options) {
  var opts = options || {};
  var cfg = SUBMIT_VALIDATION_CONFIG;
  var reasons = [];
  var elapsed = computeElapsedSeconds_(params);
  var adSignal = hasAdTrafficSignal_(params);
  var behaviorSuspicious = isBehaviorSuspicious_(params);
  var clientIp = normalizeClientIp_(params.clientIp);

  if (!opts.skipHoneypot && String(params.company || '').trim()) {
    return buildValidationResult_('허니팟차단', 'honeypot', false, false, elapsed);
  }

  if (clientIp && isIpBlocked_(clientIp, siteCode)) {
    return buildIpBlockResult_('ip_blocked', elapsed);
  }

  if (!opts.skipTokenConsume && !consumeFormToken_(params.formToken, siteCode)) {
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
      bumpIpAttemptCache_(siteCode, clientIp, bulkWindow);
      registerTemporaryIpBlockFromBulk_(
        clientIp,
        siteCode,
        recentIpCount,
        bulkMax,
        bulkWindow
      );
      return buildBulkIpBlockResult_(elapsed, recentIpCount, bulkMax, bulkWindow);
    }
    /** 이번 시도 반영 — 검증로그 비동기여도 4건째 차단 유지 */
    bumpIpAttemptCache_(siteCode, clientIp, bulkWindow);
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
