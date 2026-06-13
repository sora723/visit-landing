import type { ReservationItem, SiteData } from "./types";

export function getDemoSiteData(siteCode: string): SiteData {
  return {
    schemaVersion: "1.0",
    siteCode,
    meta: {
      siteName: "더블역세권",
      status: "ACTIVE",
      templateId: "template-a",
      mode: "scroll",
    },
    seo: {
      title: "더블역세권 분양 | 공식 홈페이지",
      description: "서울 접근성이 우수한 더블역세권 분양 정보를 확인하세요.",
      canonicalUrl: `https://landing.david-ad.co.kr/${siteCode}`,
      ogImage:
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
      showInFooter: false,
    },
    assets: { logo: "" },
    hero: {
      type: "image",
      image:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80",
      videoUrl: "",
      hook: "서울 역세권 프리미엄 라이프",
      sub: "더블역 초역세권 주상복합",
      benefits: ["계약금 500만원", "중도금 무이자", "발코니 확장 무상"],
    },
    overview: {
      image:
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
      siteName: "더블역세권",
      location: "서울특별시 OO구 OO동",
      scale: "지하 3층 / 지상 25층",
      units: "총 412세대",
      moveInDate: "2028년 12월",
      constructor: "OO건설",
    },
    premium: [
      {
        sortOrder: 1,
        title: "초역세권",
        description: "더블역 도보 3분 거리의 초역세권 입지",
        image:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
      },
      {
        sortOrder: 2,
        title: "프리미엄 커뮤니티",
        description: "피트니스·라운지·키즈존 등 다양한 커뮤니티 시설",
        image:
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
      },
    ],
    location: {
      title: "입지환경",
      mapImage:
        "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80",
      items: [
        {
          sortOrder: 1,
          category: "교통",
          title: "더블역 환승",
          description: "3호선·9호선 더블역 환승 이용 가능",
        },
        {
          sortOrder: 2,
          category: "교육",
          title: "명문 학군",
          description: "초·중·고 우수 학군 인접",
        },
        {
          sortOrder: 3,
          category: "생활",
          title: "생활 인프라",
          description: "대형마트·병원·공원 인접",
        },
        {
          sortOrder: 4,
          category: "개발호재",
          title: "개발 호재",
          description: "OO 개발계획에 따른 미래 가치 기대",
        },
      ],
    },
    floorplan: [],
    futureValue: [
      {
        sortOrder: 1,
        title: "도시재생",
        description: "광역 개발계획에 따른 지역 가치 상승 기대",
        image:
          "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
      },
      {
        sortOrder: 2,
        title: "교통망 확충",
        description: "GTX·지하철 연장 등 교통 인프라 확대",
        image:
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
      },
    ],
    siteLayout: [
      {
        sortOrder: 1,
        title: "단지배치도",
        description: "최적 동·호 배치와 쾌적한 단지 설계",
        image:
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
      },
    ],
    community: [
      {
        sortOrder: 1,
        title: "피트니스",
        description: "최신 운동기구를 갖춘 프리미엄 피트니스",
        image:
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
      },
      {
        sortOrder: 2,
        title: "키즈존",
        description: "아이들을 위한 안전하고 쾌적한 놀이 공간",
        image:
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      },
    ],
    popup: {
      enabled: true,
      title: "선착순 방문예약",
      completeMessage:
        "방문예약이 접수되었습니다.\n\n담당자가 순차적으로 연락드립니다.",
      privacyText:
        "개인정보 수집 및 이용에 동의합니다.\n\n수집항목 : 이름, 연락처\n이용목적 : 방문예약 및 상담안내\n보유기간 : 상담 종료 후 즉시 파기",
    },
    liveStatus: {
      enabled: true,
      virtualEnabled: true,
      title: "실시간 방문예약 현황",
      subtitle: "홍보관 방문예약 접수 진행중",
    },
    reservationGuide: {
      title: "방문예약 안내",
      steps: [
        {
          step: "01",
          title: "방문예약 접수",
          description: "온라인으로 간편하게 방문예약을 접수합니다.",
        },
        {
          step: "02",
          title: "담당자 확인전화",
          description: "담당자가 예약 내용을 확인 후 연락드립니다.",
        },
        {
          step: "03",
          title: "홍보관 방문상담",
          description: "방문하시면 전문 상담사가 안내해 드립니다.",
        },
      ],
    },
    cta: {
      headline: "선착순 방문예약 진행중",
      subtext: "홍보관 방문 시 특별혜택 제공",
      buttonText: "방문예약하기",
    },
    mobileBar: { hookText: "선착순 방문예약 진행중" },
    settings: { duplicateBlockMinutes: 120 },
    contact: {
      guide: "궁금하신 점을 남겨주시면 담당자가 빠르게 연락드립니다.",
      formType: "simple",
      privacyConsentText: "개인정보 수집 및 이용에 동의합니다.",
    },
    footer: {
      siteName: "더블역세권",
      developer: "OO시행",
      constructor: "OO건설",
      phone: "1688-0000",
      agency: "다비드애드",
      businessNumber: "123-45-67890",
      contact: "landing@david-ad.co.kr",
      privacyPolicy: "개인정보처리방침에 따른 수집·이용에 동의합니다.",
    },
    flags: {
      phoneButtonEnabled: true,
      kakaoButtonEnabled: true,
      interestFormEnabled: true,
    },
    tracking: { gtmId: "", googleAdsConversionId: "", metaPixelId: "" },
  };
}

export function getDemoReservations(limit: number): ReservationItem[] {
  const names = ["김○○", "이○○", "박○○", "최○○", "정○○", "강○○", "조○○", "윤○○"];
  const minutes = [2, 3, 5, 7, 9, 12, 15, 18, 22, 28, 35, 42];
  return Array.from({ length: limit }, (_, i) => ({
    name: names[i % names.length],
    submittedAt: new Date(Date.now() - minutes[i % minutes.length] * 60000).toISOString(),
    minutesAgo: minutes[i % minutes.length],
    isVirtual: i > 2,
  }));
}
