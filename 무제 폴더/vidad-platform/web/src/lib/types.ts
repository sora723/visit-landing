export interface ContentItem {
  sortOrder: number;
  category?: string;
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  features?: string;
  typeName?: string;
  area?: string;
  structure?: string;
}

export interface SiteData {
  schemaVersion: string;
  siteCode: string;
  meta: {
    siteName: string;
    status: string;
    templateId: string;
    mode: string;
  };
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage: string;
    showInFooter: boolean;
  };
  assets: { logo: string };
  hero: {
    type: string;
    image: string;
    videoUrl: string;
    hook: string;
    sub: string;
    benefits: string[];
  };
  overview: {
    image: string;
    siteName: string;
    location: string;
    scale: string;
    units: string;
    moveInDate: string;
    constructor: string;
  };
  premium: ContentItem[];
  location: {
    title: string;
    mapImage: string;
    items: ContentItem[];
  };
  floorplan: ContentItem[];
  futureValue: ContentItem[];
  siteLayout: ContentItem[];
  community: ContentItem[];
  popup: {
    enabled: boolean;
    title: string;
    completeMessage: string;
    privacyText: string;
  };
  liveStatus: {
    enabled: boolean;
    virtualEnabled: boolean;
    title: string;
    subtitle: string;
  };
  reservationGuide: {
    title: string;
    steps: { step: string; title: string; description: string }[];
  };
  cta: {
    headline: string;
    subtext: string;
    buttonText: string;
  };
  mobileBar: { hookText: string };
  settings: { duplicateBlockMinutes: number };
  contact: {
    guide: string;
    formType: string;
    privacyConsentText: string;
  };
  footer: {
    siteName: string;
    developer: string;
    constructor: string;
    phone: string;
    agency: string;
    businessNumber: string;
    contact: string;
    privacyPolicy: string;
  };
  flags: {
    phoneButtonEnabled: boolean;
    kakaoButtonEnabled: boolean;
    interestFormEnabled: boolean;
  };
  tracking: {
    gtmId: string;
    googleAdsConversionId: string;
    metaPixelId: string;
  };
}

export interface ReservationItem {
  name: string;
  submittedAt: string;
  minutesAgo: number;
  isVirtual: boolean;
}

export interface SubmitPayload {
  siteCode: string;
  name: string;
  phone: string;
  privacyAgreed: boolean;
  sourceUrl?: string;
  referer?: string;
  device?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface SubmitResult {
  submissionId: string;
  redirectUrl: string;
}
