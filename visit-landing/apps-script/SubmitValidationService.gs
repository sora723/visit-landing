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

/**
 * 접수 내용 지문 — 전부 같으면 중복, 하나라도 다르면 신규
 * (이름·전화·평형·방문일·시간·생년월일·지역·문의·연령대)
 */
function submissionContentFingerprint_(siteCode, validated) {
  var v = validated || {};
  return [
    String(siteCode || '').trim(),
    normalizePhone_(v.phone),
    normalizeSubmissionField_(v.name),
    normalizeConsultTypeForCompare_(v.consultType),
    normalizeSubmissionField_(v.reserveDate),
    normalizeSubmissionField_(v.reserveTime),
    normalizeSubmissionField_(v.birthDate),
    normalizeSubmissionField_(v.region),
    normalizeSubmissionField_(v.inquiry),
    normalizeSubmissionField_(v.ageRange)
  ].join('|');
}

/**
 * 알림·접수 이력이 있는 검증상태 — 동일내용 중복 판정에 포함.
 * 검수중은 제외(동시 연타 시 서로 막아 카톡 0건 되는 것 방지).
 * 동시성은 markIdenticalSubmissionCache_ claim 으로 막음.
 */
function isIdenticalMatchStatus_(status) {
  var s = String(status || '').trim();
  if (!s) return true;
  return (
    s === '정상접수' ||
    s === '빠른접수' ||
    s === '허수의심' ||
    s === '광고신호없음' ||
    s === '중복접수'
  );
}

/**
 * 동일 현장+동일 접수내용 최근 건 조회.
 * options.submissionId — 자기 자신(재시도)은 중복으로 치지 않음.
 * returns { hit, ageMs, reason } | null
 */
function findIdenticalSubmissionWithin_(siteCode, validated, ttlSeconds, options) {
  var opts = options || {};
  var currentId = String(opts.submissionId || '').trim();
  var phone = normalizePhoneStrict_(validated && validated.phone);
  if (!siteCode || !phone) return null;

  var cache = CacheService.getScriptCache();
  var fp = submissionContentFingerprint_(siteCode, validated);
  var cacheKey = 'phc:' + fp;
  var cached = cache.get(cacheKey);
  if (cached) {
    if (currentId && String(cached) === currentId) {
      /** 같은 submissionId 의 알림 재시도 — 중복 아님 */
    } else {
      return { hit: true, ageMs: 0, reason: 'same_content_cache' };
    }
  }

  var cfg = SUBMIT_VALIDATION_CONFIG || {};
  var negKey = 'phc0:' + fp;
  if (cache.get(negKey)) return null;

  var now = Date.now();
  var windowMs = (ttlSeconds || 86400) * 1000;
  var bestAge = null;

  var maxSubRows = Number(cfg.VALIDATION_RECENT_SUBMISSION_ROWS) || 200;
  var subRows = readRecentSheetObjects_(SHEET_NAMES.SUBMISSION, maxSubRows);
  for (var i = subRows.length - 1; i >= 0; i--) {
    var row = subRows[i];
    var rowSite = getSiteField_(row, ['siteCode', '현장코드']);
    if (rowSite !== siteCode) continue;

    var rowId = String(
      getSiteField_(row, ['submissionId', '접수ID', 'id']) || ''
    ).trim();
    if (currentId && rowId && rowId === currentId) continue;

    var rowPhone = normalizePhoneStrictFromSheet_(
      getSiteField_(row, ['phone', '연락처'])
    );
    if (rowPhone !== phone) continue;
    if (!isSameSubmissionContent_(row, validated)) continue;

    var status = String(
      getSiteField_(row, ['validationStatus', '검증상태']) || ''
    ).trim();
    if (!isIdenticalMatchStatus_(status)) continue;

    var submittedAt = row['createdAt'] || row['접수일시'];
    if (!submittedAt) continue;
    var submittedDate =
      submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
    if (isNaN(submittedDate.getTime())) continue;
    var age = now - submittedDate.getTime();
    if (age < 0) age = 0;
    if (age <= windowMs && (bestAge === null || age < bestAge)) {
      bestAge = age;
    }
  }

  var maxLogRows = Number(cfg.VALIDATION_RECENT_LOG_ROWS) || 200;
  var logRows = readRecentSheetObjects_(SHEET_NAMES.VERIFICATION_LOG, maxLogRows);
  for (var j = logRows.length - 1; j >= 0; j--) {
    var logRow = logRows[j];
    var logSite = String(logRow.siteCode || logRow['현장코드'] || '').trim();
    if (logSite !== siteCode) continue;

    var logId = String(logRow.submissionId || logRow['접수ID'] || '').trim();
    if (currentId && logId && logId === currentId) continue;

    var logPhone = normalizePhoneStrictFromSheet_(
      logRow['정규화연락처'] || logRow['연락처'] || logRow.phone || ''
    );
    if (logPhone !== phone) continue;
    if (!isSameSubmissionContent_(logRow, validated)) continue;

    var logStatus = String(logRow['검증상태'] || '').trim();
    if (!isIdenticalMatchStatus_(logStatus)) continue;

    var recorded = logRow['기록시간'] || logRow.createdAt || logRow['접수일시'];
    var recordedMs = parseSheetDateMs_(recorded);
    if (isNaN(recordedMs)) continue;
    var logAge = now - recordedMs;
    if (logAge < 0) logAge = 0;
    if (logAge <= windowMs && (bestAge === null || logAge < bestAge)) {
      bestAge = logAge;
    }
  }

  if (bestAge !== null) {
    cache.put(
      cacheKey,
      currentId || '1',
      Math.min(21600, Math.max(60, ttlSeconds || 86400))
    );
    var notifyBlockMs =
      (Number(cfg.IDENTICAL_CONTENT_NOTIFY_BLOCK_SECONDS) || 600) * 1000;
    return {
      hit: true,
      ageMs: bestAge,
      reason:
        bestAge <= notifyBlockMs ? 'same_content_10m' : 'same_content_24h'
    };
  }

  var negTtl = Number(cfg.DUPLICATE_PHONE_NEGATIVE_CACHE_SECONDS) || 300;
  cache.put(negKey, '1', Math.min(21600, Math.max(60, negTtl)));
  return null;
}

function hasIdenticalSubmissionWithin_(siteCode, validated, ttlSeconds, options) {
  return !!findIdenticalSubmissionWithin_(siteCode, validated, ttlSeconds, options);
}

/**
 * 알림 직전 claim — 동시 postProcess 연타 시 첫 건만 카톡.
 * 값은 submissionId (같은 ID 재시도는 통과).
 */
function markIdenticalSubmissionCache_(siteCode, validated, ttlSeconds, submissionId) {
  if (!siteCode || !validated || !validated.phone) return;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'phc:' + submissionContentFingerprint_(siteCode, validated);
  var existing = cache.get(cacheKey);
  var id = String(submissionId || '').trim() || '1';
  if (existing && existing !== id && existing !== '1') return;
  cache.put(cacheKey, id, Math.min(21600, Math.max(60, Number(ttlSeconds) || 86400)));
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
 * 현재 접수는 아직 카운트에 없으므로, MAX=8 이면 기존 8건 이후(9건째)부터 차단
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
  var submissionId = String(
    opts.submissionId || params.submissionId || ''
  ).trim();

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

  var identical = findIdenticalSubmissionWithin_(
    siteCode,
    validated,
    cfg.DUPLICATE_PHONE_TTL_SECONDS,
    { submissionId: submissionId }
  );
  if (identical && identical.hit) {
    var notifyBlockSec =
      Number(cfg.IDENTICAL_CONTENT_NOTIFY_BLOCK_SECONDS) || 600;
    var withinNotifyBlock =
      identical.ageMs == null || identical.ageMs <= notifyBlockSec * 1000;
    var dupReason = withinNotifyBlock
      ? identical.reason === 'same_content_cache'
        ? 'same_content_10m'
        : identical.reason || 'same_content_10m'
      : 'same_content_24h';
    return buildValidationResult_(
      '중복접수',
      dupReason,
      false,
      true,
      elapsed,
      { shouldNotify: !withinNotifyBlock }
    );
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
