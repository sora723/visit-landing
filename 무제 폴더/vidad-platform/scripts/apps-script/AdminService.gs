/**
 * AdminService.gs
 * 관리자 API (auth, dashboard, customers, settings)
 * site.get 완성 후 순차 구현 예정
 */

function handleAuthLogin(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'auth.login API는 다음 개발 단계에서 구현됩니다');
}

function handleAdminDashboard(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'admin.dashboard API는 다음 개발 단계에서 구현됩니다');
}

function handleAdminCustomersList(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'admin.customers.list API는 다음 개발 단계에서 구현됩니다');
}

function handleAdminCustomersDetail(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'admin.customers.detail API는 다음 개발 단계에서 구현됩니다');
}

function handleAdminSettingsGet(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'admin.settings.get API는 다음 개발 단계에서 구현됩니다');
}

function handleAdminSettingsUpdate(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'admin.settings.update API는 다음 개발 단계에서 구현됩니다');
}

function handleAdminTestNotification(params) {
  throw createAppError_('NOT_IMPLEMENTED', 'admin.settings.testNotification API는 다음 개발 단계에서 구현됩니다');
}

/**
 * 테스트 알림 발송 (settings 구현 시 호출)
 * Solapi 직접 호출 금지 → sendTestNotification 사용
 */
function notifyManagerTest_(siteRow) {
  return sendTestNotification({ siteRow: siteRow });
}

/**
 * siteCode + 담당자번호 뒷 4자리 검증 (auth.login 구현 시 사용)
 */
function verifyManagerPhoneLast4_(siteRow, phoneLast4) {
  var phone = getField_(siteRow, '담당자번호').replace(/\D/g, '');
  var last4 = String(phoneLast4 || '').trim();
  return phone.length >= 4 && phone.slice(-4) === last4;
}
