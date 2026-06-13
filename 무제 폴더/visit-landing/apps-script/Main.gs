/**
 * Main.gs
 * VisitLanding Web App 진입점
 *
 * Actions: submit | reservations.recent | site.provision | site.config
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

    case 'reservations.recent':
      return getRecentReservations(params.siteCode, params.limit);

    case 'site.provision':
      return provisionSiteSpreadsheet(params.siteCode);

    case 'site.config':
      return getSiteLiveConfig(params.siteCode);

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
    .addItem('컬러 컬럼 추가 (main/sub/accent)', 'runEnsureSiteThemeColumns')
    .addToUi();
}
