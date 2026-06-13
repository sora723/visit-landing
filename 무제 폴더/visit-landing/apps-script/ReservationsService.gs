/**
 * ReservationsService.gs
 * VisitLanding — reservations.recent (실시간 방문예약 현황)
 *
 * 실제 접수(접수관리 시트)만 반환합니다.
 * 가상 접수는 프론트 UI 전용 — 시트·알림·채널톡 경로와 무관합니다.
 */

var LIVE_FEED_MAX_MINUTES = 20;

function getRecentReservations(siteCode, limit) {
  var code = String(siteCode || '').trim();
  if (!code) {
    throw createAppError_('VALIDATION_ERROR', 'siteCode는 필수입니다');
  }

  var siteRow = findSiteByCode_(code);
  if (!siteRow) {
    throw createAppError_('SITE_NOT_FOUND', '현장을 찾을 수 없습니다: ' + code);
  }

  var maxLimit = Math.min(Number(limit) || 12, 20);
  var realItems = buildRealReservationItems_(code, maxLimit);

  return {
    items: realItems,
    realCount: realItems.length,
    virtualCount: 0
  };
}

function buildRealReservationItems_(siteCode, limit) {
  var rows = sheetToObjects_(SHEET_NAMES.SUBMISSION);
  var filtered = [];

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    if (getSiteField_(row, ['siteCode', '현장코드']) !== siteCode) continue;

    var submittedAt = row['createdAt'] || row['접수일시'];
    if (!submittedAt) continue;

    var date = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
    if (isNaN(date.getTime())) continue;

    var minutesAgo = calcMinutesAgo_(date);
    if (minutesAgo > LIVE_FEED_MAX_MINUTES) continue;

    filtered.push({
      // 마스킹은 Next.js /api/reservations 에서 formatReservationName 처리 (복성 지원)
      name: String(getSiteField_(row, ['name', '성함']) || '').trim(),
      type: String(getSiteField_(row, ['consultType', '상담유형']) || '').trim(),
      submittedAt: date.toISOString(),
      minutesAgo: minutesAgo,
      isVirtual: false
    });
  }

  filtered.sort(function (a, b) {
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  return filtered.slice(0, limit);
}

var COMPOUND_SURNAMES = [
  '남궁', '제갈', '독고', '황보', '선우', '사공', '망절', '어금', '동방', '서문', '장곡'
];

function maskName_(name) {
  var trimmed = String(name || '').trim();
  if (!trimmed) return '고객';
  for (var i = 0; i < COMPOUND_SURNAMES.length; i++) {
    var compound = COMPOUND_SURNAMES[i];
    if (trimmed.indexOf(compound) === 0) return compound + '○○';
  }
  if (trimmed.length === 1) return trimmed + '○○';
  return trimmed.charAt(0) + '○○';
}

function calcMinutesAgo_(date) {
  var diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function testReservationsRecent() {
  return getRecentReservations('L001', 12);
}
