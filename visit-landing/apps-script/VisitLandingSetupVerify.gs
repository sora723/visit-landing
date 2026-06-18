/**
 * VisitLandingSetupVerify.gs
 * VisitLanding_Master Sheet 구조 검증 (Apps Script 편집기에서 실행)
 *
 * 실행 순서:
 *   1. verifyVisitLandingStructure()
 *   2. verifyVisitLandingSampleSite()   — L001
 *   3. testVisitLandingSubmit()
 */

var VISIT_LANDING_REQUIRED_HEADERS = {
  '현장관리': [
    'siteCode', 'siteName', 'domain', 'submissionSpreadsheetId', 'submissionSpreadsheetName', 'submissionSheetName',
    'phone', 'managerName', 'managerPhone', 'notifyPhone',
    'popupEnabled', 'liveStatusEnabled', 'virtualReservationEnabled',
    'duplicateBlockMinutes', 'isActive',
    'metaPixelId', 'metaConversionEvent',
    'googleConversionId', 'googleConversionLabel',
    'naverConversionScript', 'kakaoPixelId',
    'metaOwnershipCode', 'googleOwnershipCode',
    'naverOwnershipCode', 'kakaoOwnershipCode',
    '전환코드', '소유확인코드'
  ],
  '콘텐츠관리': [
    'siteCode', 'heroTitle', 'heroSubTitle',
    'benefit1Title', 'benefit1Value', 'benefit2Title', 'benefit2Value',
    'benefit3Title', 'benefit3Value', 'cardIcon1', 'cardIcon2', 'cardIcon3', 'ctaText', 'mobileHookText',
    'heroImage', 'heroVisualImage', 'heroImagePc', 'heroImageMobile', 'overviewData', 'premiumData',
    'locationData', 'futureData', 'layoutData', 'communityData',
    'floatingTodayReservations', 'floatingActiveConsultations', 'stickyPromoText',
    'unitTypeOptions', 'visitDateDays', 'visitDateOptions',
    'unitTypeEnabled', 'visitDateEnabled',
    'mainColor', 'subColor', 'accentColor',
    'liveStatusTitleColor', 'ctaSectionTitleColor', 'sectionTitleColor',
    'footerData', 'extendedData'
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
  if (!a) {
    Logger.log('누락 컬럼 자동 추가: runEnsureStickyPromoAndVerify() 또는 runEnsureHeroImageColumns() 실행');
    Logger.log('  - 현장관리: submissionSpreadsheetName');
    Logger.log('  - 콘텐츠관리: stickyPromoText');
  }
  Logger.log(a && b ? '=== SETUP READY ===' : '=== SETUP INCOMPLETE ===');
  return a && b;
}

/** 현장관리·콘텐츠관리 누락 컬럼 추가 + 구조 검증 */
function runEnsureStickyPromoAndVerify() {
  runEnsureStep_('domain', ensureDomainColumn);
  runEnsureStep_('submissionSpreadsheetName', ensureSubmissionSpreadsheetNameColumn);
  runEnsureStep_('stickyPromoText', ensureStickyPromoTextColumn);
  runEnsureStep_('reservationForm', ensureReservationFormColumns);
  runEnsureStep_('siteTheme', ensureSiteThemeColumns);
  runEnsureStep_('heroImage', ensureHeroImageColumns);
  runEnsureStep_('ctaPromoImage', ensureCtaPromoImageColumns);
  runEnsureStep_('unitTypesData', ensureUnitTypesDataColumn);
  runEnsureStep_('popupImages', ensurePopupImageColumns);
  runEnsureStep_('footer', ensureFooterDataColumn);
  runEnsureStep_('conversionTracking', ensureConversionTrackingColumns);
  return runVisitLandingSetupVerify();
}

function runEnsureStep_(label, fn) {
  try {
    var result = fn();
    Logger.log('[' + label + '] ' + (result && result.message ? result.message : 'OK'));
    return result;
  } catch (err) {
    Logger.log('[' + label + '] FAIL: ' + (err.message || String(err)));
    return { ok: false, message: err.message || String(err) };
  }
}

/** Solapi 접수 알림톡 템플릿 ID 갱신 (Script Properties) */
function updateSolapiSubmissionTemplateId(templateId) {
  var id = String(templateId || 'KA01TP260613134907956SKHD1kZne8B').trim();
  if (!id) {
    throw new Error('templateId가 비어 있습니다');
  }
  PropertiesService.getScriptProperties().setProperty('SOLAPI_TEMPLATE_ID_SUBMISSION', id);
  Logger.log('SOLAPI_TEMPLATE_ID_SUBMISSION = ' + id);
  return id;
}
