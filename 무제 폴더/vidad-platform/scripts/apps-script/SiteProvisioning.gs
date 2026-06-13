/**
 * SiteProvisioning.gs
 * 현장별 독립 Spreadsheet 생성 (Drive)
 *
 * Apps Script 편집기:
 *   provisionSiteSpreadsheet('L004')
 *   runProvisionSiteFromPrompt()  — siteCode 입력
 *
 * Web App:
 *   action=site.provision&siteCode=L004
 */

/** VisitLanding 현장 접수 시트 기본 헤더 (영문) */
var SITE_SUBMISSION_HEADERS = [
  'id', 'siteCode', 'createdAt', 'name', 'phone',
  'utmSource', 'utmMedium', 'utmCampaign',
  'referer', 'device', 'ip', 'status', 'memo'
];

/**
 * 현장 전용 Spreadsheet 생성 + 현장관리 ID 저장
 */
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
    return {
      siteCode: code,
      spreadsheetId: existingId,
      spreadsheetUrl: existingSs ? existingSs.getUrl() : '',
      sheetName: getSubmissionSheetTabName_(siteRow),
      created: false,
      message: '이미 등록된 Spreadsheet ID가 있습니다'
    };
  }

  var siteName = getSiteNameFromRow_(siteRow);
  var title = buildSiteSpreadsheetTitle_(code, siteName);
  var tabName = getSubmissionSheetTabName_(siteRow) || '접수관리';

  var ss = SpreadsheetApp.create(title);
  var sheet = ss.getSheets()[0];
  sheet.setName(tabName);
  sheet.getRange(1, 1, 1, SITE_SUBMISSION_HEADERS.length).setValues([SITE_SUBMISSION_HEADERS]);

  var spreadsheetId = ss.getId();
  updateSiteFieldsByCode_(code, {
    submissionSpreadsheetId: spreadsheetId,
    submissionSheetName: tabName
  });

  writeLog_('SITE_PROVISION', code, title + ' | id=' + spreadsheetId);

  return {
    siteCode: code,
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: ss.getUrl(),
    sheetName: tabName,
    spreadsheetTitle: title,
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
 * Spreadsheet 파일명 — 예: 원주_접수, L004_접수
 */
function buildSiteSpreadsheetTitle_(siteCode, siteName) {
  var name = String(siteName || '').trim();
  if (name && name.indexOf('신규') === -1 && name.indexOf('(') !== 0) {
    var first = name.split(/\s+/)[0];
    if (first) return first + '_접수';
  }
  return siteCode + '_접수';
}
