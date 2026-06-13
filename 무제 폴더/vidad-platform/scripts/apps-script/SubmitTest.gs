/**
 * SubmitTest.gs
 * submit API 단위 테스트 (Apps Script 편집기에서 실행)
 */

var SUBMIT_TEST_SITE = 'A001';

/**
 * 전체 submit 테스트 실행
 */
function runSubmitTests() {
  var results = [];

  results.push(runTest_('simple 성공', testSubmitSimpleSuccess_));
  results.push(runTest_('full 성공', testSubmitFullSuccess_));
  results.push(runTest_('중복 차단', testSubmitDuplicateBlocked_));
  results.push(runTest_('이름 변경 허용', testSubmitDuplicateAllowedOnNameChange_));
  results.push(runTest_('연락처 변경 허용', testSubmitDuplicateAllowedOnPhoneChange_));
  results.push(runTest_('중복 허용(필드 상이-full)', testSubmitDuplicateAllowed_));
  results.push(runTest_('현장 없음', testSubmitSiteNotFound_));
  results.push(runTest_('필수값 누락', testSubmitValidationError_));
  results.push(runTest_('개인정보 미동의', testSubmitPrivacyNotAgreed_));
  results.push(runTest_('알림 실패해도 접수 성공', testSubmitNotificationFailureStillSuccess_));

  Logger.log('=== submit 테스트 결과 ===');
  results.forEach(function (r) {
    Logger.log((r.passed ? '[PASS]' : '[FAIL]') + ' ' + r.name + (r.detail ? ' — ' + r.detail : ''));
  });

  var allPassed = results.every(function (r) { return r.passed; });
  Logger.log(allPassed ? '=== ALL PASS ===' : '=== SOME FAILED ===');
  return results;
}

function runTest_(name, fn) {
  try {
    fn();
    return { name: name, passed: true };
  } catch (e) {
    return { name: name, passed: false, detail: e.message };
  }
}

/**
 * simple 폼 접수 성공
 */
function testSubmitSimpleSuccess() {
  testSubmitSimpleSuccess_();
}

function testSubmitSimpleSuccess_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'simple');

  try {
    var params = buildSimpleSubmitParams_({
      name: '테스트_' + Date.now(),
      phone: '01099990001'
    });

    var result = handleSubmit(params);
    assertSubmitSuccess_(result);
    Logger.log('simple 성공: ' + JSON.stringify(result));
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'full');
  }
}

/**
 * full 폼 접수 성공
 */
function testSubmitFullSuccess() {
  testSubmitFullSuccess_();
}

function testSubmitFullSuccess_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'full');

  try {
    var params = buildFullSubmitParams_({
      name: '풀폼_' + Date.now(),
      phone: '01099990002'
    });

    var result = handleSubmit(params);
    assertSubmitSuccess_(result);
    Logger.log('full 성공: ' + JSON.stringify(result));
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'simple');
  }
}

/**
 * 2시간 중복 차단 — 동일 이름+연락처 재접수
 */
function testSubmitDuplicateBlocked() {
  testSubmitDuplicateBlocked_();
}

function testSubmitDuplicateBlocked_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'simple');

  try {
    var uniqueName = '중복테스트_' + Date.now();
    var params = buildSimpleSubmitParams_({
      name: uniqueName,
      phone: '01099990003'
    });

    handleSubmit(params);

    try {
      handleSubmit(params);
      throw new Error('중복 접수가 차단되지 않았습니다');
    } catch (e) {
      if (e.code !== 'DUPLICATE_SUBMISSION') {
        throw new Error('기대: DUPLICATE_SUBMISSION, 실제: ' + (e.code || e.message));
      }
    }
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'full');
  }
}

/**
 * 이름만 다르면 허용 (simple — 이름+연락처 기준)
 */
function testSubmitDuplicateAllowedOnNameChange() {
  testSubmitDuplicateAllowedOnNameChange_();
}

function testSubmitDuplicateAllowedOnNameChange_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'simple');

  try {
    var phone = '01099990007';
    var base = buildSimpleSubmitParams_({
      name: '이름A_' + Date.now(),
      phone: phone
    });
    handleSubmit(base);

    var second = buildSimpleSubmitParams_({
      name: '이름B_' + Date.now(),
      phone: phone
    });
    var result = handleSubmit(second);
    assertSubmitSuccess_(result);
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'full');
  }
}

/**
 * 연락처만 다르면 허용 (simple — 이름+연락처 기준)
 */
function testSubmitDuplicateAllowedOnPhoneChange() {
  testSubmitDuplicateAllowedOnPhoneChange_();
}

function testSubmitDuplicateAllowedOnPhoneChange_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'simple');

  try {
    var name = '연락처변경_' + Date.now();
    handleSubmit(buildSimpleSubmitParams_({ name: name, phone: '01099990008' }));
    var result = handleSubmit(buildSimpleSubmitParams_({ name: name, phone: '01099990009' }));
    assertSubmitSuccess_(result);
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'full');
  }
}

/**
 * 하나라도 다르면 허용 — 기타문의 변경 (full 폼)
 */
function testSubmitDuplicateAllowed() {
  testSubmitDuplicateAllowed_();
}

function testSubmitDuplicateAllowed_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'full');

  try {
    var uniqueName = '허용테스트_' + Date.now();
    var base = buildFullSubmitParams_({
      name: uniqueName,
      phone: '01099990004',
      inquiry: '첫 문의'
    });

    handleSubmit(base);

    var second = buildFullSubmitParams_({
      name: uniqueName,
      phone: '01099990004',
      inquiry: '두번째 다른 문의'
    });

    var result = handleSubmit(second);
    assertSubmitSuccess_(result);
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'simple');
  }
}

/**
 * 존재하지 않는 siteCode
 */
function testSubmitSiteNotFound() {
  testSubmitSiteNotFound_();
}

function testSubmitSiteNotFound_() {
  try {
    handleSubmit(buildSimpleSubmitParams_({ siteCode: 'Z999', name: '없음', phone: '01000000000' }));
    throw new Error('SITE_NOT_FOUND가 발생해야 합니다');
  } catch (e) {
    if (e.code !== 'SITE_NOT_FOUND') {
      throw new Error('기대: SITE_NOT_FOUND, 실제: ' + (e.code || e.message));
    }
  }
}

/**
 * 필수값 누락
 */
function testSubmitValidationError() {
  testSubmitValidationError_();
}

function testSubmitValidationError_() {
  try {
    handleSubmit({ action: 'submit', siteCode: SUBMIT_TEST_SITE, name: '', phone: '01012345678', privacyAgreed: true });
    throw new Error('VALIDATION_ERROR가 발생해야 합니다');
  } catch (e) {
    if (e.code !== 'VALIDATION_ERROR') {
      throw new Error('기대: VALIDATION_ERROR, 실제: ' + (e.code || e.message));
    }
  }
}

/**
 * 개인정보 미동의
 */
function testSubmitPrivacyNotAgreed() {
  testSubmitPrivacyNotAgreed_();
}

function testSubmitPrivacyNotAgreed_() {
  try {
    handleSubmit(buildSimpleSubmitParams_({ name: '미동의', phone: '01099990005', privacyAgreed: false }));
    throw new Error('VALIDATION_ERROR가 발생해야 합니다');
  } catch (e) {
    if (e.code !== 'VALIDATION_ERROR') {
      throw new Error('기대: VALIDATION_ERROR, 실제: ' + (e.code || e.message));
    }
  }
}

/**
 * Solapi 미설정 시 알림 실패해도 접수 성공
 */
function testSubmitNotificationFailureStillSuccess() {
  testSubmitNotificationFailureStillSuccess_();
}

function testSubmitNotificationFailureStillSuccess_() {
  var siteRow = findSiteByCode_(SUBMIT_TEST_SITE);
  if (!siteRow) throw new Error('A001 없음');

  var originalFormType = getField_(siteRow, '폼타입');
  setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', 'simple');

  try {
    var params = buildSimpleSubmitParams_({
      name: '알림실패_' + Date.now(),
      phone: '01099990006'
    });

    var result = handleSubmit(params);
    assertSubmitSuccess_(result);

    if (result.notificationSent === true) {
      Logger.log('알림도 성공함 (SOLAPI 설정됨) — 접수 성공 확인됨');
    } else {
      Logger.log('알림 실패, 접수 성공 — notificationSent=false 확인됨');
    }
  } finally {
    setSiteFieldForTest_(SUBMIT_TEST_SITE, '폼타입', originalFormType || 'full');
  }
}

// ─── 헬퍼 ───────────────────────────────────────────────────

function buildSimpleSubmitParams_(overrides) {
  return Object.assign({
    action: 'submit',
    siteCode: SUBMIT_TEST_SITE,
    name: '홍길동',
    phone: '01012345678',
    privacyAgreed: true,
    utmSource: 'test',
    utmMedium: 'unit',
    utmCampaign: 'submit'
  }, overrides || {});
}

function buildFullSubmitParams_(overrides) {
  return Object.assign({
    action: 'submit',
    siteCode: SUBMIT_TEST_SITE,
    name: '김철수',
    phone: '01087654321',
    ageRange: '30대',
    consultType: '방문상담',
    reserveDate: '2026-06-15',
    reserveTime: '14:00',
    inquiry: '평형 문의',
    privacyAgreed: true
  }, overrides || {});
}

function assertSubmitSuccess_(result) {
  if (!result || !result.submissionId) {
    throw new Error('submissionId가 없습니다');
  }
  if (result.isDuplicate !== false) {
    throw new Error('isDuplicate는 false여야 합니다');
  }
  if (!result.redirectUrl || result.redirectUrl.indexOf('/complete.html') === -1) {
    throw new Error('redirectUrl이 올바르지 않습니다');
  }
}

/**
 * 테스트용 현장관리 필드 임시 변경 (헤더명 기준)
 */
function setSiteFieldForTest_(siteCode, headerName, value) {
  var sheet = getSheet_(SHEET_NAMES.SITE);
  var map = getHeaderIndexMap_(sheet);
  if (map[headerName] === undefined) {
    throw new Error('헤더 없음: ' + headerName);
  }

  var data = sheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][map['현장코드']]).trim() === siteCode) {
      sheet.getRange(r + 1, map[headerName] + 1).setValue(value);
      clearSiteCache_(siteCode);
      return;
    }
  }
  throw new Error('현장 없음: ' + siteCode);
}
