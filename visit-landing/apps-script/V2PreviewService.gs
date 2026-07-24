/**
 * V2PreviewService.gs
 * Draft Preview URL 생성 + 서명 검증된 draft 페이지 읽기.
 *
 * Web App:
 *   GET ?action=v2.page.preview&siteCode=L001&t=<token>
 *
 * 수동:
 *   createV2PreviewUrl('L001')
 *   createV2PreviewUrl('L001', 'https://allowed.example')
 *
 * Script Properties:
 *   V2_PREVIEW_HMAC_SECRET
 *   V2_PREVIEW_ORIGIN  (comma-separated allowlist)
 *
 * Sheet 수정·Published pointer 변경 없음.
 * 토큰·비밀값을 Logger에 출력하지 않음.
 */

var V2_PREVIEW_TOKEN_VERSION_ = 'v2.preview.v1';
var V2_PREVIEW_TTL_SECONDS_ = 30 * 60;
var V2_PREVIEW_NONCE_RE_ = /^[A-Za-z0-9_-]{16,128}$/;

var V2_PREVIEW_PUBLIC_MESSAGES = {
  V2_PREVIEW_UNAUTHORIZED: 'Preview is not available.',
  V2_PREVIEW_EXPIRED: 'Preview is not available.',
  V2_PREVIEW_FORBIDDEN: 'Preview is not available.',
  V2_SITE_NOT_FOUND: 'Preview is not available.',
  V2_NOT_CONFIGURED: 'Preview is not available.',
  V2_BLOCK_SHEET_MISSING: 'Preview is not available.',
  V2_CONTENT_SHEET_MISSING: 'Preview is not available.',
  V2_DRAFT_ROWS_EMPTY: 'Preview is not available.',
  V2_READ_FAILED: 'Preview is not available.'
};

/** 순수 — Apps Script / Node 교차 테스트용 */
function buildV2PreviewCanonicalString_(siteCode, draftRevisionId, expiresAt, nonce) {
  return [
    V2_PREVIEW_TOKEN_VERSION_,
    String(siteCode || '').trim(),
    String(draftRevisionId || '').trim(),
    String(expiresAt),
    String(nonce || '').trim()
  ].join('\n');
}

function stripBase64Padding_(value) {
  return String(value || '').replace(/=+$/g, '');
}

function bytesToBase64Url_(bytes) {
  return stripBase64Padding_(Utilities.base64EncodeWebSafe(bytes));
}

function signV2PreviewCanonical_(canonical, secret) {
  var bytes = Utilities.computeHmacSha256Signature(canonical, secret);
  return bytesToBase64Url_(bytes);
}

function isValidV2PreviewNonce_(nonce) {
  return V2_PREVIEW_NONCE_RE_.test(String(nonce || '').trim());
}

function encodeV2PreviewTokenJson_(payload) {
  var body = JSON.stringify({
    siteCode: payload.siteCode,
    draftRevisionId: payload.draftRevisionId,
    expiresAt: payload.expiresAt,
    nonce: payload.nonce,
    signature: payload.signature
  });
  // UTF-8 string → web-safe base64 (TS Buffer utf8과 동일)
  return stripBase64Padding_(Utilities.base64EncodeWebSafe(body));
}

function decodeV2PreviewTokenJson_(token) {
  try {
    var raw = String(token || '').trim();
    if (!raw) return null;
    var padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4 !== 0) padded += '=';
    var json = Utilities.newBlob(Utilities.base64Decode(padded)).getDataAsString();
    var parsed = JSON.parse(json);
    var siteCode = String(parsed.siteCode || '').trim();
    var draftRevisionId = String(parsed.draftRevisionId || '').trim();
    var nonce = String(parsed.nonce || '').trim();
    var signature = stripBase64Padding_(String(parsed.signature || '').trim());
    var expiresAt = Number(parsed.expiresAt);
    if (!siteCode || !draftRevisionId || !nonce || !signature) return null;
    if (!isFinite(expiresAt) || expiresAt <= 0) return null;
    if (Math.floor(expiresAt) !== expiresAt) return null;
    return {
      siteCode: siteCode,
      draftRevisionId: draftRevisionId,
      expiresAt: expiresAt,
      nonce: nonce,
      signature: signature
    };
  } catch (err) {
    return null;
  }
}

function mintV2PreviewToken_(fields, secret) {
  var s = String(secret || '');
  if (!s) return null;
  var siteCode = String(fields.siteCode || '').trim();
  var draftRevisionId = String(fields.draftRevisionId || '').trim();
  var nonce = String(fields.nonce || '').trim();
  var expiresAt = Number(fields.expiresAt);
  if (!siteCode || !draftRevisionId || !isValidV2PreviewNonce_(nonce)) return null;
  if (!isFinite(expiresAt) || expiresAt <= 0) return null;
  if (Math.floor(expiresAt) !== expiresAt) return null;
  var canonical = buildV2PreviewCanonicalString_(
    siteCode,
    draftRevisionId,
    expiresAt,
    nonce
  );
  var signature = signV2PreviewCanonical_(canonical, s);
  return encodeV2PreviewTokenJson_({
    siteCode: siteCode,
    draftRevisionId: draftRevisionId,
    expiresAt: expiresAt,
    nonce: nonce,
    signature: signature
  });
}

function verifyV2PreviewToken_(token, secret, expectedSiteCode, nowSeconds) {
  var s = String(secret || '');
  if (!s) return { ok: false, reason: 'missing-secret' };
  var payload = decodeV2PreviewTokenJson_(token);
  if (!payload) return { ok: false, reason: 'invalid-format' };
  if (!isValidV2PreviewNonce_(payload.nonce)) {
    return { ok: false, reason: 'invalid-nonce' };
  }
  var now =
    nowSeconds != null ? Number(nowSeconds) : Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) return { ok: false, reason: 'expired' };
  var canonical = buildV2PreviewCanonicalString_(
    payload.siteCode,
    payload.draftRevisionId,
    payload.expiresAt,
    payload.nonce
  );
  var expected = signV2PreviewCanonical_(canonical, s);
  if (stripBase64Padding_(payload.signature) !== expected) {
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

function getV2PreviewHmacSecret_() {
  var props = PropertiesService.getScriptProperties();
  return String(props.getProperty('V2_PREVIEW_HMAC_SECRET') || '').trim();
}

function getV2PreviewOriginAllowlistRaw_() {
  var props = PropertiesService.getScriptProperties();
  return String(props.getProperty('V2_PREVIEW_ORIGIN') || '').trim();
}

function normalizePreviewOrigin_(value) {
  var t = String(value || '').trim().replace(/\/+$/, '');
  if (!t) return null;
  try {
    // Apps Script has no URL constructor in older runtimes — parse manually
    var m = t.match(/^(https?):\/\/([^\/?#]+)\/?$/i);
    if (!m) return null;
    var host = m[2];
    if (host.indexOf('@') >= 0) return null;
    return m[1].toLowerCase() + '://' + host;
  } catch (err) {
    return null;
  }
}

function parsePreviewOriginAllowlist_(raw) {
  var parts = String(raw || '').split(/[,;\s]+/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var n = normalizePreviewOrigin_(parts[i]);
    if (n) out.push(n);
  }
  return out;
}

function resolveAllowedPreviewOrigin_(requestedOrigin) {
  var allowlist = parsePreviewOriginAllowlist_(getV2PreviewOriginAllowlistRaw_());
  if (allowlist.length === 0) return null;
  var requested = String(requestedOrigin || '').trim();
  if (!requested) return allowlist[0];
  var normalized = normalizePreviewOrigin_(requested);
  if (!normalized) return null;
  for (var i = 0; i < allowlist.length; i++) {
    if (allowlist[i] === normalized) return normalized;
  }
  return null;
}

/**
 * 관리자 수동 호출 — Preview URL 반환. Sheet 미변경.
 * @param {string} siteCode
 * @param {string=} previewOrigin allowlist 내 origin (생략 시 allowlist 첫 항목)
 * @returns {string} Preview enter URL
 */
function createV2PreviewUrl(siteCode, previewOrigin) {
  var code = String(siteCode || '').trim();
  if (!code) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode is required');
  }

  var origin = resolveAllowedPreviewOrigin_(previewOrigin);
  if (!origin) {
    throw createAppError_(
      'VALIDATION_ERROR',
      'V2_PREVIEW_ORIGIN allowlist missing or origin not allowed'
    );
  }

  var secret = getV2PreviewHmacSecret_();
  if (!secret) {
    throw createAppError_(
      'VALIDATION_ERROR',
      'V2_PREVIEW_HMAC_SECRET is not configured'
    );
  }

  var siteRow = findSiteByCode_(code);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', 'site not found');
  }

  var siteHeaders = getHeaderIndexMap_(getSheet_(SHEET_NAMES.SITE));
  if (
    siteHeaders.rendererVersion === undefined ||
    siteHeaders.draftRevisionId === undefined
  ) {
    throw createAppError_('VALIDATION_ERROR', 'v2 columns missing');
  }

  var rendererVersion = String(getField_(siteRow, 'rendererVersion') || '')
    .trim()
    .toLowerCase();
  if (rendererVersion !== 'v2') {
    throw createAppError_('VALIDATION_ERROR', 'rendererVersion must be v2');
  }

  var draftRevisionId = String(getField_(siteRow, 'draftRevisionId') || '').trim();
  if (!draftRevisionId) {
    throw createAppError_('VALIDATION_ERROR', 'draftRevisionId is empty');
  }

  var expiresAt = Math.floor(Date.now() / 1000) + V2_PREVIEW_TTL_SECONDS_;
  var nonce =
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');
  var token = mintV2PreviewToken_(
    {
      siteCode: code,
      draftRevisionId: draftRevisionId,
      expiresAt: expiresAt,
      nonce: nonce
    },
    secret
  );
  if (!token) {
    throw createAppError_('INTERNAL_ERROR', 'failed to mint preview token');
  }

  return (
    origin +
    '/api/preview/enter?siteCode=' +
    encodeURIComponent(code) +
    '&t=' +
    encodeURIComponent(token)
  );
}

function v2PreviewFail_(code) {
  return {
    ok: false,
    code: code,
    message: V2_PREVIEW_PUBLIC_MESSAGES[code] || V2_PREVIEW_PUBLIC_MESSAGES.V2_READ_FAILED
  };
}

/**
 * 공개 응답 엔벨로프 — token 없이 draft 읽기 불가.
 * 요청 revisionId 쿼리는 조회에 사용하지 않음.
 */
function getV2PreviewPagePublic_(params) {
  var siteCode = String((params && params.siteCode) || '').trim();
  var token = String((params && params.t) || (params && params.token) || '').trim();
  if (!siteCode || !token) {
    return v2PreviewFail_('V2_PREVIEW_UNAUTHORIZED');
  }

  try {
    return readV2PreviewPage_(siteCode, token);
  } catch (err) {
    var code = (err && err.code) || 'V2_READ_FAILED';
    if (!V2_PREVIEW_PUBLIC_MESSAGES[code]) {
      code = 'V2_READ_FAILED';
    }
    try {
      Logger.log(
        '[v2.page.preview] siteCode=' + siteCode + ' code=' + code
      );
    } catch (logErr) {
      // ignore — never log token/secret
    }
    return v2PreviewFail_(code);
  }
}

function readV2PreviewPage_(siteCode, token) {
  var secret = getV2PreviewHmacSecret_();
  if (!secret) {
    throw createAppError_('V2_PREVIEW_UNAUTHORIZED', 'secret missing');
  }

  var verified = verifyV2PreviewToken_(token, secret, siteCode, null);
  if (!verified.ok) {
    if (verified.reason === 'expired') {
      throw createAppError_('V2_PREVIEW_EXPIRED', 'expired');
    }
    throw createAppError_('V2_PREVIEW_UNAUTHORIZED', verified.reason || 'bad token');
  }

  var payload = verified.payload;
  var siteRow = findSiteByCode_(siteCode);
  if (!siteRow) {
    throw createAppError_('V2_SITE_NOT_FOUND', 'site not found');
  }

  var siteHeaders = getHeaderIndexMap_(getSheet_(SHEET_NAMES.SITE));
  if (
    siteHeaders.rendererVersion === undefined ||
    siteHeaders.pageSchemaVersion === undefined ||
    siteHeaders.draftRevisionId === undefined
  ) {
    throw createAppError_('V2_NOT_CONFIGURED', 'v2 columns missing');
  }

  var rendererVersion = String(getField_(siteRow, 'rendererVersion') || '')
    .trim()
    .toLowerCase();
  if (rendererVersion !== 'v2') {
    throw createAppError_('V2_PREVIEW_FORBIDDEN', 'rendererVersion not v2');
  }

  // isActive / pageStatus는 Preview를 막지 않음 (draft|published|paused 허용)

  var pageSchemaVersion = String(
    getField_(siteRow, 'pageSchemaVersion') || ''
  ).trim();
  if (!pageSchemaVersion) {
    throw createAppError_('V2_NOT_CONFIGURED', 'pageSchemaVersion empty');
  }

  var currentDraftRevisionId = String(
    getField_(siteRow, 'draftRevisionId') || ''
  ).trim();
  if (!currentDraftRevisionId) {
    throw createAppError_('V2_PREVIEW_FORBIDDEN', 'draftRevisionId empty');
  }
  if (currentDraftRevisionId !== payload.draftRevisionId) {
    throw createAppError_('V2_PREVIEW_FORBIDDEN', 'draftRevisionId mismatch');
  }

  var blockSheet = getSheetOptional_(SHEET_NAMES.V2_BLOCK);
  if (!blockSheet) {
    throw createAppError_('V2_BLOCK_SHEET_MISSING', 'block sheet missing');
  }
  var contentSheet = getSheetOptional_(SHEET_NAMES.V2_CONTENT);
  if (!contentSheet) {
    throw createAppError_('V2_CONTENT_SHEET_MISSING', 'content sheet missing');
  }

  // 요청 revisionId는 무시 — token+현장관리 draftRevisionId만 사용
  var blocks = filterV2RowsForPublished_(
    sheetObjectsFromSheet_(blockSheet),
    siteCode,
    currentDraftRevisionId,
    V2_BLOCK_PUBLIC_COLUMNS
  );
  var contents = filterV2RowsForPublished_(
    sheetObjectsFromSheet_(contentSheet),
    siteCode,
    currentDraftRevisionId,
    V2_CONTENT_PUBLIC_COLUMNS
  );

  if (blocks.length === 0 && contents.length === 0) {
    throw createAppError_('V2_DRAFT_ROWS_EMPTY', 'no draft rows');
  }

  return {
    ok: true,
    data: {
      siteCode: siteCode,
      revisionId: currentDraftRevisionId,
      pageSchemaVersion: pageSchemaVersion,
      blocks: blocks,
      contents: contents
    }
  };
}
