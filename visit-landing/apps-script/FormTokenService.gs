/**
 * form_token — 페이지 로드 시 발급, 제출 시 1회 소비
 */

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
  var key = 'ft:' + trimmed;
  var cached = cache.get(key);
  if (!cached || cached !== code) return false;
  cache.remove(key);
  return true;
}

function handleFormTokenIssue(params) {
  return issueFormToken_(params.siteCode);
}
