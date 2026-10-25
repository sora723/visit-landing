/**
 * 생년월일 정규화 — YYYY-MM-DD (월·일 00 허용)
 * 예: 1990-00-00, 90-00-00, 930326, 19930326
 */

function expandTwoDigitYear_(yy) {
  var currentYear = new Date().getFullYear();
  var year = 2000 + yy;
  if (year > currentYear) year = 1900 + yy;
  return year;
}

function pad2Birth_(n) {
  var s = String(n);
  return s.length === 1 ? '0' + s : s;
}

function validateBirthParts_(year, month, day) {
  var currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) {
    return { ok: false, error: '생년월일 연도를 확인해주세요' };
  }
  if (month < 0 || month > 12) {
    return { ok: false, error: '생년월일 월을 확인해주세요' };
  }
  if (day < 0 || day > 31) {
    return { ok: false, error: '생년월일 일을 확인해주세요' };
  }
  if (month > 0 && day > 0) {
    var dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day
    ) {
      return { ok: false, error: '올바른 생년월일을 입력해주세요' };
    }
  }
  return {
    ok: true,
    value: year + '-' + pad2Birth_(month) + '-' + pad2Birth_(day)
  };
}

/** 빈 값 → ok + '' / 실패 → ok false */
function normalizeBirthDate_(raw) {
  var trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: true, value: '' };

  var digits = trimmed.replace(/\D/g, '');

  if (digits.length === 8) {
    return validateBirthParts_(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)),
      Number(digits.slice(6, 8))
    );
  }

  if (digits.length === 6) {
    return validateBirthParts_(
      expandTwoDigitYear_(Number(digits.slice(0, 2))),
      Number(digits.slice(2, 4)),
      Number(digits.slice(4, 6))
    );
  }

  var parts = trimmed.split(/[-./\s]+/).filter(function (p) {
    return !!p;
  });
  if (parts.length === 3) {
    var yRaw = String(parts[0]).replace(/\D/g, '');
    var year = Number(yRaw);
    var month = Number(String(parts[1]).replace(/\D/g, ''));
    var day = Number(String(parts[2]).replace(/\D/g, ''));
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { ok: false, error: '생년월일 형식을 확인해주세요' };
    }
    if (yRaw.length <= 2) year = expandTwoDigitYear_(year);
    return validateBirthParts_(year, month, day);
  }

  return {
    ok: false,
    error: '생년월일은 930326, 90-00-00, 1993-00-00 형식으로 입력해주세요'
  };
}
