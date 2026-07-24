/**
 * Main.gs
 * VisitLanding Web App 진입점
 *
 * Actions: submit | reservations.recent | site.provision | site.config |
 *          site.domains | site.resolve | v2.page.published
 */

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  var params = {};
  try {
    params = method === 'POST' ? parsePostBody_(e) : (e && e.parameter ? e.parameter : {});
    var action = params.action;

    if (!action) {
      return buildJsonResponse_({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'action은 필수입니다' }
      });
    }

    /** V2 공개 계약: { ok, data|code,message } — success 래퍼 없이 반환 */
    if (action === 'v2.page.published') {
      return buildJsonResponse_(getV2PublishedPagePublic_(params));
    }

    var result = routeAction_(action, params);
    return buildJsonResponse_({ success: true, data: result, error: null });
  } catch (err) {
    writeLog_('ERROR', (params && params.siteCode) || '', err.message);
    return buildJsonResponse_({
      success: false,
      data: null,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || '서버 오류가 발생했습니다'
      }
    });
  }
}

function routeAction_(action, params) {
  switch (action) {
    case 'submit':
      return handleSubmit(params);

    case 'submit.postProcess':
      return handleSubmitPostProcess(params);

    case 'formToken.issue':
      return handleFormTokenIssue(params);

    case 'reservations.recent':
      return getRecentReservations(params.siteCode, params.limit);

    case 'site.provision':
      return provisionSiteSpreadsheet(params.siteCode);

    case 'site.config':
      return getSiteLiveConfig(params.siteCode);

    case 'site.domains':
      return getSiteDomains();

    case 'site.resolve':
      return resolveSiteByDomain(params.domain || params.hostname || params.host);

    case 'setup.ipBlockSheet':
      return handleSetupIpBlockSheet();

    case 'setup.siteConversion':
      return handleSetupSiteConversion(params);

    /** 레거시 _알림큐 잔여분 소진용 (신규 enqueue 없음) */
    case 'notify.flush':
      return handleNotifyFlush(params);

    case 'notify.requeueMissed':
      return handleNotifyRequeueMissed(params);

    default:
      throw createAppError_('VALIDATION_ERROR', '알 수 없는 action: ' + action);
  }
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw createAppError_('VALIDATION_ERROR', 'JSON body 파싱 실패');
  }
}

function buildJsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 시트 메뉴 — VisitLanding_Master 열 때 표시 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('VisitLanding')
    .addItem('누락 컬럼 전체 추가', 'runEnsureStickyPromoAndVerify')
    .addItem('푸터 컬럼 추가 (footerData)', 'runEnsureFooterColumns')
    .addItem('도메인 컬럼 추가 (domain)', 'runEnsureDomainColumn')
    .addSeparator()
    .addItem('메뉴 새로고침 (시트 닫았다 열기)', 'runVisitLandingMenuHint')
    .addItem('컬러 컬럼 추가 (main/sub/accent)', 'runEnsureSiteThemeColumns')
    .addItem('전환·소유확인 컬럼 추가', 'runEnsureConversionTrackingColumns')
    .addItem('IP 차단 시트 추가 (_IP차단)', 'runEnsureIpBlockSheet')
    .addItem('(레거시) 알림 큐 잔여 발송', 'runFlushNotificationQueue')
    .addToUi();
}

/** onOpen 메뉴가 안 보이면 편집기에서 runEnsureFooterColumns() 실행 */
function runVisitLandingMenuHint() {
  SpreadsheetApp.getUi().alert(
    'VisitLanding 메뉴가 보이면 정상입니다.\n\n' +
      '메뉴가 없으면:\n' +
      '1) 시트를 새로고침(F5)\n' +
      '2) Apps Script 편집기 → runEnsureFooterColumns 실행\n' +
      '3) npm run setup:apps-script:push 로 최신 코드 배포'
  );
}
