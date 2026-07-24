/**
 * V2PageReadService.gs
 * 공개 Published V2 페이지 읽기 전용 (Draft/Preview 없음)
 *
 * Web App:
 *   GET ?action=v2.page.published&siteCode=L001
 *
 * 클라이언트가 revisionId를 지정할 수 없음.
 * publishedRevisionId는 현장관리에서 서버가 결정한다.
 *
 * Sheet 탭/컬럼을 생성하지 않음.
 * 요청 파라미터의 revisionId 필드는 조회에 사용하지 않음.
 */

var V2_PUBLIC_MESSAGES = {
  V2_SITE_NOT_FOUND: 'Site was not found.',
  V2_NOT_CONFIGURED: 'V2 published page is not configured.',
  V2_NOT_PUBLISHED: 'Published V2 page is not available.',
  V2_BLOCK_SHEET_MISSING: 'Published V2 page is not available.',
  V2_CONTENT_SHEET_MISSING: 'Published V2 page is not available.',
  V2_PUBLISHED_ROWS_EMPTY: 'Published V2 page is not available.',
  V2_READ_FAILED: 'Published V2 page is not available.'
};

/** V2_BLOCK_PUBLIC_COLUMNS / V2_CONTENT_PUBLIC_COLUMNS — V2SheetSchemaService.gs 단일 정의 */

/**
 * 공개 응답 엔벨로프 (Main에서 success 래퍼 없이 그대로 반환).
 * 요청의 revisionId 값은 무시하며 현장관리 publishedRevisionId만 사용.
 */
function getV2PublishedPagePublic_(params) {
  var siteCode = String((params && params.siteCode) || '').trim();
  if (!siteCode) {
    return v2Fail_('V2_SITE_NOT_FOUND');
  }

  try {
    return readV2PublishedPage_(siteCode);
  } catch (err) {
    var code = (err && err.code) || 'V2_READ_FAILED';
    if (!V2_PUBLIC_MESSAGES[code]) {
      code = 'V2_READ_FAILED';
    }
    try {
      Logger.log(
        '[v2.page.published] siteCode=' +
          siteCode +
          ' code=' +
          code +
          ' msg=' +
          String((err && err.message) || '')
      );
    } catch (logErr) {
      // ignore
    }
    return v2Fail_(code);
  }
}

function v2Fail_(code) {
  return {
    ok: false,
    code: code,
    message: V2_PUBLIC_MESSAGES[code] || V2_PUBLIC_MESSAGES.V2_READ_FAILED
  };
}

function readV2PublishedPage_(siteCode) {
  var siteRow = findSiteByCode_(siteCode);
  if (!siteRow) {
    throw createAppError_('V2_SITE_NOT_FOUND', 'site not found');
  }

  /** 최상위 공개 게이트 — 제출 활성(isSiteSubmissionEnabled_)과 역할 분리 */
  if (!isV2PublicSiteActive_(siteRow)) {
    throw createAppError_('V2_NOT_PUBLISHED', 'site inactive');
  }

  var siteHeaders = getHeaderIndexMap_(getSheet_(SHEET_NAMES.SITE));
  if (
    siteHeaders.rendererVersion === undefined ||
    siteHeaders.pageStatus === undefined ||
    siteHeaders.pageSchemaVersion === undefined ||
    siteHeaders.publishedRevisionId === undefined
  ) {
    throw createAppError_('V2_NOT_CONFIGURED', 'v2 columns missing');
  }

  var rendererVersion = String(getField_(siteRow, 'rendererVersion') || '')
    .trim()
    .toLowerCase();
  if (rendererVersion !== 'v2') {
    throw createAppError_('V2_NOT_PUBLISHED', 'rendererVersion not v2');
  }

  var pageStatus = String(getField_(siteRow, 'pageStatus') || '')
    .trim()
    .toLowerCase();
  if (!pageStatus) pageStatus = 'draft';
  if (pageStatus !== 'published') {
    throw createAppError_('V2_NOT_PUBLISHED', 'pageStatus not published');
  }

  var pageSchemaVersion = String(
    getField_(siteRow, 'pageSchemaVersion') || ''
  ).trim();
  if (!pageSchemaVersion) {
    throw createAppError_('V2_NOT_CONFIGURED', 'pageSchemaVersion empty');
  }

  var publishedRevisionId = String(
    getField_(siteRow, 'publishedRevisionId') || ''
  ).trim();
  if (!publishedRevisionId) {
    throw createAppError_('V2_NOT_PUBLISHED', 'publishedRevisionId empty');
  }
  var pubPrefix = 'pub-' + siteCode + '-';
  if (publishedRevisionId.indexOf(pubPrefix) !== 0) {
    throw createAppError_(
      'V2_NOT_PUBLISHED',
      'publishedRevisionId site mismatch'
    );
  }

  var blockSheet = getSheetOptional_(SHEET_NAMES.V2_BLOCK);
  if (!blockSheet) {
    throw createAppError_('V2_BLOCK_SHEET_MISSING', 'block sheet missing');
  }
  var contentSheet = getSheetOptional_(SHEET_NAMES.V2_CONTENT);
  if (!contentSheet) {
    throw createAppError_('V2_CONTENT_SHEET_MISSING', 'content sheet missing');
  }

  var blocks = filterV2RowsForPublished_(
    sheetObjectsFromSheet_(blockSheet),
    siteCode,
    publishedRevisionId,
    V2_BLOCK_PUBLIC_COLUMNS
  );
  var contents = filterV2RowsForPublished_(
    sheetObjectsFromSheet_(contentSheet),
    siteCode,
    publishedRevisionId,
    V2_CONTENT_PUBLIC_COLUMNS
  );

  if (blocks.length === 0 && contents.length === 0) {
    throw createAppError_('V2_PUBLISHED_ROWS_EMPTY', 'no published rows');
  }

  return {
    ok: true,
    data: {
      siteCode: siteCode,
      revisionId: publishedRevisionId,
      pageSchemaVersion: pageSchemaVersion,
      blocks: blocks,
      contents: contents
    }
  };
}

/**
 * V2 공개 사이트 활성 여부.
 * isActive 파싱은 ynToBool_(…, true) — 제출용 isSiteSubmissionEnabled_와 동일 규칙,
 * 공개 게이트 전용 이름 (폼/popup과 결합하지 않음).
 */
function isV2PublicSiteActive_(siteRow) {
  return ynToBool_(getField_(siteRow, 'isActive'), true);
}

function sheetObjectsFromSheet_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function (h) {
    return String(h).trim();
  });
  var rows = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var isEmpty = true;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;

    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      if (headers[i]) obj[headers[i]] = row[i];
    }
    rows.push(obj);
  }
  return rows;
}

function filterV2RowsForPublished_(rows, siteCode, revisionId, publicColumns) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowSite = String(getField_(row, 'siteCode') || '').trim();
    var rowRev = String(getField_(row, 'revisionId') || '').trim();
    if (rowSite !== siteCode) continue;
    if (rowRev !== revisionId) continue;
    out.push(pickV2PublicColumns_(row, publicColumns));
  }
  return out;
}

function pickV2PublicColumns_(row, publicColumns) {
  var obj = {};
  for (var i = 0; i < publicColumns.length; i++) {
    var key = publicColumns[i];
    if (row[key] === undefined || row[key] === null) {
      obj[key] = '';
    } else if (typeof row[key] === 'boolean' || typeof row[key] === 'number') {
      obj[key] = row[key];
    } else {
      obj[key] = row[key];
    }
  }
  return obj;
}
