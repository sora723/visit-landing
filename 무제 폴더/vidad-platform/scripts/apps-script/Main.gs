/**
 * Main.gs
 * Apps Script Web App 진입점 — action 라우팅
 */

var ALLOWED_ORIGINS = [
  'https://landing.david-ad.co.kr',
  'https://admin.david-ad.co.kr',
  'http://localhost:3000',
  'https://localhost:3000'
];

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    var params = method === 'POST' ? parsePostBody_(e) : (e && e.parameter ? e.parameter : {});
    var action = params.action;

    if (!action) {
      return buildJsonResponse_({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'action은 필수입니다' }
      });
    }

    // kakao.redirect는 HTML 리다이렉트 반환
    if (action === 'kakao.redirect') {
      return kakaoRedirect(params.siteCode);
    }

    var result = routeAction_(action, params, method);
    return buildJsonResponse_({ success: true, data: result, error: null });

  } catch (err) {
    writeLog_('ERROR', (e && e.parameter && e.parameter.siteCode) || '', err.message);
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

function routeAction_(action, params, method) {
  switch (action) {
    case 'site.get':
      return getSite(params.siteCode);

    case 'reservations.recent':
      return getRecentReservations(params.siteCode, params.limit);

    case 'submit':
      return handleSubmit(params);

    case 'site.provision':
      return provisionSiteSpreadsheet(params.siteCode);

    case 'auth.login':
      return handleAuthLogin(params);

    case 'admin.dashboard':
      return handleAdminDashboard(params);

    case 'admin.customers.list':
      return handleAdminCustomersList(params);

    case 'admin.customers.detail':
      return handleAdminCustomersDetail(params);

    case 'admin.settings.get':
      return handleAdminSettingsGet(params);

    case 'admin.settings.update':
      return handleAdminSettingsUpdate(params);

    case 'admin.settings.testNotification':
      return handleAdminTestNotification(params);

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

/**
 * Bearer token 추출 (Admin API용, 2단계 이후 활성)
 */
function extractBearerToken_(params) {
  var auth = params.authorization || params.Authorization || '';
  if (auth.indexOf('Bearer ') === 0) return auth.substring(7).trim();
  return '';
}
