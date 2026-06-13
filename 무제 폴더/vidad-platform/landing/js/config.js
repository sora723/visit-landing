/**
 * VIDAD Landing — API 설정
 * 배포 시 window.VIDAD_CONFIG 로 덮어쓰거나 config.local.js 사용
 */
window.VIDAD_CONFIG = window.VIDAD_CONFIG || {
  /** Apps Script Web App URL (끝에 /exec) */
  apiBaseUrl: '',

  /** API 미설정 시 데모 데이터 사용 */
  demoMode: false,

  /** 기본 현장코드 (URL에 없을 때) */
  defaultSiteCode: 'A001'
};
