/**
 * 접수 검증 설정 — 값 변경 시 이 파일만 수정
 */
var SUBMIT_VALIDATION_CONFIG = {
  TOKEN_TTL_SECONDS: 600,
  FAST_SUBMIT_SECONDS: 7,
  VERY_FAST_SUBMIT_SECONDS: 2,
  DUPLICATE_PHONE_TTL_SECONDS: 86400,
  ENABLE_FAST_SUBMIT_CONVERSION: true,
  REQUIRE_AD_SIGNAL_FOR_CONVERSION: true,
  /** 동일 IP · 동일 현장 — 짧은 시간 대량 접수 제한 (GFA 명의DB 묶음 공격 대응) */
  BULK_IP_WINDOW_SECONDS: 600,
  /** 이 건수에 도달한 뒤(이상)부터 차단 — 예: 3이면 4건째부터 IP대량차단 */
  BULK_IP_MAX_COUNT: 3,
  /** IP대량차단 시 _IP차단 자동 등록 유지 시간(시간) — expiresAt */
  BULK_IP_AUTO_BLOCK_HOURS: 24
};
