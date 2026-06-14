/**
 * SiteDomainService.gs
 * 현장관리.domain → siteCode 매핑
 *
 * Web App:
 *   action=site.domains
 *   action=site.resolve&domain=wonju-hanyang.com
 */

var DOMAIN_ALIASES = ['domain', '도메인', 'siteDomain', 'customDomain'];

function normalizeDomainHostname_(raw) {
  var s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0].split(':')[0];
  if (s.indexOf('www.') === 0) {
    s = s.substring(4);
  }
  return s;
}

function parseDomainList_(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  return String(raw)
    .split(/[,|\n]+/)
    .map(function (part) { return normalizeDomainHostname_(part); })
    .filter(Boolean);
}

function getDomainFromSiteRow_(row) {
  return getSiteField_(row, DOMAIN_ALIASES);
}

function registerDomainInMap_(map, hostname, siteCode) {
  var host = normalizeDomainHostname_(hostname);
  if (!host || !siteCode) return;
  map[host] = siteCode;
  map['www.' + host] = siteCode;
}

/** 현장관리 — siteName 뒤 domain 컬럼 */
function ensureDomainColumn() {
  var sheet = getSheet_(SHEET_NAMES.SITE);
  var map = getHeaderIndexMap_(sheet);

  if (map['domain'] !== undefined) {
    return {
      ok: true,
      added: false,
      message: 'domain 컬럼 이미 존재'
    };
  }

  var anchorCol = map['siteName'];
  if (anchorCol === undefined) anchorCol = map['현장명'];
  if (anchorCol === undefined) anchorCol = map['siteCode'];
  if (anchorCol === undefined) anchorCol = map['현장코드'];

  if (anchorCol === undefined) {
    throw createAppError_(
      'INTERNAL_ERROR',
      'siteName/siteCode 컬럼 없음 — 현장관리 헤더를 확인하세요'
    );
  }

  sheet.insertColumnAfter(anchorCol + 1);
  sheet.getRange(1, anchorCol + 2).setValue('domain');
  SpreadsheetApp.flush();

  writeLog_('COLUMN_ADD', '', '현장관리.domain 컬럼 추가');

  return {
    ok: true,
    added: true,
    addedColumns: ['domain'],
    message: 'domain 컬럼이 siteName 뒤에 추가되었습니다'
  };
}

function ensureSiteManagementSchemaColumns_() {
  try {
    ensureDomainColumn();
  } catch (err) {
    Logger.log('[ensureSiteManagementSchemaColumns_] ' + (err.message || err));
  }
}

/** hostname → siteCode (www 자동 포함) */
function buildDomainSiteCodeMap_() {
  var rows = sheetToObjects_(SHEET_NAMES.SITE);
  var map = {};

  for (var i = 0; i < rows.length; i++) {
    var code = getSiteCodeFromRow_(rows[i]);
    if (!code) continue;

    var domains = parseDomainList_(getDomainFromSiteRow_(rows[i]));
    for (var d = 0; d < domains.length; d++) {
      registerDomainInMap_(map, domains[d], code);
    }
  }

  return map;
}

function findSiteCodeByDomain_(hostname) {
  var host = normalizeDomainHostname_(hostname);
  if (!host) return null;
  var map = buildDomainSiteCodeMap_();
  return map[host] || map['www.' + host] || null;
}

/** GET action=site.domains */
function getSiteDomains() {
  ensureSiteManagementSchemaColumns_();
  return {
    domains: buildDomainSiteCodeMap_(),
    updatedAt: new Date().toISOString()
  };
}

/** GET action=site.resolve&domain=wonju-hanyang.com */
function resolveSiteByDomain(hostname) {
  ensureSiteManagementSchemaColumns_();
  var normalized = normalizeDomainHostname_(hostname);
  var siteCode = findSiteCodeByDomain_(normalized);
  return {
    domain: normalized || null,
    siteCode: siteCode,
    matched: Boolean(siteCode)
  };
}

function runEnsureDomainColumn() {
  try {
    var result = ensureDomainColumn();
    Logger.log('[domain] ' + result.message);
    try {
      SpreadsheetApp.getUi().alert(
        result.added ? '✓ ' + result.message : result.message
      );
    } catch (e) {
      // 편집기 단독 실행
    }
    return result;
  } catch (err) {
    var msg = err.message || String(err);
    Logger.log('[domain] FAIL: ' + msg);
    try {
      SpreadsheetApp.getUi().alert('domain 컬럼 추가 실패:\n' + msg);
    } catch (e2) {
      // 편집기 단독 실행
    }
    throw err;
  }
}
