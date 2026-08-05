/**
 * form_token — 발급(레거시 UUID 캐시) + 소비(UUID 캐시 | HMAC 서명)
 *
 * 전환 안전:
 *   - issue: 기존처럼 CacheService UUID (Netlify 폴백/롤백용)
 *   - consume: ft:캐시 우선 → 없으면 FORM_TOKEN_HMAC_SECRET 서명 검증 + nonce 1회
 *
 * Script Properties:
 *   FORM_TOKEN_HMAC_SECRET  (Netlify FORM_TOKEN_HMAC_SECRET 과 동일 값)
 */

var FORM_TOKEN_VERSION_ = 'form.token.v1';
var FORM_TOKEN_NONCE_RE_ = /^[A-Za-z0-9_-]{16,128}$/;
var FORM_TOKEN_CLOCK_SKEW_SECONDS_ = 60;

function getFormTokenHmacSecret_() {
  return String(
    PropertiesService.getScriptProperties().getProperty('FORM_TOKEN_HMAC_SECRET') ||
      ''
  ).trim();
}

/** 관리자 1회 설정 — 비밀값을 Logger에 출력하지 않음 */
function setFormTokenHmacSecret(secret) {
  var s = String(secret || '').trim();
  if (s.length < 32) {
    throw new Error('FORM_TOKEN_HMAC_SECRET must be at least 32 characters');
  }
  PropertiesService.getScriptProperties().setProperty(
    'FORM_TOKEN_HMAC_SECRET',
    s
  );
  return { ok: true, length: s.length };
}

/**
 * Web App bootstrap — action=setup.formTokenHmac&secret=...
 * force=1 이면 기존 값 덮어씀 (Netlify와 동일 키 맞출 때).
 */
function handleSetupFormTokenHmac(params) {
  var force =
    String((params && (params.force || params.overwrite)) || '').trim() === '1';
  var existing = getFormTokenHmacSecret_();
  if (existing && !force) {
    return { ok: true, alreadySet: true, length: existing.length };
  }
  var secret = String(
    (params && (params.secret || params.FORM_TOKEN_HMAC_SECRET)) || ''
  ).trim();
  var result = setFormTokenHmacSecret(secret);
  result.overwritten = Boolean(existing);
  return result;
}

function issueFormToken_(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode는 필수입니다');
  }
  var token = Utilities.getUuid();
  var ttl = SUBMIT_VALIDATION_CONFIG.TOKEN_TTL_SECONDS || 600;
  CacheService.getScriptCache().put('ft:' + token, code, ttl);
  return {
    formToken: token,
    expiresIn: ttl
  };
}

function consumeFormToken_(token, siteCode) {
  var trimmed = String(token || '').trim();
  var code = String(siteCode || '').trim();
  if (!trimmed || !code) return false;

  var cache = CacheService.getScriptCache();
  var legacyKey = 'ft:' + trimmed;
  var cached = cache.get(legacyKey);
  if (cached) {
    if (cached !== code) return false;
    cache.remove(legacyKey);
    return true;
  }

  return consumeSignedFormToken_(trimmed, code, cache);
}

function consumeSignedFormToken_(token, siteCode, cache) {
  var secret = getFormTokenHmacSecret_();
  if (!secret) return false;

  var verified = verifySignedFormToken_(token, secret, siteCode, null);
  if (!verified.ok) return false;

  var nonce = verified.payload.nonce;
  var usedKey = 'ftn:' + nonce;
  if (cache.get(usedKey)) return false;

  var ttl = SUBMIT_VALIDATION_CONFIG.TOKEN_TTL_SECONDS || 600;
  var remaining = verified.payload.expiresAt - Math.floor(Date.now() / 1000);
  if (remaining < 1) remaining = 1;
  if (remaining > ttl) remaining = ttl;
  cache.put(usedKey, siteCode, remaining);
  return true;
}

function buildFormTokenCanonical_(siteCode, expiresAt, nonce) {
  return [
    FORM_TOKEN_VERSION_,
    String(siteCode || '').trim(),
    String(expiresAt),
    String(nonce || '').trim()
  ].join('\n');
}

function isValidFormTokenNonce_(nonce) {
  return FORM_TOKEN_NONCE_RE_.test(String(nonce || '').trim());
}

function stripFormTokenBase64Padding_(value) {
  return String(value || '').replace(/=+$/g, '');
}

function signFormTokenCanonical_(canonical, secret) {
  var bytes = Utilities.computeHmacSha256Signature(canonical, secret);
  return stripFormTokenBase64Padding_(Utilities.base64EncodeWebSafe(bytes));
}

function decodeFormTokenJson_(token) {
  try {
    var raw = String(token || '').trim();
    if (!raw) return null;
    var padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4 !== 0) padded += '=';
    var json = Utilities.newBlob(Utilities.base64Decode(padded)).getDataAsString();
    var parsed = JSON.parse(json);
    if (String(parsed.v || '').trim() !== FORM_TOKEN_VERSION_) return null;
    var siteCode = String(parsed.siteCode || '').trim();
    var nonce = String(parsed.nonce || '').trim();
    var signature = stripFormTokenBase64Padding_(
      String(parsed.signature || '').trim()
    );
    var expiresAt = Number(parsed.expiresAt);
    if (!siteCode || !nonce || !signature) return null;
    if (!isFinite(expiresAt) || expiresAt <= 0) return null;
    if (Math.floor(expiresAt) !== expiresAt) return null;
    return {
      siteCode: siteCode,
      expiresAt: expiresAt,
      nonce: nonce,
      signature: signature
    };
  } catch (err) {
    return null;
  }
}

function verifySignedFormToken_(token, secret, expectedSiteCode, nowSeconds) {
  var s = String(secret || '');
  if (!s) return { ok: false, reason: 'missing-secret' };
  var payload = decodeFormTokenJson_(token);
  if (!payload) return { ok: false, reason: 'invalid-format' };
  if (!isValidFormTokenNonce_(payload.nonce)) {
    return { ok: false, reason: 'invalid-nonce' };
  }
  var now =
    nowSeconds != null ? Number(nowSeconds) : Math.floor(Date.now() / 1000);
  if (payload.expiresAt + FORM_TOKEN_CLOCK_SKEW_SECONDS_ < now) {
    return { ok: false, reason: 'expired' };
  }
  var canonical = buildFormTokenCanonical_(
    payload.siteCode,
    payload.expiresAt,
    payload.nonce
  );
  var expected = signFormTokenCanonical_(canonical, s);
  if (stripFormTokenBase64Padding_(payload.signature) !== expected) {
    return { ok: false, reason: 'bad-signature' };
  }
  if (
    expectedSiteCode &&
    String(expectedSiteCode).trim() !== payload.siteCode
  ) {
    return { ok: false, reason: 'site-mismatch' };
  }
  return { ok: true, payload: payload };
}

function handleFormTokenIssue(params) {
  return issueFormToken_(params.siteCode);
}
