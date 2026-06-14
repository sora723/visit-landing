/**
 * SiteConfigService.gs
 * 콘텐츠관리 — 실시간 UI 설정 (하단 프로모, 예약 폼 옵션)
 *
 * Web App:
 *   GET ?action=site.config&siteCode=L001
 *
 * Apps Script 편집기 (최초 1회):
 *   runEnsureStickyPromoAndVerify()  — 전체 컬럼
 *   runEnsureSiteThemeColumns()        — 컬러 컬럼만
 *   ensureReservationFormColumns()
 *   ensureStickyPromoTextColumn()
 */

var CONTENT_SHEET_NAME = '콘텐츠관리';

var STICKY_PROMO_HEADER_ALIASES = [
  'stickyPromoText',
  '스티키프로모텍스트',
  '하단프로모문구'
];

var UNIT_TYPE_OPTIONS_ALIASES = [
  'unitTypeOptions',
  '관심평형옵션',
  '평형옵션'
];

var VISIT_DATE_DAYS_ALIASES = [
  'visitDateDays',
  '방문일자일수',
  '방문예약일수'
];

var VISIT_DATE_OPTIONS_ALIASES = [
  'visitDateOptions',
  '방문일자옵션',
  '방문예약일자옵션'
];

var UNIT_TYPE_ENABLED_ALIASES = [
  'unitTypeEnabled',
  '관심평형노출',
  '평형노출'
];

var VISIT_DATE_ENABLED_ALIASES = [
  'visitDateEnabled',
  '방문일자노출',
  '방문예약일자노출'
];

var MAIN_COLOR_ALIASES = [
  'mainColor',
  '메인컬러',
  '메인색상',
  '메인색'
];

var SUB_COLOR_ALIASES = [
  'subColor',
  '서브컬러',
  '서브색상',
  '서브색'
];

var ACCENT_COLOR_ALIASES = [
  'accentColor',
  '강조컬러',
  '강조색상',
  '포인트컬러',
  '포인트색'
];

var CTA_PROMO_IMAGE_ALIASES = [
  'ctaPromoImage',
  'CTA홍보이미지',
  '방문예약아래이미지',
  '홍보관방문아래이미지'
];

var CTA_PROMO_IMAGE_PC_ALIASES = [
  'ctaPromoImagePc',
  'CTA홍보이미지PC',
  '방문예약아래이미지PC'
];

var CTA_PROMO_IMAGE_MOBILE_ALIASES = [
  'ctaPromoImageMobile',
  'CTA홍보이미지모바일',
  '방문예약아래이미지모바일'
];

var CTA_PROMO_BG_ALIASES = [
  'ctaPromoBg',
  'CTA홍보배경',
  '방문예약아래배경',
  '방문예약홍보배경'
];

var UNIT_TYPES_DATA_ALIASES = [
  'unitTypesData',
  'unitTypes',
  '세대안내',
  '세대안내데이터'
];

var POPUP_IMAGE1_ALIASES = [
  'popupImage1',
  '팝업이미지1',
  '이벤트팝업1',
  '팝업이미지01'
];

var POPUP_IMAGE2_ALIASES = [
  'popupImage2',
  '팝업이미지2',
  '이벤트팝업2',
  '팝업이미지02'
];

var DEFAULT_MAIN_COLOR = '#0f1d3a';
var DEFAULT_SUB_COLOR = '#d7b56d';
var DEFAULT_ACCENT_COLOR = '#caa85c';

var META_PIXEL_ID_ALIASES = [
  'metaPixelId',
  '메타픽셀ID',
  '메타픽셀',
  '메타전환코드'
];

var META_CONVERSION_EVENT_ALIASES = [
  'metaConversionEvent',
  '메타전환이벤트',
  '메타전환'
];

var GOOGLE_CONVERSION_ID_ALIASES = [
  'googleConversionId',
  '구글전환ID',
  '구글AdsID',
  '구글전환코드'
];

var GOOGLE_CONVERSION_LABEL_ALIASES = [
  'googleConversionLabel',
  '구글전환라벨',
  '구글전환Label'
];

var NAVER_CONVERSION_SCRIPT_ALIASES = [
  'naverConversionScript',
  '네이버전환스크립트',
  '네이버전환',
  '네이버전환코드'
];

var KAKAO_PIXEL_ID_ALIASES = [
  'kakaoPixelId',
  '카카오픽셀ID',
  '카카오픽셀',
  '카카오전환코드'
];

var CONVERSION_RAW_ALIASES = [
  '전환코드',
  'conversionRawHtml',
  'conversionCode'
];

var META_OWNERSHIP_ALIASES = [
  'metaOwnershipCode',
  'metaDomainVerification',
  '메타소유확인코드',
  '메타소유확인'
];

var GOOGLE_OWNERSHIP_ALIASES = [
  'googleOwnershipCode',
  'googleSiteVerification',
  '구글소유확인코드',
  '구글소유확인'
];

var NAVER_OWNERSHIP_ALIASES = [
  'naverOwnershipCode',
  'naverSiteVerification',
  '네이버소유확인코드',
  '네이버소유확인'
];

var KAKAO_OWNERSHIP_ALIASES = [
  'kakaoOwnershipCode',
  'kakaoSiteVerification',
  '카카오소유확인코드',
  '카카오소유확인'
];

var OWNERSHIP_RAW_ALIASES = [
  '소유확인코드',
  'ownershipRawHtml',
  'ownershipVerificationCode'
];

function parseBoolField_(value, defaultVal) {
  if (value === undefined || value === null || value === '') return defaultVal;
  if (typeof value === 'boolean') return value;
  var v = String(value).trim().toUpperCase();
  if (v === 'Y' || v === 'TRUE' || v === '1' || v === 'YES') return true;
  if (v === 'N' || v === 'FALSE' || v === '0' || v === 'NO') return false;
  return defaultVal;
}

function parsePipeList_(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  return String(raw)
    .split(/[|,]/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function parsePositiveInt_(raw, defaultValue) {
  var n = Number(raw);
  if (!isFinite(n) || n <= 0) return defaultValue;
  return Math.floor(n);
}

function formatVisitDateLabel_(dateStr) {
  if (!dateStr) return '';
  var parts = String(dateStr).trim().split('-');
  if (parts.length !== 3) return String(dateStr);
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  if (!year || !month || !day) return String(dateStr);
  var d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return String(dateStr);
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  return month + '월 ' + day + '일 (' + days[d.getDay()] + ')';
}

function buildVisitDateOptionsFromContent_(row, ext) {
  var explicit = parsePipeList_(
    getSiteField_(row, VISIT_DATE_OPTIONS_ALIASES)
  );

  if (!explicit.length && ext && ext.reservationForm) {
    explicit = parsePipeList_(ext.reservationForm.visitDateOptions);
  }

  if (explicit.length) {
    return explicit.map(function (value) {
      return {
        value: value,
        label: formatVisitDateLabel_(value)
      };
    });
  }

  return null;
}

function getUnitTypeOptionsFromContentRow_(row, ext) {
  var fromColumn = parsePipeList_(getSiteField_(row, UNIT_TYPE_OPTIONS_ALIASES));
  if (fromColumn.length) return fromColumn;

  if (ext && ext.reservationForm && ext.reservationForm.unitTypeOptions) {
    var fromExt = ext.reservationForm.unitTypeOptions;
    if (Array.isArray(fromExt)) {
      return fromExt.map(function (v) { return String(v).trim(); }).filter(Boolean);
    }
    return parsePipeList_(fromExt);
  }

  return [];
}

function getVisitDateDaysFromContentRow_(row, ext) {
  var fromColumn = getSiteField_(row, VISIT_DATE_DAYS_ALIASES);
  if (fromColumn !== undefined && fromColumn !== null && fromColumn !== '') {
    return parsePositiveInt_(fromColumn, 30);
  }

  if (ext && ext.reservationForm && ext.reservationForm.visitDateDays) {
    return parsePositiveInt_(ext.reservationForm.visitDateDays, 30);
  }

  return 30;
}

function getUnitTypeEnabledFromContentRow_(row, ext) {
  var raw = getSiteField_(row, UNIT_TYPE_ENABLED_ALIASES);
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return parseBoolField_(raw, true);
  }
  if (ext && ext.reservationForm && ext.reservationForm.unitTypeEnabled !== undefined) {
    return parseBoolField_(ext.reservationForm.unitTypeEnabled, true);
  }
  return true;
}

function getVisitDateEnabledFromContentRow_(row, ext) {
  var raw = getSiteField_(row, VISIT_DATE_ENABLED_ALIASES);
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return parseBoolField_(raw, true);
  }
  if (ext && ext.reservationForm && ext.reservationForm.visitDateEnabled !== undefined) {
    return parseBoolField_(ext.reservationForm.visitDateEnabled, true);
  }
  return true;
}

function insertColumnBeforeHeader_(sheet, beforeHeader, newHeader) {
  var map = getHeaderIndexMap_(sheet);
  var col = map[beforeHeader];
  if (col === undefined) {
    throw createAppError_(
      'INTERNAL_ERROR',
      beforeHeader + ' 컬럼 없음 — 1행 헤더를 확인하세요'
    );
  }
  sheet.insertColumnBefore(col + 1);
  sheet.getRange(1, col + 1).setValue(newHeader);
  return col + 1;
}

/** extendedData 없으면 시트 맨 뒤에 컬럼 추가 */
function ensureColumnBeforeExtended_(sheet, newHeader, anchorHeaders) {
  var map = getHeaderIndexMap_(sheet);
  if (map[newHeader] !== undefined) {
    return { added: false, column: newHeader };
  }

  var anchors = anchorHeaders || ['extendedData', '확장데이터'];
  var anchorCol = undefined;
  for (var i = 0; i < anchors.length; i++) {
    if (map[anchors[i]] !== undefined) {
      anchorCol = map[anchors[i]];
      break;
    }
  }

  if (anchorCol !== undefined) {
    sheet.insertColumnBefore(anchorCol + 1);
    sheet.getRange(1, anchorCol + 1).setValue(newHeader);
  } else {
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue(newHeader);
  }

  writeLog_('COLUMN_ADD', '', '콘텐츠관리.' + newHeader + ' 컬럼 추가');
  return { added: true, column: newHeader };
}

function hasAnyHeader_(map, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    if (map[aliases[i]] !== undefined) return true;
  }
  return false;
}

/**
 * 콘텐츠관리에 stickyPromoText 컬럼 없으면 extendedData 앞에 추가
 */
function ensureStickyPromoTextColumn() {
  var sheet = getSheet_(CONTENT_SHEET_NAME);
  var map = getHeaderIndexMap_(sheet);

  for (var i = 0; i < STICKY_PROMO_HEADER_ALIASES.length; i++) {
    if (map[STICKY_PROMO_HEADER_ALIASES[i]] !== undefined) {
      return {
        ok: true,
        added: false,
        message: '프로모 컬럼 이미 존재: ' + STICKY_PROMO_HEADER_ALIASES[i]
      };
    }
  }

  insertColumnBeforeHeader_(sheet, 'extendedData', 'stickyPromoText');
  writeLog_('COLUMN_ADD', '', '콘텐츠관리.stickyPromoText 컬럼 추가');

  return {
    ok: true,
    added: true,
    message: 'stickyPromoText 컬럼이 extendedData 앞에 추가되었습니다'
  };
}

/** 예약 폼 컬럼 — 옵션 + 노출 on/off */
function ensureReservationFormColumns() {
  var sheet = getSheet_(CONTENT_SHEET_NAME);
  var map = getHeaderIndexMap_(sheet);
  var added = [];
  var hasUnit = false;

  for (var u = 0; u < UNIT_TYPE_OPTIONS_ALIASES.length; u++) {
    if (map[UNIT_TYPE_OPTIONS_ALIASES[u]] !== undefined) {
      hasUnit = true;
      break;
    }
  }

  if (!hasUnit) {
    insertColumnBeforeHeader_(sheet, 'extendedData', 'visitDateEnabled');
    insertColumnBeforeHeader_(sheet, 'extendedData', 'unitTypeEnabled');
    insertColumnBeforeHeader_(sheet, 'extendedData', 'visitDateOptions');
    insertColumnBeforeHeader_(sheet, 'extendedData', 'visitDateDays');
    insertColumnBeforeHeader_(sheet, 'extendedData', 'unitTypeOptions');
    added.push(
      'unitTypeOptions', 'visitDateDays', 'visitDateOptions',
      'unitTypeEnabled', 'visitDateEnabled'
    );
  } else {
    var hasUnitEnabled = false;
    var hasDateEnabled = false;
    for (var i = 0; i < UNIT_TYPE_ENABLED_ALIASES.length; i++) {
      if (map[UNIT_TYPE_ENABLED_ALIASES[i]] !== undefined) hasUnitEnabled = true;
    }
    for (var j = 0; j < VISIT_DATE_ENABLED_ALIASES.length; j++) {
      if (map[VISIT_DATE_ENABLED_ALIASES[j]] !== undefined) hasDateEnabled = true;
    }
    if (!hasUnitEnabled) {
      insertColumnBeforeHeader_(sheet, 'extendedData', 'unitTypeEnabled');
      added.push('unitTypeEnabled');
      map = getHeaderIndexMap_(sheet);
    }
    if (!hasDateEnabled) {
      insertColumnBeforeHeader_(sheet, 'extendedData', 'visitDateEnabled');
      added.push('visitDateEnabled');
    }
  }

  var themeResult = ensureSiteThemeColumns();
  if (themeResult.added) {
    added = added.concat(themeResult.addedColumns || []);
  }

  return {
    ok: true,
    added: added.length > 0,
    message: added.length
      ? '예약 폼·테마 컬럼 추가: ' + added.join(', ')
      : '예약 폼·테마 컬럼 이미 존재'
  };
}

/** 브랜드 컬러 컬럼 — extendedData 앞 (없으면 맨 뒤) */
function ensureSiteThemeColumns() {
  var sheet = getSheet_(CONTENT_SHEET_NAME);
  var map = getHeaderIndexMap_(sheet);
  var added = [];
  // extendedData 앞에 넣을 때는 역순으로 삽입해야 main → sub → accent 순서가 됨
  var themeHeaders = ['accentColor', 'subColor', 'mainColor'];
  var themeAliases = [ACCENT_COLOR_ALIASES, SUB_COLOR_ALIASES, MAIN_COLOR_ALIASES];

  for (var t = 0; t < themeHeaders.length; t++) {
    if (hasAnyHeader_(map, themeAliases[t])) continue;
    var result = ensureColumnBeforeExtended_(sheet, themeHeaders[t]);
    if (result.added) added.push(themeHeaders[t]);
    map = getHeaderIndexMap_(sheet);
  }

  added.reverse();

  return {
    ok: true,
    added: added.length > 0,
    addedColumns: added,
    message: added.length
      ? '테마 컬러 컬럼 추가: ' + added.join(', ')
      : '테마 컬러 컬럼 이미 존재'
  };
}

/** CtaSection 아래 홍보 이미지 컬럼 — extendedData 앞 */
function ensureCtaPromoImageColumns() {
  var sheet = getSheet_(CONTENT_SHEET_NAME);
  var map = getHeaderIndexMap_(sheet);
  var added = [];
  var promoHeaders = [
    'ctaPromoBg',
    'ctaPromoImageMobile',
    'ctaPromoImagePc',
    'ctaPromoImage'
  ];
  var promoAliases = [
    CTA_PROMO_BG_ALIASES,
    CTA_PROMO_IMAGE_MOBILE_ALIASES,
    CTA_PROMO_IMAGE_PC_ALIASES,
    CTA_PROMO_IMAGE_ALIASES
  ];

  for (var p = 0; p < promoHeaders.length; p++) {
    if (hasAnyHeader_(map, promoAliases[p])) continue;
    var result = ensureColumnBeforeExtended_(sheet, promoHeaders[p]);
    if (result.added) added.push(promoHeaders[p]);
    map = getHeaderIndexMap_(sheet);
  }

  added.reverse();

  return {
    ok: true,
    added: added.length > 0,
    addedColumns: added,
    message: added.length
      ? 'CTA 홍보 이미지 컬럼 추가: ' + added.join(', ')
      : 'CTA 홍보 이미지 컬럼 이미 존재'
  };
}

/** 세대안내 JSON 컬럼 — layoutData 뒤 또는 extendedData 앞 */
function ensureUnitTypesDataColumn() {
  var sheet = getSheet_(CONTENT_SHEET_NAME);
  var map = getHeaderIndexMap_(sheet);

  if (hasAnyHeader_(map, UNIT_TYPES_DATA_ALIASES)) {
    return {
      ok: true,
      added: false,
      message: 'unitTypesData 컬럼 이미 존재'
    };
  }

  var layoutCol = map.layoutData;
  if (layoutCol !== undefined) {
    sheet.insertColumnAfter(layoutCol + 1);
    sheet.getRange(1, layoutCol + 2).setValue('unitTypesData');
  } else {
    ensureColumnBeforeExtended_(sheet, 'unitTypesData');
  }

  writeLog_('COLUMN_ADD', '', '콘텐츠관리.unitTypesData 컬럼 추가');
  return {
    ok: true,
    added: true,
    message: 'unitTypesData 컬럼 추가'
  };
}

/** 이벤트 팝업 이미지 컬럼 — extendedData 앞 */
function ensurePopupImageColumns() {
  var sheet = getSheet_(CONTENT_SHEET_NAME);
  var map = getHeaderIndexMap_(sheet);
  var added = [];
  var headers = ['popupImage2', 'popupImage1'];
  var aliases = [POPUP_IMAGE2_ALIASES, POPUP_IMAGE1_ALIASES];

  for (var i = 0; i < headers.length; i++) {
    if (hasAnyHeader_(map, aliases[i])) continue;
    var result = ensureColumnBeforeExtended_(sheet, headers[i]);
    if (result.added) added.push(headers[i]);
    map = getHeaderIndexMap_(sheet);
  }

  added.reverse();

  return {
    ok: true,
    added: added.length > 0,
    addedColumns: added,
    message: added.length
      ? '팝업 이미지 컬럼 추가: ' + added.join(', ')
      : '팝업 이미지 컬럼 이미 존재'
  };
}

function parseCtaPromoBg_(raw) {
  var v = String(raw || '').trim().toLowerCase();
  if (
    v === 'beige' ||
    v === '베이지' ||
    v === 'bg' ||
    v === '#f8f6f2' ||
    v === 'var(--color-bg)'
  ) {
    return 'beige';
  }
  return 'white';
}

function normalizeUnitTypeItems_(items) {
  if (!Array.isArray(items)) return [];
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item || typeof item !== 'object') continue;
    var tab = String(item.tab || item.title || '').trim();
    var title = String(item.title || tab || '').trim();
    var image = String(item.image || '').trim();
    if (!tab && !title && !image) continue;
    var resolvedTab = tab || title;
    result.push({
      tab: resolvedTab,
      title: title || resolvedTab,
      description: String(item.description || '').trim(),
      image: image,
      imagePc: item.imagePc ? String(item.imagePc).trim() : '',
      imageMobile: item.imageMobile ? String(item.imageMobile).trim() : ''
    });
  }
  return result;
}

function parseUnitTypesFromContentRow_(contentRow) {
  var raw = getSiteField_(contentRow, UNIT_TYPES_DATA_ALIASES);
  var parsed = parseJsonField_(raw, null);
  if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
    return {
      title: String(parsed.title || '세대안내').trim() || '세대안내',
      items: normalizeUnitTypeItems_(parsed.items)
    };
  }

  var legacy = parseJsonField_(getField_(contentRow, 'layoutData'), null);
  if (legacy && Array.isArray(legacy.items) && legacy.items.length) {
    return {
      title: '세대안내',
      items: normalizeUnitTypeItems_(legacy.items)
    };
  }

  return { title: '세대안내', items: [] };
}

/** Apps Script 편집기에서 직접 실행 — 컬러 컬럼만 추가 */
function runEnsureSiteThemeColumns() {
  var result = ensureSiteThemeColumns();
  Logger.log(result.message);
  try {
    SpreadsheetApp.getUi().alert(result.message);
  } catch (e) {
    /* UI 없는 실행(clasp run) */
  }
  return result;
}

function normalizeHexColor_(raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  var s = String(raw).trim();
  if (!s) return '';
  if (s.charAt(0) !== '#') s = '#' + s;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return (
      '#' +
      s.charAt(1) + s.charAt(1) +
      s.charAt(2) + s.charAt(2) +
      s.charAt(3) + s.charAt(3)
    ).toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return '';
}

function getThemeColorFromContentRow_(row, ext, aliases, extKey, defaultVal) {
  var fromColumn = normalizeHexColor_(getSiteField_(row, aliases));
  if (fromColumn) return fromColumn;

  if (ext && ext.theme && ext.theme[extKey]) {
    var fromExt = normalizeHexColor_(ext.theme[extKey]);
    if (fromExt) return fromExt;
  }

  return defaultVal;
}

function getConversionTrackingFromSiteRow_(siteRow) {
  if (!siteRow) {
    return {
      metaPixelId: '',
      metaConversionEvent: '',
      googleConversionId: '',
      googleConversionLabel: '',
      naverConversionScript: '',
      kakaoPixelId: '',
      conversionRawHtml: ''
    };
  }

  return {
    metaPixelId: getSiteField_(siteRow, META_PIXEL_ID_ALIASES),
    metaConversionEvent: getSiteField_(siteRow, META_CONVERSION_EVENT_ALIASES),
    googleConversionId: getSiteField_(siteRow, GOOGLE_CONVERSION_ID_ALIASES),
    googleConversionLabel: getSiteField_(siteRow, GOOGLE_CONVERSION_LABEL_ALIASES),
    naverConversionScript: getSiteField_(siteRow, NAVER_CONVERSION_SCRIPT_ALIASES),
    kakaoPixelId: getSiteField_(siteRow, KAKAO_PIXEL_ID_ALIASES),
    conversionRawHtml: getSiteField_(siteRow, CONVERSION_RAW_ALIASES)
  };
}

function getOwnershipVerificationFromSiteRow_(siteRow) {
  if (!siteRow) {
    return {
      metaOwnershipCode: '',
      googleOwnershipCode: '',
      naverOwnershipCode: '',
      kakaoOwnershipCode: '',
      ownershipRawHtml: ''
    };
  }

  return {
    metaOwnershipCode: getSiteField_(siteRow, META_OWNERSHIP_ALIASES),
    googleOwnershipCode: getSiteField_(siteRow, GOOGLE_OWNERSHIP_ALIASES),
    naverOwnershipCode: getSiteField_(siteRow, NAVER_OWNERSHIP_ALIASES),
    kakaoOwnershipCode: getSiteField_(siteRow, KAKAO_OWNERSHIP_ALIASES),
    ownershipRawHtml: getSiteField_(siteRow, OWNERSHIP_RAW_ALIASES)
  };
}

function findContentBySiteCode_(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) return null;
  var rows = sheetToObjects_(CONTENT_SHEET_NAME);
  for (var i = 0; i < rows.length; i++) {
    if (getSiteField_(rows[i], ['siteCode', '현장코드']) === code) {
      return rows[i];
    }
  }
  return null;
}

function getStickyPromoTextFromContentRow_(row) {
  if (!row) return '';

  var direct = getSiteField_(row, STICKY_PROMO_HEADER_ALIASES);
  if (direct) return direct;

  var extRaw = getField_(row, 'extendedData');
  if (!extRaw) return '';

  try {
    var ext = JSON.parse(extRaw);
    return String(ext.stickyPromoText || '').trim();
  } catch (e) {
    return '';
  }
}

function parseExtendedData_(row) {
  var extRaw = getField_(row, 'extendedData');
  if (!extRaw) return {};
  try {
    return JSON.parse(extRaw) || {};
  } catch (e) {
    return {};
  }
}

function parseJsonField_(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw;
  try {
    var parsed = JSON.parse(String(raw));
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function getContentTextField_(row, keys) {
  var val = getSiteField_(row, keys);
  return val !== undefined && val !== null ? String(val).trim() : '';
}

function buildSiteMetaFromSiteRow_(siteRow) {
  if (!siteRow) {
    return {
      siteName: '',
      phone: '',
      managerName: '',
      notificationPhone: '',
      settings: {
        popupEnabled: true,
        liveStatusEnabled: true,
        virtualReservationsEnabled: true,
        duplicateBlockMinutes: 120
      }
    };
  }

  return {
    siteName: getSiteField_(siteRow, ['siteName', '현장명', '사이트명']),
    phone: getSiteField_(siteRow, ['phone', '전화번호', '대표전화']),
    managerName: getSiteField_(siteRow, ['managerName', '담당자명', '관리자명']),
    notificationPhone: getSiteField_(siteRow, ['notifyPhone', 'notificationPhone', '알림수신번호']),
    settings: {
      popupEnabled: parseBoolField_(getSiteField_(siteRow, ['popupEnabled', '팝업노출']), true),
      liveStatusEnabled: parseBoolField_(getSiteField_(siteRow, ['liveStatusEnabled', '실시간현황노출']), true),
      virtualReservationsEnabled: parseBoolField_(
        getSiteField_(siteRow, ['virtualReservationEnabled', '가상접수노출']),
        true
      ),
      duplicateBlockMinutes: parsePositiveInt_(
        getSiteField_(siteRow, ['duplicateBlockMinutes', '중복접수차단분']),
        120
      )
    }
  };
}

function buildPageContentFromContentRow_(contentRow, ext) {
  var heroImage = getContentTextField_(contentRow, ['heroImage', '히어로이미지']);
  var heroVisualImage = getContentTextField_(contentRow, ['heroVisualImage', '히어로비주얼']) || heroImage;

  return {
    heroTitle: getContentTextField_(contentRow, ['heroTitle', '히어로제목', '메인카피']),
    heroSubTitle: getContentTextField_(contentRow, ['heroSubTitle', '히어로부제', '서브카피']),
    headerBrand: getContentTextField_(contentRow, ['headerBrand', '헤더브랜드', '브랜드']),
    headerSubBrand: getContentTextField_(contentRow, ['headerSubBrand', '헤더서브브랜드', '서브브랜드']),
    benefit1Title: getContentTextField_(contentRow, ['benefit1Title', '혜택1제목']),
    benefit1Value: getContentTextField_(contentRow, ['benefit1Value', 'benefit1Val', '혜택1값']),
    benefit2Title: getContentTextField_(contentRow, ['benefit2Title', '혜택2제목']),
    benefit2Value: getContentTextField_(contentRow, ['benefit2Value', 'benefit2Val', '혜택2값']),
    benefit3Title: getContentTextField_(contentRow, ['benefit3Title', '혜택3제목']),
    benefit3Value: getContentTextField_(contentRow, ['benefit3Value', 'benefit3Val', '혜택3값']),
    cardIcon1: getContentTextField_(contentRow, ['cardIcon1', '카드아이콘1', '혜택1아이콘']),
    cardIcon2: getContentTextField_(contentRow, ['cardIcon2', '카드아이콘2', '혜택2아이콘']),
    cardIcon3: getContentTextField_(contentRow, ['cardIcon3', '카드아이콘3', '혜택3아이콘']),
    ctaText: getContentTextField_(contentRow, ['ctaText', 'CTA문구']),
    mobileHookText: getContentTextField_(contentRow, ['mobileHookText', '모바일훅문구']),
    popupImage1: getContentTextField_(contentRow, POPUP_IMAGE1_ALIASES),
    popupImage2: getContentTextField_(contentRow, POPUP_IMAGE2_ALIASES),
    heroImage: heroImage,
    heroVisualImage: heroVisualImage,
    ctaPromoImage: getContentTextField_(contentRow, CTA_PROMO_IMAGE_ALIASES),
    ctaPromoImagePc: getContentTextField_(contentRow, CTA_PROMO_IMAGE_PC_ALIASES),
    ctaPromoImageMobile: getContentTextField_(contentRow, CTA_PROMO_IMAGE_MOBILE_ALIASES),
    ctaPromoBg: getContentTextField_(contentRow, CTA_PROMO_BG_ALIASES),
    floatingTodayReservations: parsePositiveInt_(
      getContentTextField_(contentRow, ['floatingTodayReservations', '오늘방문예약수']),
      27
    ),
    floatingActiveConsultations: parsePositiveInt_(
      getContentTextField_(contentRow, ['floatingActiveConsultations', '실시간상담수']),
      3
    ),
    overview: parseJsonField_(getField_(contentRow, 'overviewData'), {
      title: '사업개요',
      image: '',
      specs: []
    }),
    premium: parseJsonField_(getField_(contentRow, 'premiumData'), {
      title: '프리미엄',
      items: []
    }),
    location: parseJsonField_(getField_(contentRow, 'locationData'), {
      title: '입지환경',
      mapImage: '',
      items: []
    }),
    futureValue: parseJsonField_(getField_(contentRow, 'futureData'), {
      title: '미래가치',
      items: []
    }),
    unitTypes: parseUnitTypesFromContentRow_(contentRow),
    community: parseJsonField_(getField_(contentRow, 'communityData'), {
      title: '커뮤니티',
      items: []
    }),
    extendedData: ext || {}
  };
}

/**
 * GET action=site.config&siteCode=L001
 */
function getSiteLiveConfig(siteCode) {
  var code = String(siteCode || '').trim();
  if (!code) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode는 필수입니다');
  }

  var contentRow = findContentBySiteCode_(code);
  if (!contentRow) {
    throw createAppError_('SITE_NOT_FOUND', '콘텐츠관리에 현장 없음: ' + code);
  }

  var ext = parseExtendedData_(contentRow);
  var promo = getStickyPromoTextFromContentRow_(contentRow);
  var unitTypeOptions = getUnitTypeOptionsFromContentRow_(contentRow, ext);
  var visitDateDays = getVisitDateDaysFromContentRow_(contentRow, ext);
  var visitDateOptions = buildVisitDateOptionsFromContent_(contentRow, ext);
  var unitTypeEnabled = getUnitTypeEnabledFromContentRow_(contentRow, ext);
  var visitDateEnabled = getVisitDateEnabledFromContentRow_(contentRow, ext);
  var mainColor = getThemeColorFromContentRow_(
    contentRow, ext, MAIN_COLOR_ALIASES, 'mainColor', DEFAULT_MAIN_COLOR
  );
  var subColor = getThemeColorFromContentRow_(
    contentRow, ext, SUB_COLOR_ALIASES, 'subColor', DEFAULT_SUB_COLOR
  );
  var accentColor = getThemeColorFromContentRow_(
    contentRow, ext, ACCENT_COLOR_ALIASES, 'accentColor', DEFAULT_ACCENT_COLOR
  );
  var siteRow = findSiteByCode_(code);
  var conversionTracking = getConversionTrackingFromSiteRow_(siteRow);
  var ownershipVerification = getOwnershipVerificationFromSiteRow_(siteRow);
  var siteMeta = buildSiteMetaFromSiteRow_(siteRow);
  var pageContent = buildPageContentFromContentRow_(contentRow, ext);

  return {
    siteCode: code,
    siteName: siteMeta.siteName,
    phone: siteMeta.phone,
    managerName: siteMeta.managerName,
    notificationPhone: siteMeta.notificationPhone,
    settings: siteMeta.settings,
    stickyPromoText: promo || null,
    unitTypeOptions: unitTypeOptions,
    visitDateDays: visitDateDays,
    visitDateOptions: visitDateOptions,
    unitTypeEnabled: unitTypeEnabled,
    visitDateEnabled: visitDateEnabled,
    mainColor: mainColor,
    subColor: subColor,
    accentColor: accentColor,
    heroTitle: pageContent.heroTitle,
    heroSubTitle: pageContent.heroSubTitle,
    headerBrand: pageContent.headerBrand,
    headerSubBrand: pageContent.headerSubBrand,
    benefit1Title: pageContent.benefit1Title,
    benefit1Value: pageContent.benefit1Value,
    benefit2Title: pageContent.benefit2Title,
    benefit2Value: pageContent.benefit2Value,
    benefit3Title: pageContent.benefit3Title,
    benefit3Value: pageContent.benefit3Value,
    cardIcon1: pageContent.cardIcon1,
    cardIcon2: pageContent.cardIcon2,
    cardIcon3: pageContent.cardIcon3,
    ctaText: pageContent.ctaText,
    mobileHookText: pageContent.mobileHookText,
    popupImage1: pageContent.popupImage1,
    popupImage2: pageContent.popupImage2,
    heroImage: pageContent.heroImage,
    heroVisualImage: pageContent.heroVisualImage,
    ctaPromoImage: pageContent.ctaPromoImage,
    ctaPromoImagePc: pageContent.ctaPromoImagePc,
    ctaPromoImageMobile: pageContent.ctaPromoImageMobile,
    ctaPromoBg: pageContent.ctaPromoBg,
    floatingTodayReservations: pageContent.floatingTodayReservations,
    floatingActiveConsultations: pageContent.floatingActiveConsultations,
    overview: pageContent.overview,
    premium: pageContent.premium,
    location: pageContent.location,
    futureValue: pageContent.futureValue,
    unitTypes: pageContent.unitTypes,
    community: pageContent.community,
    extendedData: pageContent.extendedData,
    conversionTracking: conversionTracking,
    ownershipVerification: ownershipVerification,
    updatedAt: new Date().toISOString()
  };
}

function runEnsureStickyPromoColumnFromMenu() {
  var result = ensureStickyPromoTextColumn();
  SpreadsheetApp.getUi().alert(result.message);
}
