/**
 * V2PreviewTestDataService.gs
 * TEST_SITE_CODE 전용 V2 Draft Preview 테스트 데이터 생성·삭제.
 *
 * Apps Script 편집기에서 관리자만 수동 실행:
 *   setupV2PreviewTestData()
 *   cleanupV2PreviewTestData()
 *   createTestV2PreviewUrl()
 *
 * Web App action / doGet / doPost / 트리거에 연결하지 않음.
 * 운영 siteCode 행·콘텐츠관리·접수관리·Published pointer는 수정하지 않음.
 *
 * Preview URL 확인 (토큰 로그 금지):
 *   1. 함수 선택: createTestV2PreviewUrl → Run
 *   2. 실행 로그/Logger에 URL을 출력하지 않음 (토큰 포함)
 *   3. Return 값 확인:
 *      - 디버거 중단점 후 return 값 검사
 *      - 또는 Executions(실행 기록)에서 Return value 확인
 */

var V2_PREVIEW_TEST_SITE_CODE_ = 'TEST_SITE_CODE';
var V2_PREVIEW_TEST_DRAFT_REVISION_ID_ = 'draft-TEST_SITE_CODE-001';
var V2_PREVIEW_TEST_SITE_NAME_ = 'V2 Preview 테스트 현장';
var V2_PREVIEW_TEST_PHONE_ = '1688-0001';

/**
 * 테스트 Draft 현장·블록·콘텐츠를 안전하게 생성 (idempotent).
 * @returns {{ok:boolean,changed:boolean,siteCode:string,draftRevisionId:string,siteRow:string,blocksCreated:number,contentsCreated:number,message:string}}
 */
function setupV2PreviewTestData() {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    locked = lock.tryLock(10000);
  } catch (e) {
    locked = false;
  }
  if (!locked) {
    var lockFail = {
      ok: false,
      changed: false,
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      draftRevisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      siteRow: 'unchanged',
      blocksCreated: 0,
      contentsCreated: 0,
      message: 'lock_not_acquired'
    };
    console.log(
      '[setupV2PreviewTestData] ok=false changed=false reason=lock_not_acquired'
    );
    return lockFail;
  }

  try {
    var result = setupV2PreviewTestDataUnlocked_();
    console.log(
      '[setupV2PreviewTestData] ok=' +
        result.ok +
        ' changed=' +
        result.changed +
        ' siteCode=' +
        result.siteCode +
        ' siteRow=' +
        result.siteRow +
        ' blocksCreated=' +
        result.blocksCreated +
        ' contentsCreated=' +
        result.contentsCreated
    );
    return result;
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {
      // ignore
    }
  }
}

/**
 * TEST_SITE_CODE 행만 삭제 (idempotent).
 * @returns {{ok:boolean,changed:boolean,siteCode:string,deleted:{site:number,blocks:number,contents:number},message:string}}
 */
function cleanupV2PreviewTestData() {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    locked = lock.tryLock(10000);
  } catch (e) {
    locked = false;
  }
  if (!locked) {
    var lockFail = {
      ok: false,
      changed: false,
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      deleted: { site: 0, blocks: 0, contents: 0 },
      message: 'lock_not_acquired'
    };
    console.log(
      '[cleanupV2PreviewTestData] ok=false changed=false reason=lock_not_acquired'
    );
    return lockFail;
  }

  try {
    var result = cleanupV2PreviewTestDataUnlocked_();
    console.log(
      '[cleanupV2PreviewTestData] ok=' +
        result.ok +
        ' changed=' +
        result.changed +
        ' siteCode=' +
        result.siteCode +
        ' deletedSite=' +
        result.deleted.site +
        ' deletedBlocks=' +
        result.deleted.blocks +
        ' deletedContents=' +
        result.deleted.contents
    );
    return result;
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {
      // ignore
    }
  }
}

/**
 * TEST_SITE_CODE Preview enter URL 반환.
 * 토큰이 포함되므로 console/Logger에 URL을 출력하지 않음.
 * @returns {string}
 */
function createTestV2PreviewUrl() {
  return createV2PreviewUrl(V2_PREVIEW_TEST_SITE_CODE_);
}

function setupV2PreviewTestDataUnlocked_() {
  getSpreadsheet_();

  var siteSheet = getSheet_(SHEET_NAMES.SITE);
  var blockSheet = getSheet_(SHEET_NAMES.V2_BLOCK);
  var contentSheet = getSheet_(SHEET_NAMES.V2_CONTENT);

  assertV2PreviewTestHeaders_(siteSheet, blockSheet, contentSheet);

  var existingSite = findSiteByCode_(V2_PREVIEW_TEST_SITE_CODE_);
  var existingBlocks = readV2PreviewTestRowsBySite_(
    blockSheet,
    V2_PREVIEW_TEST_SITE_CODE_
  );
  var existingContents = readV2PreviewTestRowsBySite_(
    contentSheet,
    V2_PREVIEW_TEST_SITE_CODE_
  );

  if (existingSite) {
    assertV2PreviewTestSiteMatches_(existingSite, siteSheet);
    assertV2PreviewTestBlocksMatch_(existingBlocks);
    assertV2PreviewTestContentsMatch_(existingContents);
    return {
      ok: true,
      changed: false,
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      draftRevisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      siteRow: 'unchanged',
      blocksCreated: 0,
      contentsCreated: 0,
      message: 'test data already matches contract'
    };
  }

  if (existingBlocks.length > 0 || existingContents.length > 0) {
    throw createAppError_(
      'VALIDATION_ERROR',
      'TEST_SITE_CODE orphan V2 rows exist without site management row — run cleanupV2PreviewTestData first'
    );
  }

  appendExactRowByHeaders_(siteSheet, buildV2PreviewTestSiteRowData_(siteSheet));
  var blockSpecs = buildV2PreviewTestBlockSpecs_();
  for (var b = 0; b < blockSpecs.length; b++) {
    appendExactRowByHeaders_(blockSheet, blockSpecs[b]);
  }
  var contentSpecs = buildV2PreviewTestContentSpecs_();
  for (var c = 0; c < contentSpecs.length; c++) {
    appendExactRowByHeaders_(contentSheet, contentSpecs[c]);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    changed: true,
    siteCode: V2_PREVIEW_TEST_SITE_CODE_,
    draftRevisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
    siteRow: 'created',
    blocksCreated: blockSpecs.length,
    contentsCreated: contentSpecs.length,
    message: 'test data created'
  };
}

function cleanupV2PreviewTestDataUnlocked_() {
  getSpreadsheet_();

  var siteSheet = getSheetOptional_(SHEET_NAMES.SITE);
  var blockSheet = getSheetOptional_(SHEET_NAMES.V2_BLOCK);
  var contentSheet = getSheetOptional_(SHEET_NAMES.V2_CONTENT);

  var deletedSite = siteSheet
    ? deleteRowsBySiteCodeOnly_(siteSheet, V2_PREVIEW_TEST_SITE_CODE_)
    : 0;
  var deletedBlocks = blockSheet
    ? deleteRowsBySiteCodeOnly_(blockSheet, V2_PREVIEW_TEST_SITE_CODE_)
    : 0;
  var deletedContents = contentSheet
    ? deleteRowsBySiteCodeOnly_(contentSheet, V2_PREVIEW_TEST_SITE_CODE_)
    : 0;

  var changed =
    deletedSite > 0 || deletedBlocks > 0 || deletedContents > 0;
  if (changed) {
    SpreadsheetApp.flush();
  }

  return {
    ok: true,
    changed: changed,
    siteCode: V2_PREVIEW_TEST_SITE_CODE_,
    deleted: {
      site: deletedSite,
      blocks: deletedBlocks,
      contents: deletedContents
    },
    message: changed ? 'test data deleted' : 'no TEST_SITE_CODE rows'
  };
}

function assertV2PreviewTestHeaders_(siteSheet, blockSheet, contentSheet) {
  var siteMap = getHeaderIndexMap_(siteSheet);
  var requiredSite = [
    ['siteCode', '현장코드'],
    ['siteName', '현장명'],
    ['phone'],
    ['isActive', '활성여부'],
    ['rendererVersion'],
    ['pageStatus'],
    ['pageSchemaVersion'],
    ['draftRevisionId'],
    ['publishedRevisionId']
  ];
  for (var i = 0; i < requiredSite.length; i++) {
    if (!pickExistingHeader_(siteMap, requiredSite[i])) {
      throw createAppError_(
        'VALIDATION_ERROR',
        'site management missing header: ' + requiredSite[i][0]
      );
    }
  }

  assertExactPublicHeaders_(blockSheet, V2_BLOCK_PUBLIC_COLUMNS, 'V2_블록관리');
  assertExactPublicHeaders_(
    contentSheet,
    V2_CONTENT_PUBLIC_COLUMNS,
    'V2_콘텐츠'
  );
}

function assertExactPublicHeaders_(sheet, expectedColumns, label) {
  var map = getHeaderIndexMap_(sheet);
  for (var i = 0; i < expectedColumns.length; i++) {
    if (map[expectedColumns[i]] === undefined) {
      throw createAppError_(
        'VALIDATION_ERROR',
        label + ' missing header: ' + expectedColumns[i]
      );
    }
  }
}

function buildV2PreviewTestSiteRowData_(siteSheet) {
  var map = getHeaderIndexMap_(siteSheet);
  var row = {};

  setIfHeader_(row, map, ['siteCode', '현장코드'], V2_PREVIEW_TEST_SITE_CODE_);
  setIfHeader_(row, map, ['siteName', '현장명'], V2_PREVIEW_TEST_SITE_NAME_);
  setIfHeader_(row, map, ['phone'], V2_PREVIEW_TEST_PHONE_);
  setIfHeader_(row, map, ['isActive', '활성여부'], 'Y');
  setIfHeader_(row, map, ['rendererVersion'], 'v2');
  setIfHeader_(row, map, ['pageStatus'], 'draft');
  setIfHeader_(row, map, ['pageSchemaVersion'], 1);
  setIfHeader_(row, map, ['draftRevisionId'], V2_PREVIEW_TEST_DRAFT_REVISION_ID_);
  setIfHeader_(row, map, ['publishedRevisionId'], '');

  setIfHeader_(row, map, ['liveStatusEnabled', '실시간현황노출'], 'N');
  setIfHeader_(row, map, ['virtualReservationEnabled', '가상접수노출'], 'N');
  setIfHeader_(row, map, ['popupEnabled', '팝업노출'], 'N');

  /** 알림·전환·접수 관련 — 헤더가 있으면 빈값 유지 (운영 개인정보 복사 금지) */
  var blankIfPresent = [
    ['notifyPhone', 'notificationPhone', '알림수신번호'],
    ['managerPhone', '담당자번호'],
    ['managerName'],
    ['submissionSpreadsheetId', '접수스프레드시트ID'],
    ['submissionSpreadsheetName', '접수스프레드시트명'],
    ['submissionSheetName', '접수시트명'],
    ['metaPixelId'],
    ['metaConversionEvent'],
    ['googleConversionId'],
    ['googleConversionLabel'],
    ['googleCallConversionLabel'],
    ['naverConversionScript'],
    ['kakaoPixelId'],
    ['metaCallConversionEvent'],
    ['metaOwnershipCode'],
    ['googleOwnershipCode'],
    ['naverOwnershipCode'],
    ['kakaoOwnershipCode']
  ];
  for (var i = 0; i < blankIfPresent.length; i++) {
    setIfHeader_(row, map, blankIfPresent[i], '');
  }

  return row;
}

function buildV2PreviewTestBlockSpecs_() {
  return [
    {
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      revisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      sectionId: 'hero-preview',
      sectionOrder: 1,
      componentType: 'hero',
      variant: 'fullBleed',
      contentGroup: 'cg-hero-preview',
      enabled: 'Y',
      desktopVisible: 'Y',
      mobileVisible: 'Y',
      backgroundType: 'none',
      backgroundColor: '',
      backgroundPc: '',
      backgroundMobile: '',
      themeVariant: 'default',
      paddingPreset: 'md',
      animationPreset: 'none',
      optionsJson: '{}'
    },
    {
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      revisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      sectionId: 'form-preview',
      sectionOrder: 2,
      componentType: 'form',
      variant: 'card',
      contentGroup: 'cg-form-preview',
      enabled: 'Y',
      desktopVisible: 'Y',
      mobileVisible: 'Y',
      backgroundType: 'none',
      backgroundColor: '',
      backgroundPc: '',
      backgroundMobile: '',
      themeVariant: 'light',
      paddingPreset: 'md',
      animationPreset: 'none',
      optionsJson: '{}'
    }
  ];
}

function buildV2PreviewTestContentSpecs_() {
  return [
    {
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      revisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      contentGroup: 'cg-hero-preview',
      itemId: 'hero-root-1',
      itemOrder: 1,
      role: 'root',
      eyebrow: '',
      title: 'V2 미리보기 테스트',
      subtitle: '',
      description: '운영 페이지에는 아직 반영되지 않은 테스트 화면입니다.',
      value: '',
      badge: '',
      icon: '',
      imagePc: '',
      imageMobile: '',
      videoUrl: '',
      actionType: '',
      actionLabel: '',
      actionValue: '',
      extraJson: '{}',
      enabled: 'Y'
    },
    {
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      revisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      contentGroup: 'cg-form-preview',
      itemId: 'form-root-1',
      itemOrder: 1,
      role: 'root',
      eyebrow: '',
      title: '관심고객 등록 테스트',
      subtitle: '',
      description: '',
      value: '',
      badge: '',
      icon: '',
      imagePc: '',
      imageMobile: '',
      videoUrl: '',
      actionType: '',
      actionLabel: '',
      actionValue: '',
      extraJson: '{}',
      enabled: 'Y'
    },
    {
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      revisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      contentGroup: 'cg-form-preview',
      itemId: 'form-body-1',
      itemOrder: 2,
      role: 'form',
      eyebrow: '',
      title: '',
      subtitle: '',
      description: '',
      value: '',
      badge: '',
      icon: '',
      imagePc: '',
      imageMobile: '',
      videoUrl: '',
      actionType: '',
      actionLabel: '',
      actionValue: '',
      extraJson: '{}',
      enabled: 'Y'
    },
    {
      siteCode: V2_PREVIEW_TEST_SITE_CODE_,
      revisionId: V2_PREVIEW_TEST_DRAFT_REVISION_ID_,
      contentGroup: 'cg-form-preview',
      itemId: 'form-cta-1',
      itemOrder: 3,
      role: 'cta',
      eyebrow: '',
      title: '',
      subtitle: '',
      description: '',
      value: '',
      badge: '',
      icon: '',
      imagePc: '',
      imageMobile: '',
      videoUrl: '',
      actionType: 'submit',
      actionLabel: '방문예약하기',
      actionValue: '',
      extraJson: '{}',
      enabled: 'Y'
    }
  ];
}

function assertV2PreviewTestSiteMatches_(siteRow, siteSheet) {
  var map = getHeaderIndexMap_(siteSheet);
  var expected = buildV2PreviewTestSiteRowData_(siteSheet);
  var keys = Object.keys(expected);
  for (var i = 0; i < keys.length; i++) {
    var header = keys[i];
    if (map[header] === undefined) continue;
    var actual = normalizeV2PreviewTestCell_(siteRow[header]);
    var want = normalizeV2PreviewTestCell_(expected[header]);
    if (actual !== want) {
      throw createAppError_(
        'VALIDATION_ERROR',
        'TEST_SITE_CODE site management conflict on ' +
          header +
          ' (expected contract mismatch)'
      );
    }
  }
}

function assertV2PreviewTestBlocksMatch_(rows) {
  var expected = buildV2PreviewTestBlockSpecs_();
  if (rows.length !== expected.length) {
    throw createAppError_(
      'VALIDATION_ERROR',
      'TEST_SITE_CODE V2_블록관리 conflict: row count'
    );
  }
  for (var i = 0; i < expected.length; i++) {
    assertV2PreviewTestObjectMatch_(
      rows[i],
      expected[i],
      V2_BLOCK_PUBLIC_COLUMNS,
      'V2_블록관리'
    );
  }
}

function assertV2PreviewTestContentsMatch_(rows) {
  var expected = buildV2PreviewTestContentSpecs_();
  if (rows.length !== expected.length) {
    throw createAppError_(
      'VALIDATION_ERROR',
      'TEST_SITE_CODE V2_콘텐츠 conflict: row count'
    );
  }
  for (var i = 0; i < expected.length; i++) {
    assertV2PreviewTestObjectMatch_(
      rows[i],
      expected[i],
      V2_CONTENT_PUBLIC_COLUMNS,
      'V2_콘텐츠'
    );
  }
}

function assertV2PreviewTestObjectMatch_(actual, expected, columns, label) {
  for (var i = 0; i < columns.length; i++) {
    var key = columns[i];
    var a = normalizeV2PreviewTestCell_(actual[key]);
    var e = normalizeV2PreviewTestCell_(expected[key]);
    if (a !== e) {
      throw createAppError_(
        'VALIDATION_ERROR',
        'TEST_SITE_CODE ' + label + ' conflict on ' + key
      );
    }
  }
}

function readV2PreviewTestRowsBySite_(sheet, siteCode) {
  var code = String(siteCode || '').trim();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function (h) {
    return String(h).trim();
  });
  var codeCol = headers.indexOf('siteCode');
  if (codeCol < 0) {
    throw createAppError_('INTERNAL_ERROR', sheet.getName() + ' siteCode missing');
  }

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][codeCol] || '').trim() !== code) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (headers[c]) obj[headers[c]] = data[r][c];
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * siteCode 일치 행만 삭제. 다른 siteCode는 절대 삭제하지 않음.
 * @returns {number} deleted row count
 */
function deleteRowsBySiteCodeOnly_(sheet, siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) return 0;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var headers = data[0].map(function (h) {
    return String(h).trim();
  });
  var codeCol = -1;
  for (var h = 0; h < headers.length; h++) {
    if (headers[h] === 'siteCode' || headers[h] === '현장코드') {
      codeCol = h;
      break;
    }
  }
  if (codeCol < 0) {
    throw createAppError_('INTERNAL_ERROR', sheet.getName() + ' siteCode column missing');
  }

  var toDelete = [];
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][codeCol] || '').trim() === code) {
      toDelete.push(r + 1);
    }
  }

  toDelete.sort(function (a, b) {
    return b - a;
  });
  for (var i = 0; i < toDelete.length; i++) {
    sheet.deleteRow(toDelete[i]);
  }
  return toDelete.length;
}

/** phone 강제 변환 없이 헤더 순서대로 append (테스트 값 보존) */
function appendExactRowByHeaders_(sheet, rowData) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw createAppError_(
      'INTERNAL_ERROR',
      '시트 헤더가 없습니다: ' + sheet.getName()
    );
  }
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var newRow = [];
  for (var i = 0; i < headerRow.length; i++) {
    var header = String(headerRow[i]).trim();
    if (!header) {
      newRow.push('');
      continue;
    }
    var value = rowData[header];
    if (value === undefined || value === null) {
      newRow.push('');
    } else {
      newRow.push(value);
    }
  }
  sheet.appendRow(newRow);
}

function pickExistingHeader_(map, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    if (map[candidates[i]] !== undefined) return candidates[i];
  }
  return null;
}

function setIfHeader_(row, map, candidates, value) {
  var header = pickExistingHeader_(map, candidates);
  if (header) row[header] = value;
}

function normalizeV2PreviewTestCell_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}
