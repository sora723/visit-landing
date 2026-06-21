export interface SiteConfig {
  siteCode?: string;
  siteName: string;
  phone: string;
  kakaoUrl?: string;
  /** 개인정보 수집주체 — 현장관리.managerName */
  managerName?: string;
  notificationPhone: string;
  topBannerText?: string;
  /** 하단 고정바 프로모 — site.json / 콘텐츠관리.stickyPromoText (비우면 미표시) */
  stickyPromoText?: string;
  /** 헤더 상단 브랜드 — 콘텐츠관리.headerBrand */
  headerBrand?: string;
  /** 헤더 서브 브랜드 — 콘텐츠관리.headerSubBrand */
  headerSubBrand?: string;
  /** 브라우저 탭 파비콘 — extendedData.seo.faviconUrl */
  faviconUrl?: string;
  /** 상단 헤더 로고 — extendedData.headerLogoUrl */
  headerLogoUrl?: string;
  settings: {
    /** 현장관리 popupEnabled — 팝업 오버레이 전체 */
    popupEnabled: boolean;
    /** 콘텐츠관리 popupReservationEnabled — 팝업 내 방문예약 폼 (기본 Y) */
    popupReservationEnabled?: boolean;
    liveStatusEnabled: boolean;
    virtualReservationsEnabled: boolean;
    duplicateBlockMinutes: number;
  };
  popup: {
    title: string;
    completeMessage: string;
    privacyText: string;
    /** 이벤트 팝업 — Sheet popupImage1 / extendedData.popup */
    image1?: string;
    image1Mobile?: string;
    image1Pc?: string;
    /** PC 두 번째 이미지 — Sheet popupImage2 */
    image2?: string;
    image2Mobile?: string;
    image2Pc?: string;
  };
  hero: {
    hook: string;
    sub: string;
    image: string;
    imagePc?: string;
    imageMobile?: string;
    visualImage: string;
    visualImagePc?: string;
    visualImageMobile?: string;
    highlightDuration?: number;
    benefits: { title: string; value: string; iconKey?: string }[];
    floatingStats: {
      todayReservations: number;
      activeConsultations: number;
      todayLabel: string;
      activeLabel: string;
    };
  };
  liveReservation: {
    mobileVisibleCount: number;
    mobileRotateSeconds: number;
    pcVisibleCount: number;
    statusLabels: string[];
  };
  liveStatus: { title: string; subtitle: string };
  reservationGuide: {
    title: string;
    steps: { step: string; title: string; description: string }[];
  };
  overview: {
    title: string;
    image: string;
    imagePc?: string;
    imageMobile?: string;
    specs: { label: string; value: string }[];
  };
  premium: {
    title: string;
    items: {
      title: string;
      description: string;
      image: string;
      imagePc?: string;
      imageMobile?: string;
    }[];
  };
  location: {
    title: string;
    mapImage: string;
    mapImagePc?: string;
    mapImageMobile?: string;
    items: { category: string; title?: string; description?: string }[];
  };
  futureValue: {
    title: string;
    items: {
      title: string;
      description: string;
      image: string;
      imagePc?: string;
      imageMobile?: string;
    }[];
  };
  /** 세대안내 — 타입별 탭 (Sheet unitTypesData) */
  unitTypes: {
    title: string;
    items: {
      tab: string;
      title: string;
      description: string;
      image: string;
      imagePc?: string;
      imageMobile?: string;
    }[];
  };
  community: {
    title: string;
    /** 큰 설명 이미지 — 1장 풀폭, 2장 이상 세로 스택 (items 그리드와 별도) */
    galleryImages?: {
      image: string;
      imagePc?: string;
      imageMobile?: string;
      alt?: string;
    }[];
    items: {
      title: string;
      description: string;
      image: string;
      imagePc?: string;
      imageMobile?: string;
    }[];
  };
  cta: {
    title?: string;
    subtitle?: string;
    texts: string[];
    buttonText: string;
    privacyText: string;
  };
  /** 홍보관 방문예약 섹션 바로 아래 — 가운데 대형 이미지 (비우면 미노출) */
  ctaPromoImage?: CtaPromoImageSection;
  mobileBar: { hookText: string };
  footer: {
    items: { title: string; content: string }[];
    /** 하단 안내 문구 (개인정보 등) */
    bottomText?: string;
  };
  seo: { title: string; description: string; ogImage: string; faviconUrl?: string };
  /** 현장별 추가 이미지 섹션 — 비어 있으면 미노출 */
  customSections?: CustomImageSection[];
  /** 브랜드 컬러 — site.json 기본값 + Sheet live 덮어쓰기 */
  theme?: {
    mainColor: string;
    subColor: string;
    accentColor: string;
    liveStatusTitleColor?: string;
    ctaSectionTitleColor?: string;
    sectionTitleColor?: string;
    locationTitleColor?: string;
  };
  /** 관심평형·방문일자 — site.json 기본값 + Sheet live 덮어쓰기 */
  reservationForm?: {
    unitTypeOptions: string[];
    visitDateDays?: number;
    visitDateOptions?: { value: string; label: string }[];
    /** false면 관심평형 필드 숨김 */
    unitTypeEnabled?: boolean;
    /** false면 방문예약 일자 필드 숨김 */
    visitDateEnabled?: boolean;
  };
}

/** CtaSection 아래 단일 홍보 이미지 — Sheet ctaPromoImage / ctaPromoBg */
export interface CtaPromoImageSection {
  image: string;
  imagePc?: string;
  imageMobile?: string;
  backgroundColor: "white" | "beige";
}

/** 현장별 커스텀 이미지 블록 (site.json / 시트 extendedData) */
export interface CustomImageSection {
  id: string;
  enabled?: boolean;
  label?: string;
  title: string;
  description?: string;
  image: string;
  imagePc?: string;
  imageMobile?: string;
  href?: string;
}

export interface ReservationItem {
  name: string;
  minutesAgo: number;
  isVirtual: boolean;
  /** 상담유형 — 84A형 문의, 방문예약 신청 등 */
  type?: string;
  /** @deprecated UI 미노출 — 레거시 API 호환 */
  status?: string;
  /** ISO — 경과 시간 실시간 계산용 */
  submittedAt?: string;
  /** 결정론적 가상 카드 — React key·목록 안정화용 */
  virtualSlotId?: string;
}

export interface SubmitPayload {
  name: string;
  phone: string;
  privacyAgreed: boolean;
  unitType?: string;
  visitDate?: string;
  visitTime?: string;
  source?: string;
  sourceUrl?: string;
  referer?: string;
  device?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ReservationSubmitInput {
  name: string;
  phone: string;
  unitType?: string;
  visitDate?: string;
  source?: string;
}
