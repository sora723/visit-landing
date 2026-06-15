/**
 * VisitLanding_Master — Google Sheet row types
 * UI(SiteConfig)와 분리된 데이터 계층. 헤더명 = 1행 컬럼명.
 */

/** 현장관리 — 1 siteCode = 1 row */
export interface SiteManagementRow {
  siteCode: string;
  siteName: string;
  phone: string;
  managerName: string;
  managerPhone: string;
  notifyPhone: string;
  /** Google Spreadsheet ID (현장별 독립 파일) */
  submissionSpreadsheetId: string;
  /** Spreadsheet 파일명 — 예: L001_접수_더블역세권 */
  submissionSpreadsheetName: string;
  /** Spreadsheet 내 탭명 (기본: 접수관리) */
  submissionSheetName: string;
  popupEnabled: boolean | string;
  liveStatusEnabled: boolean | string;
  virtualReservationEnabled: boolean | string;
  duplicateBlockMinutes: number | string;
  isActive: boolean | string;
  /** 전환 추적 — /complete 페이지 (비우면 미실행) */
  metaPixelId?: string;
  metaConversionEvent?: string;
  googleConversionId?: string;
  googleConversionLabel?: string;
  naverConversionScript?: string;
  kakaoPixelId?: string;
  /** 소유 확인 — layout head meta (비우면 미실행) */
  metaOwnershipCode?: string;
  googleOwnershipCode?: string;
  naverOwnershipCode?: string;
  kakaoOwnershipCode?: string;
  /** 스크립트 원본 — /complete */
  전환코드?: string;
  /** meta/script 원본 — 전 페이지 head */
  소유확인코드?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 콘텐츠관리 — 1 siteCode = 1 row (이미지 URL 직접 입력) */
export interface ContentManagementRow {
  siteCode: string;
  heroTitle: string;
  heroSubTitle: string;
  benefit1Title: string;
  benefit1Value: string;
  benefit2Title: string;
  benefit2Value: string;
  benefit3Title: string;
  benefit3Value: string;
  cardIcon1?: string;
  cardIcon2?: string;
  cardIcon3?: string;
  /** JSON string: string[] — CTA A/B 문구 */
  ctaText: string;
  mobileHookText: string;
  popupImage1?: string;
  popupImage2?: string;
  heroImage: string;
  heroImagePc?: string;
  heroImageMobile?: string;
  heroVisualImage: string;
  heroVisualImagePc?: string;
  heroVisualImageMobile?: string;
  /** JSON — OverviewSection */
  overviewData: string;
  /** JSON — PremiumSection */
  premiumData: string;
  /** JSON — LocationSection */
  locationData: string;
  /** JSON — futureValue */
  futureData: string;
  /** JSON — unitTypes (세대안내 탭) */
  unitTypesData?: string;
  /** @deprecated layoutData → unitTypesData 로 이전 */
  layoutData?: string;
  /** JSON — community */
  communityData: string;
  floatingTodayReservations: number | string;
  floatingActiveConsultations: number | string;
  /** 하단 고정 프로모 — stickyPromoText / 스티키프로모텍스트 / 하단프로모문구 */
  stickyPromoText?: string;
  /** 관심평형 드롭다운 — 84A|84B|84C 또는 쉼표 구분 */
  unitTypeOptions?: string;
  /** 방문일자 자동 생성 일수 (기본 30) */
  visitDateDays?: number | string;
  /** 방문일자 지정 — 2026-06-15|2026-06-20 (비우면 visitDateDays 사용) */
  visitDateOptions?: string;
  /** Y/N — 관심평형 필드 노출 (기본 Y) */
  unitTypeEnabled?: boolean | string;
  /** Y/N — 방문예약 일자 필드 노출 (기본 Y) */
  visitDateEnabled?: boolean | string;
  /** CtaSection 아래 대형 홍보 이미지 URL */
  ctaPromoImage?: string;
  ctaPromoImagePc?: string;
  ctaPromoImageMobile?: string;
  /** white | beige | 흰색 | 베이지 */
  ctaPromoBg?: string;
  /** JSON — SiteFooter 타이틀·내용 목록 */
  footerData?: string;
  /**
   * JSON — site.json 나머지 필드 (popup, footer, seo, liveStatus, reservationGuide, liveReservation, cta 버튼 등)
   * Sheet flat 컬럼에 없는 UI 설정은 여기에 통합
   */
  extendedData?: string;
}

/** 접수관리 — 접수 1건 = 1 row */
export interface SubmissionRow {
  id: string;
  siteCode: string;
  createdAt: string;
  name: string;
  phone: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  referer: string;
  device: string;
  ip: string;
  status: string;
  memo: string;
}

/** extendedData JSON shape (콘텐츠관리.extendedData) */
export interface ContentExtendedData {
  popup?: {
    title: string;
    completeMessage: string;
    privacyText: string;
    image1?: string;
    image1Mobile?: string;
    image1Pc?: string;
    image2?: string;
    image2Mobile?: string;
    image2Pc?: string;
  };
  liveStatus?: { title: string; subtitle: string };
  reservationGuide?: {
    title: string;
    steps: { step: string; title: string; description: string }[];
  };
  liveReservation?: {
    mobileVisibleCount: number;
    mobileRotateSeconds: number;
    pcVisibleCount: number;
    statusLabels: string[];
  };
  hero?: {
    highlightDuration?: number;
    floatingStats?: { todayLabel: string; activeLabel: string };
  };
  cta?: { buttonText: string; privacyText: string };
  footer?: {
    items?: { title?: string; content?: string; label?: string; value?: string }[];
    bottomText?: string;
    privacyPolicy?: string;
    developer?: string;
    constructor?: string;
    agency?: string;
    businessNumber?: string;
    contact?: string;
  };
  seo?: { title: string; description: string; ogImage: string };
  /** extendedData fallback — stickyPromoText 컬럼 우선 */
  stickyPromoText?: string;
  customSections?: import("./types").CustomImageSection[];
  ctaPromoImage?: {
    image?: string;
    imagePc?: string;
    imageMobile?: string;
    backgroundColor?: string;
  };
  reservationForm?: {
    unitTypeOptions?: string[] | string;
    visitDateDays?: number;
    visitDateOptions?: string[] | string;
    unitTypeEnabled?: boolean;
    visitDateEnabled?: boolean;
  };
}
