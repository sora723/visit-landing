/**
 * VisitLandingSetupVerify.gs
 * VisitLanding_Master Sheet 구조 검증 (Apps Script 편집기에서 실행)
 *
 * 실행 순서:
 *   1. verifyVisitLandingStructure()
 *   2. verifyVisitLandingSampleSite()   — L001
 *   3. testVisitLandingSubmit()         — SubmitTest.gs L001 테스트
 */

var VISIT_LANDING_REQUIRED_HEADERS = {
  '현장관리': [
    'siteCode', 'siteName', 'submissionSpreadsheetId', 'submissionSheetName',
    'phone', 'managerName', 'managerPhone', 'notifyPhone',
    'popupEnabled', 'liveStatusEnabled', 'virtualReservationEnabled',
    'duplicateBlockMinutes', 'isActive'
  ],
  '콘텐츠관리': [
    'siteCode', 'heroTitle', 'heroSubTitle',
    'benefit1Title', 'benefit1Value', 'benefit2Title', 'benefit2Value',
    'benefit3Title', 'benefit3Value', 'ctaText', 'mobileHookText',
    'heroImage', 'heroVisualImage', 'overviewData', 'premiumData',
    'locationData', 'futureData', 'layoutData', 'communityData',
    'floatingTodayReservations', 'floatingActiveConsultations', 'extendedData'
  ],
  '접수관리': [
    'id', 'siteCode', 'createdAt', 'name', 'phone',
    'utmSource', 'utmMedium', 'utmCampaign',
    'referer', 'device', 'ip', 'status', 'memo'
  ],
  '시스템로그': [
    'occurredAt', 'action', 'siteCode', 'provider',
    'recipientPhone', 'errorMessage', 'payload', 'message'
  ]
};

var VISIT_LANDING_SAMPLE_SITE = 'L001';

function verifyVisitLandingStructure() {
  var allOk = true;
  Object.keys(VISIT_LANDING_REQUIRED_HEADERS).forEach(function (sheetName) {
    var required = VISIT_LANDING_REQUIRED_HEADERS[sheetName];
    var sheet = getSheetOptional_(sheetName);
    if (!sheet) {
      Logger.log('[FAIL] ' + sheetName + ' — 탭 없음');
      allOk = false;
      return;
    }
    var map = getHeaderIndexMap_(sheet);
    var missing = required.filter(function (h) { return map[h] === undefined; });
    if (missing.length > 0) {
      Logger.log('[FAIL] ' + sheetName + ' — 누락: ' + missing.join(', '));
      allOk = false;
    } else {
      Logger.log('[OK] ' + sheetName + ' — 헤더 ' + required.length + '개');
    }
  });
  Logger.log(allOk ? '=== VisitLanding 구조: PASS ===' : '=== VisitLanding 구조: FAIL ===');
  return allOk;
}

function verifyVisitLandingSampleSite() {
  var site = findSiteByCode_(VISIT_LANDING_SAMPLE_SITE);
  if (!site) {
    Logger.log('[FAIL] ' + VISIT_LANDING_SAMPLE_SITE + ' 현장관리 행 없음');
    return false;
  }
  var active = isSiteSubmissionEnabled_(site);
  Logger.log('[OK] ' + VISIT_LANDING_SAMPLE_SITE + ' — ' + getSiteNameFromRow_(site) + ' (isActive=' + (active ? 'Y' : 'N') + ')');
  return true;
}

function runVisitLandingSetupVerify() {
  var a = verifyVisitLandingStructure();
  var b = verifyVisitLandingSampleSite();
  Logger.log(a && b ? '=== SETUP READY ===' : '=== SETUP INCOMPLETE ===');
  return a && b;
}
