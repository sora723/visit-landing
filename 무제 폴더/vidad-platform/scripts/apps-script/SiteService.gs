/**
 * SiteService.gs
 * site.get, kakao.redirect
 */

var SITE_CACHE_TTL = 180; // 3분

var PRIVATE_SITE_HEADERS = ['담당자명', '담당자번호', '카카오상담링크', '비고'];

/**
 * site.get — siteCode별 JSON 응답
 */
function getSite(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode는 필수입니다');
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = 'site_' + code;
  var cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  var siteRow = findSiteByCode_(code);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', '현장을 찾을 수 없습니다: ' + code);
  }

  var assetFolder = getSiteAssetFolder_(code);
  var contentRows = findContentBySiteCode_(code);
  var json = buildSiteJson_(code, siteRow, contentRows, assetFolder);

  cache.put(cacheKey, JSON.stringify(json), SITE_CACHE_TTL);
  writeLog_('SITE_GET', code, 'OK');
  return json;
}

/**
 * 현장관리 + 콘텐츠관리 + Drive → JSON 조립
 * 비공개 필드는 JSON에 포함하지 않음
 */
function buildSiteJson_(siteCode, siteRow, contentRows, assetFolder) {
  var f = function (header) { return getField_(siteRow, header); };

  var heroType = f('히어로타입') || 'image';
  var heroImageFile = f('히어로이미지파일명');
  var heroVideoUrl = f('히어로영상URL');
  var siteName = f('현장명');

  var heroImageUrl = '';
  if (heroType === 'image') {
    heroImageUrl = requirePublicUrl_(assetFolder, heroImageFile, '히어로 이미지');
  } else if (heroType === 'video') {
    if (!heroVideoUrl) {
      throw createAppError_('SITE_BUILD_ERROR', '히어로타입이 video일 때 히어로영상URL은 필수입니다');
    }
    if (heroImageFile) {
      heroImageUrl = getPublicUrlByFileName_(assetFolder, heroImageFile);
    }
  }

  var logoFile = f('로고파일명');
  var overviewImageFile = f('조감도이미지파일명');
  var locationMapFile = f('입지지도이미지파일명');
  var ogImageFile = f('OG_이미지파일명');

  var overviewImageUrl = overviewImageFile
    ? getPublicUrlByFileName_(assetFolder, overviewImageFile)
    : '';
  var locationMapUrl = locationMapFile
    ? getPublicUrlByFileName_(assetFolder, locationMapFile)
    : '';
  var logoUrl = logoFile ? getPublicUrlByFileName_(assetFolder, logoFile) : '';

  var ogImageUrl = '';
  if (ogImageFile) {
    ogImageUrl = getPublicUrlByFileName_(assetFolder, ogImageFile);
  }
  if (!ogImageUrl) ogImageUrl = heroImageUrl || overviewImageUrl;

  var seoTitle = f('Meta_Title') || (siteName + ' 분양');
  var seoDescription = f('Meta_Description');
  var seoCanonical = f('Canonical_URL') || ('https://landing.david-ad.co.kr/' + siteCode);
  var footerShowSeo = (f('Footer_SEO노출') || 'N').toUpperCase() === 'Y';

  var premium = [];
  var locationItems = [];
  var floorplan = [];
  var futureValue = [];
  var siteLayout = [];
  var community = [];

  contentRows.sort(function (a, b) {
    return Number(getField_(a, '순서') || 0) - Number(getField_(b, '순서') || 0);
  });

  for (var i = 0; i < contentRows.length; i++) {
    var row = contentRows[i];
    var section = getField_(row, '섹션');
    var sortOrder = Number(getField_(row, '순서') || 0);
    var imageFile = getField_(row, '이미지파일명');
    var imageUrl = imageFile ? getPublicUrlByFileName_(assetFolder, imageFile) : '';

    if (section === 'premium') {
      var iconFile = getField_(row, '아이콘파일명');
      premium.push({
        sortOrder: sortOrder,
        title: getField_(row, '제목'),
        description: getField_(row, '설명'),
        image: imageUrl,
        icon: iconFile ? getPublicUrlByFileName_(assetFolder, iconFile) : ''
      });
    } else if (section === 'location') {
      locationItems.push({
        sortOrder: sortOrder,
        category: getField_(row, '카테고리'),
        title: getField_(row, '제목'),
        description: getField_(row, '설명'),
        image: imageUrl
      });
    } else if (section === 'floorplan') {
      var fpImageFile = getField_(row, '이미지파일명');
      floorplan.push({
        sortOrder: sortOrder,
        typeName: getField_(row, '타입명'),
        image: fpImageFile ? requirePublicUrl_(assetFolder, fpImageFile, '평면 이미지') : '',
        area: getField_(row, '전용면적'),
        structure: getField_(row, '구조'),
        features: getField_(row, '특징')
      });
    } else if (section === 'future') {
      futureValue.push(buildContentItem_(row, assetFolder, imageUrl, sortOrder));
    } else if (section === 'layout') {
      siteLayout.push(buildContentItem_(row, assetFolder, imageUrl, sortOrder));
    } else if (section === 'community') {
      community.push(buildContentItem_(row, assetFolder, imageUrl, sortOrder));
    }
  }

  var benefit1 = f('Hero혜택1') || '계약금 500만원';
  var benefit2 = f('Hero혜택2') || '중도금 무이자';
  var benefit3 = f('Hero혜택3') || '발코니 확장 무상';

  return {
    schemaVersion: '1.0',
    siteCode: siteCode,
    meta: {
      siteName: siteName,
      status: f('운영상태') || 'INACTIVE',
      templateId: f('templateId') || 'template-a',
      mode: f('mode') || 'scroll'
    },
    seo: {
      title: seoTitle,
      description: seoDescription,
      canonicalUrl: seoCanonical,
      ogImage: ogImageUrl,
      showInFooter: footerShowSeo
    },
    assets: {
      logo: logoUrl
    },
    hero: {
      type: heroType,
      image: heroImageUrl,
      videoUrl: heroType === 'video' ? heroVideoUrl : '',
      hook: f('핵심후킹문구'),
      sub: f('서브문구'),
      benefits: [benefit1, benefit2, benefit3].filter(function (b) { return b; })
    },
    overview: {
      image: overviewImageUrl,
      siteName: siteName,
      location: f('사업개요_위치'),
      scale: f('사업개요_규모'),
      units: f('사업개요_세대수'),
      moveInDate: f('사업개요_입주예정'),
      constructor: f('사업개요_시공사')
    },
    premium: premium,
    location: {
      title: f('입지환경제목') || '입지환경',
      mapImage: locationMapUrl,
      items: locationItems
    },
    floorplan: floorplan,
    futureValue: futureValue,
    siteLayout: siteLayout,
    community: community,
    popup: {
      enabled: ynToBool_(f('팝업사용'), true),
      title: f('팝업제목') || '선착순 방문예약',
      completeMessage: f('팝업완료문구') || '방문예약이 접수되었습니다.\n담당자가 순차적으로 연락드립니다.',
      privacyText: f('팝업개인정보문구') || buildDefaultPopupPrivacyText_()
    },
    liveStatus: {
      enabled: ynToBool_(f('실시간예약현황사용'), true),
      virtualEnabled: ynToBool_(f('가상예약생성'), true),
      title: f('실시간현황제목') || '실시간 방문예약 현황',
      subtitle: f('실시간현황부제') || '홍보관 방문예약 접수 진행중'
    },
    reservationGuide: {
      title: f('방문예약안내제목') || '방문예약 안내',
      steps: [
        { step: '01', title: '방문예약 접수', description: f('방문예약STEP1') || '온라인으로 간편하게 방문예약을 접수합니다.' },
        { step: '02', title: '담당자 확인전화', description: f('방문예약STEP2') || '담당자가 예약 내용을 확인 후 연락드립니다.' },
        { step: '03', title: '홍보관 방문상담', description: f('방문예약STEP3') || '방문하시면 전문 상담사가 안내해 드립니다.' }
      ]
    },
    cta: {
      headline: f('CTA제목') || '선착순 방문예약 진행중',
      subtext: f('CTA부제') || '홍보관 방문 시 특별혜택 제공',
      buttonText: f('CTA버튼문구') || '방문예약하기'
    },
    mobileBar: {
      hookText: f('모바일후킹문구') || '선착순 방문예약 진행중'
    },
    settings: {
      duplicateBlockMinutes: Number(f('중복접수차단분')) || 120
    },
    contact: {
      guide: f('상담안내문구'),
      formType: f('폼타입') || 'simple',
      privacyConsentText: f('개인정보동의문')
    },
    footer: {
      siteName: siteName,
      developer: f('시행사'),
      constructor: f('시공사'),
      phone: f('대표번호'),
      agency: f('광고대행사명'),
      businessNumber: f('사업자등록번호'),
      contact: f('대표연락처'),
      privacyPolicy: f('개인정보처리방침')
    },
    flags: {
      phoneButtonEnabled: ynToBool_(f('전화버튼사용'), true),
      kakaoButtonEnabled: ynToBool_(f('카카오버튼사용'), false),
      interestFormEnabled: ynToBool_(f('관심등록사용'), true)
    },
    tracking: {
      gtmId: f('Google태그ID'),
      googleAdsConversionId: f('Google전환ID'),
      metaPixelId: f('MetaPixelID')
    }
  };
}

function ynToBool_(value, defaultVal) {
  if (!value) return defaultVal;
  return String(value).trim().toUpperCase() === 'Y';
}

function buildContentItem_(row, assetFolder, imageUrl, sortOrder) {
  return {
    sortOrder: sortOrder,
    category: getField_(row, '카테고리'),
    title: getField_(row, '제목'),
    description: getField_(row, '설명'),
    image: imageUrl,
    features: getField_(row, '특징')
  };
}

function buildDefaultPopupPrivacyText_() {
  return '개인정보 수집 및 이용에 동의합니다.\n\n수집항목 : 이름, 연락처\n이용목적 : 방문예약 및 상담안내\n보유기간 : 상담 종료 후 즉시 파기';
}

/**
 * siteCode 캐시 삭제 (설정 변경 시 사용)
 */
function clearSiteCache_(siteCode) {
  CacheService.getScriptCache().remove('site_' + siteCode);
}

/**
 * kakao.redirect — 카카오 상담 URL 302 리다이렉트
 */
function kakaoRedirect(siteCode) {
  var code = String(siteCode || '').trim();
  var siteRow = findSiteByCode_(code);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', '현장을 찾을 수 없습니다');
  }

  if (!ynToBool_(getField_(siteRow, '카카오버튼사용'), false)) {
    throw createAppError_('FORBIDDEN', '카카오 버튼이 비활성화되어 있습니다');
  }

  var url = getField_(siteRow, '카카오상담링크');
  if (!url) {
    throw createAppError_('NOT_CONFIGURED', '카카오 상담 링크가 설정되지 않았습니다');
  }

  return HtmlService.createHtmlOutput(
    '<script>window.location.href="' + url.replace(/"/g, '') + '";</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Apps Script 편집기에서 site.get 테스트
 */
function testSiteGet() {
  var siteRow = findSiteByCode_('A001');
  if (!siteRow) {
    throw new Error('A001 샘플 데이터가 현장관리 시트에 없습니다');
  }

  var result = getSite('A001');
  Logger.log(JSON.stringify(result, null, 2));

  assertNoPrivateDataInJson_(result, siteRow);
  Logger.log('비공개 필드 노출 검사: PASS');

  Logger.log('hero.image: ' + (result.hero.image ? 'OK' : 'EMPTY'));
  Logger.log('premium count: ' + result.premium.length);
  Logger.log('floorplan count: ' + result.floorplan.length);

  return result;
}

/**
 * JSON에 담당자·카카오 링크 등 비공개 값이 포함되지 않았는지 검사
 */
function assertNoPrivateDataInJson_(json, siteRow) {
  var jsonStr = JSON.stringify(json);
  var privateValues = [
    getField_(siteRow, '담당자명'),
    getField_(siteRow, '담당자번호'),
    getField_(siteRow, '카카오상담링크'),
    getField_(siteRow, '비고')
  ].filter(function (v) { return v && v.length > 0; });

  for (var i = 0; i < privateValues.length; i++) {
    if (jsonStr.indexOf(privateValues[i]) !== -1) {
      throw new Error('비공개 데이터 JSON 노출: ' + privateValues[i]);
    }
  }

  var forbiddenKeys = ['managerName', 'managerPhone', 'kakaoConsultUrl'];
  for (var j = 0; j < forbiddenKeys.length; j++) {
    if (jsonStr.indexOf('"' + forbiddenKeys[j] + '"') !== -1) {
      throw new Error('비공개 키 JSON 노출: ' + forbiddenKeys[j]);
    }
  }
}
