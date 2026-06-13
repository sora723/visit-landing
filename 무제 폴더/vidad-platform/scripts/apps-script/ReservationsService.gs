/**
 * ReservationsService.gs
 * 실시간 방문예약 현황 — reservations.recent
 */

var VIRTUAL_SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
var VIRTUAL_MINUTES = [2, 3, 5, 7, 9, 12, 15, 18, 22, 28, 35, 42];

/**
 * GET action=reservations.recent&siteCode=A001&limit=12
 */
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
  var virtualEnabled = ynToBool_(
    getSiteField_(siteRow, ['virtualReservationEnabled', '가상예약생성']),
    true
  );
  var realItems = buildRealReservationItems_(code, maxLimit);

  var items = realItems.slice();
  if (items.length < maxLimit && virtualEnabled) {
    var needed = maxLimit - items.length;
    var virtualItems = buildVirtualReservationItems_(code, needed, items);
    items = items.concat(virtualItems);
  }

  return {
    items: items.slice(0, maxLimit),
    realCount: realItems.length,
    virtualCount: Math.max(0, items.length - realItems.length)
  };
}

function buildRealReservationItems_(siteCode, limit) {
  var rows = sheetToObjects_(SHEET_NAMES.SUBMISSION);
  var filtered = [];

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    if (getSiteField_(row, ['siteCode', '현장코드']) !== siteCode) continue;
    if (getField_(row, '중복여부') === 'Y') continue;

    var submittedAt = row['createdAt'] || row['접수일시'];
    if (!submittedAt) continue;

    var date = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
    if (isNaN(date.getTime())) continue;

    filtered.push({
      name: maskName_(getSiteField_(row, ['name', '성함'])),
      submittedAt: date.toISOString(),
      minutesAgo: calcMinutesAgo_(date),
      isVirtual: false
    });
  }

  filtered.sort(function (a, b) {
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  return filtered.slice(0, limit);
}

function buildVirtualReservationItems_(siteCode, count, existingItems) {
  var items = [];
  var usedMinutes = {};
  existingItems.forEach(function (item) {
    usedMinutes[item.minutesAgo] = true;
  });

  for (var i = 0; i < count; i++) {
    var seed = hashCode_(siteCode + '_v_' + i);
    var surname = VIRTUAL_SURNAMES[Math.abs(seed) % VIRTUAL_SURNAMES.length];
    var minutesAgo = pickUnusedMinute_(seed, usedMinutes);
    usedMinutes[minutesAgo] = true;

    items.push({
      name: surname + '○○',
      submittedAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      minutesAgo: minutesAgo,
      isVirtual: true
    });
  }

  return items;
}

function maskName_(name) {
  var trimmed = String(name || '').trim();
  if (!trimmed) return '고객';
  if (trimmed.length === 1) return trimmed + '○○';
  return trimmed.charAt(0) + '○○';
}

function calcMinutesAgo_(date) {
  var diff = Date.now() - date.getTime();
  return Math.max(1, Math.floor(diff / 60000));
}

function pickUnusedMinute_(seed, used) {
  for (var i = 0; i < VIRTUAL_MINUTES.length; i++) {
    var idx = Math.abs(seed + i * 7) % VIRTUAL_MINUTES.length;
    var minute = VIRTUAL_MINUTES[idx];
    if (!used[minute]) return minute;
  }
  return VIRTUAL_MINUTES[Math.abs(seed) % VIRTUAL_MINUTES.length] + 1;
}

function hashCode_(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function testReservationsRecent() {
  var result = getRecentReservations('A001', 12);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
