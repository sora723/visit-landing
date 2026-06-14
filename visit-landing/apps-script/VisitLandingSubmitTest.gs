/**
 * VisitLandingSubmitTest.gs
 * L001 submit 테스트 (Apps Script 편집기)
 */

var VL_SUBMIT_SITE = 'L001';

function testVisitLandingSubmit() {
  var siteRow = findSiteByCode_(VL_SUBMIT_SITE);
  if (!siteRow) {
    Logger.log('[FAIL] ' + VL_SUBMIT_SITE + ' 없음');
    return false;
  }
  if (!isSiteSubmissionEnabled_(siteRow)) {
    Logger.log('[WARN] ' + VL_SUBMIT_SITE + ' isActive=N — 테스트 전 Y로 변경 권장');
  }

  var params = {
    action: 'submit',
    siteCode: VL_SUBMIT_SITE,
    name: 'VL테스트_' + Date.now(),
    phone: '0107777' + String(Date.now()).slice(-4),
    privacyAgreed: true,
    utmSource: 'setup-test',
    utmMedium: 'script',
    utmCampaign: 'visitlanding',
    referer: 'https://localhost:3000/',
    device: 'desktop',
    ip: '127.0.0.1'
  };

  var result = handleSubmit(params);
  Logger.log('[OK] submit: ' + JSON.stringify(result));
  return true;
}

function testVisitLandingReservations() {
  var result = getRecentReservations(VL_SUBMIT_SITE, 5);
  Logger.log('[OK] reservations: ' + JSON.stringify(result));
  return true;
}
