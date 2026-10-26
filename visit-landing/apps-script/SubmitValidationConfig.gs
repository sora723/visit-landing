/**
 * 접수 검증 설정 — 값 변경 시 이 파일만 수정
 */
var SUBMIT_VALIDATION_CONFIG = {
  TOKEN_TTL_SECONDS: 600,
  /** 검수로그·접수관리 memo에 장기 체류 표시를 남기는 기준 */
  LONG_STAY_MARK_SECONDS: 1800,
  FAST_SUBMIT_SECONDS: 7,
  VERY_FAST_SUBMIT_SECONDS: 2,
  /** 동일 접수내용(전부 일치) 재접수 차단 창 — 하나라도 다르면 허용 */
  DUPLICATE_PHONE_TTL_SECONDS: 86400,
  ENABLE_FAST_SUBMIT_CONVERSION: true,
  REQUIRE_AD_SIGNAL_FOR_CONVERSION: true,
  /** 동일 IP · 동일 현장 — 짧은 시간 대량 접수 제한 (GFA 명의DB 묶음 공격 대응) */
  BULK_IP_WINDOW_SECONDS: 600,
  /**
   * 이 건수에 도달한 뒤(이상)부터 차단 — 예: 8이면 9건째부터 IP대량차단
   * 가족·동행이 같은 공유기(IP)로 연달아 접수하는 경우를 위해 3→8로 완화
   */
  BULK_IP_MAX_COUNT: 8,
  /** IP대량차단 시 _IP차단 자동 등록 유지 시간(시간) — expiresAt */
  BULK_IP_AUTO_BLOCK_HOURS: 24,
  /** IP/전화 중복 검사 시 시트 최근 N행만 스캔 (전체 로드 금지) — 중기: 스캔 축소 */
  VALIDATION_RECENT_LOG_ROWS: 200,
  VALIDATION_RECENT_SUBMISSION_ROWS: 200,
  /** 전화 중복 아님(네거티브) 캐시 TTL — 짧은 재스캔 방지 */
  DUPLICATE_PHONE_NEGATIVE_CACHE_SECONDS: 300
};
