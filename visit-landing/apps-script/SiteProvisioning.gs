/**
 * SiteProvisioning.gs
 * 현장별 독립 Spreadsheet 생성 (Drive)
 *
 * 명명 규칙: {siteCode}_접수_{현장명}  (예: L001_접수_더블역세권)
 *
 * Apps Script 편집기:
 *   provisionSiteSpreadsheet('L001')
 *   runProvisionSiteFromPrompt()
 *
 * Web App:
 *   action=site.provision&siteCode=L001
 * @version 2026-06-11
 */

var SITE_SUBMISSION_HEADERS = [
  'id', 'siteCode', 'createdAt', 'name', 'phone',
  'utmSource', 'utmMedium', 'utmCampaign',
  'referer', 'device', 'ip', 'status', 'memo'
];

function provisionSiteSpreadsheet(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode는 필수입니다');
  }

  var siteRow = findSiteByCode_(code);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', '현장을 찾을 수 없습니다: ' + code);
  }

  var existingId = getSubmissionSpreadsheetId_(siteRow);
  if (existingId) {
    var existingSs = openSpreadsheetByIdOptional_(existingId);
    var storedName = getSubmissionSpreadsheetName_(siteRow);
    return {
      siteCode: code,
      spreadsheetId: existingId,
      spreadsheetName: storedName || (existingSs ? existingSs.getName() : ''),
      spreadsheetUrl: existingSs ? existingSs.getUrl() : '',
      sheetName: getSubmissionSheetTabName_(siteRow),
      created: false,
      message: '이미 등록된 Spreadsheet ID가 있습니다'
    };
  }

  var siteName = getSiteNameFromRow_(siteRow);
  var spreadsheetName = buildSiteSpreadsheetName_(code, siteName);
  var tabName = getSubmissionSheetTabName_(siteRow) || '접수관리';

  var ss = SpreadsheetApp.create(spreadsheetName);
  var sheet = ss.getSheets()[0];
  sheet.setName(tabName);
  sheet.getRange(1, 1, 1, SITE_SUBMISSION_HEADERS.length).setValues([SITE_SUBMISSION_HEADERS]);

  var spreadsheetId = ss.getId();
  updateSiteFieldsByCode_(code, {
    submissionSpreadsheetId: spreadsheetId,
    submissionSpreadsheetName: spreadsheetName,
    submissionSheetName: tabName
  });

  writeLog_('SITE_PROVISION', code, spreadsheetName + ' | id=' + spreadsheetId);

  return {
    siteCode: code,
    spreadsheetId: spreadsheetId,
    spreadsheetName: spreadsheetName,
    spreadsheetUrl: ss.getUrl(),
    sheetName: tabName,
    created: true
  };
}

function runProvisionSiteFromPrompt() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('현장 Spreadsheet 생성', 'siteCode (예: L004):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var result = provisionSiteSpreadsheet(res.getResponseText().trim());
  ui.alert('완료\n\n' + JSON.stringify(result, null, 2));
}

/**
 * Spreadsheet 파일명 — {siteCode}_접수_{현장명}
 * 예: L001_접수_더블역세권, L002_접수_원주한양립스
 */
/**
 * 현장관리 — submissionSpreadsheetName 컬럼 없으면 ID 다음에 추가
 */
function ensureSubmissionSpreadsheetNameColumn() {
  var sheet = getSheet_(SHEET_NAMES.SITE);
  var map = getHeaderIndexMap_(sheet);

  if (map['submissionSpreadsheetName'] !== undefined) {
    return {
      ok: true,
      added: false,
      message: 'submissionSpreadsheetName 컬럼 이미 존재'
    };
  }

  var idCol = map['submissionSpreadsheetId'];
  if (idCol === undefined) {
    throw createAppError_(
      'INTERNAL_ERROR',
      'submissionSpreadsheetId 컬럼 없음 — 현장관리 헤더를 확인하세요'
    );
  }

  // submissionSpreadsheetId 바로 뒤 (1-based: idCol+1 다음)
  sheet.insertColumnAfter(idCol + 1);
  sheet.getRange(1, idCol + 2).setValue('submissionSpreadsheetName');

  writeLog_('COLUMN_ADD', '', '현장관리.submissionSpreadsheetName 컬럼 추가');

  return {
    ok: true,
    added: true,
    message: 'submissionSpreadsheetName 컬럼이 submissionSpreadsheetId 뒤에 추가되었습니다'
  };
}

function buildSiteSpreadsheetName_(siteCode, siteName) {
  var code = String(siteCode || '').trim();
  var label = sanitizeSiteNameForSpreadsheet_(siteName);
  return code + '_접수_' + label;
}

/** @deprecated buildSiteSpreadsheetName_ 사용 */
function buildSiteSpreadsheetTitle_(siteCode, siteName) {
  return buildSiteSpreadsheetName_(siteCode, siteName);
}

/**
 * 현장명 → 파일명용 (공백·특수문자 제거)
 */
function sanitizeSiteNameForSpreadsheet_(siteName) {
  var name = String(siteName || '').trim();
  name = name.replace(/\s+/g, '');
  name = name.replace(/[()（）\[\]'"·]/g, '');
  if (!name || name.indexOf('신규') !== -1 || name.charAt(0) === '(') {
    return '현장';
  }
  return name;
}

/** 현장관리 — 전환 추적 + 소유 확인 컬럼 (isActive 뒤) */
function ensureConversionTrackingColumns() {
  return ensureSheetColumnsAfter_(
    SHEET_NAMES.SITE,
    ['isActive', '활성여부', 'duplicateBlockMinutes', '중복접수차단분', 'createdAt', 'updatedAt'],
    [
      'metaPixelId',
      'metaConversionEvent',
      'googleConversionId',
      'googleConversionLabel',
      'googleCallConversionLabel',
      'naverConversionScript',
      'kakaoPixelId',
      'metaCallConversionEvent',
      'metaOwnershipCode',
      'googleOwnershipCode',
      'naverOwnershipCode',
      'kakaoOwnershipCode',
      '전환코드',
      '소유확인코드'
    ]
  );
}

/** Apps Script 편집기 — 전환 추적 컬럼만 추가 */
function runEnsureConversionTrackingColumns() {
  try {
    var ss = getSpreadsheet_();
    Logger.log('Spreadsheet: ' + ss.getName() + ' (' + ss.getId() + ')');
    var result = ensureConversionTrackingColumns();
    Logger.log(result.message);
    try {
      SpreadsheetApp.getUi().alert(result.message);
    } catch (e) {
      /* UI 없는 실행 */
    }
    return result;
  } catch (err) {
    var msg = '전환 추적 컬럼 추가 실패: ' + (err.message || String(err));
    Logger.log(msg);
    try {
      SpreadsheetApp.getUi().alert(msg);
    } catch (e2) {
      /* UI 없음 */
    }
    throw err;
  }
}
