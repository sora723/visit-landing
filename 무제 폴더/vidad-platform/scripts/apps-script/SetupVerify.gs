/**
 * SetupVerify.gs
 * 1단계 Sheet 구조 검증 (Apps Script 편집기에서 실행)
 */

var REQUIRED_HEADERS = {
  '현장관리': [
    '현장코드', '현장명', '로고파일명', '운영상태', 'templateId', 'mode',
    '히어로타입', '히어로이미지파일명', '히어로영상URL', '핵심후킹문구', '서브문구',
    '조감도이미지파일명', '사업개요_위치', '사업개요_규모', '사업개요_세대수',
    '사업개요_입주예정', '사업개요_시공사', '입지환경제목', '입지지도이미지파일명',
    '상담안내문구', '폼타입', '개인정보동의문', '시행사', '시공사', '대표번호',
    '광고대행사명', '사업자등록번호', '대표연락처', '개인정보처리방침', 'Footer_SEO노출',
    'Meta_Title', 'Meta_Description', 'Canonical_URL', 'OG_이미지파일명',
    '전화버튼사용', '카카오버튼사용', '관심등록사용',
    '담당자명', '담당자번호', '카카오상담링크',
    'Google태그ID', 'Google전환ID', 'MetaPixelID',
    'Hero혜택1', 'Hero혜택2', 'Hero혜택3',
    '팝업사용', '실시간예약현황사용', '가상예약생성',
    '팝업제목', '팝업완료문구', '팝업개인정보문구',
    '모바일후킹문구', 'CTA제목', 'CTA부제', 'CTA버튼문구',
    '실시간현황제목', '실시간현황부제',
    '방문예약안내제목', '방문예약STEP1', '방문예약STEP2', '방문예약STEP3',
    '중복접수차단분'
  ],
  '콘텐츠관리': [
    '현장코드', '섹션', '순서', '카테고리', '제목', '타입명',
    '설명', '특징', '전용면적', '구조', '이미지파일명', '아이콘파일명'
  ],
  '접수관리': [
    '접수ID', '접수일시', '현장코드', '현장명', '성함', '연락처',
    '연령대', '상담유형', '예약날짜', '예약시간', '기타문의',
    'utm_source', 'utm_medium', 'utm_campaign',
    '유입URL', 'Referer', '디바이스', 'IP',
    '담당자명', '담당자번호', '중복여부'
  ],
  '_시스템로그': [
    '발생일시', '액션', '현장코드', 'provider', '수신번호', '오류메시지', 'payload', '메시지'
  ]
};

/**
 * 모든 시트 헤더 검증
 */
function verifySheetStructure() {
  var allOk = true;
  Object.keys(REQUIRED_HEADERS).forEach(function (sheetName) {
    var required = REQUIRED_HEADERS[sheetName];
    var sheet = getSheet_(sheetName);
    var map = getHeaderIndexMap_(sheet);
    var missing = required.filter(function (h) { return map[h] === undefined; });

    if (missing.length > 0) {
      Logger.log('[FAIL] ' + sheetName + ' — 누락 헤더: ' + missing.join(', '));
      allOk = false;
    } else {
      Logger.log('[OK] ' + sheetName + ' — 헤더 ' + required.length + '개 확인');
    }
  });

  Logger.log(allOk ? '=== 검증 완료: PASS ===' : '=== 검증 완료: FAIL ===');
  return allOk;
}

/**
 * A001 샘플 현장 존재 확인
 */
function verifySampleSite() {
  var site = findSiteByCode_('A001');
  if (!site) {
    Logger.log('[FAIL] A001 현장관리 행 없음');
    return false;
  }
  Logger.log('[OK] A001 현장: ' + getField_(site, '현장명'));
  return true;
}
