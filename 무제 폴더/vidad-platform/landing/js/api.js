(function (global) {
  'use strict';

  var config = global.VIDAD_CONFIG || {};

  function getApiBaseUrl() {
    return (config.apiBaseUrl || '').replace(/\/$/, '');
  }

  function resolveSiteCode() {
    var params = new URLSearchParams(global.location.search);
    var fromQuery = params.get('site') || params.get('siteCode');
    if (fromQuery) return fromQuery.trim();

    var parts = global.location.pathname.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    if (last && last !== 'index.html' && last !== 'complete.html') {
      return last.replace(/\.html$/, '');
    }
    if (parts.length >= 2) {
      var prev = parts[parts.length - 2];
      if (prev && prev !== 'landing') return prev;
    }

    return config.defaultSiteCode || 'A001';
  }

  function getUtmParams() {
    var params = new URLSearchParams(global.location.search);
    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || ''
    };
  }

  function fetchSite(siteCode) {
    var base = getApiBaseUrl();
    if (!base || config.demoMode) {
      return Promise.resolve({ success: true, data: getDemoSiteData(siteCode), error: null });
    }

    var url = base + '?action=site.get&siteCode=' + encodeURIComponent(siteCode);
    return fetch(url)
      .then(function (res) { return res.json(); })
      .catch(function () {
        return { success: true, data: getDemoSiteData(siteCode), error: null };
      });
  }

  function submitInterest(payload) {
    var base = getApiBaseUrl();
    if (!base || config.demoMode) {
      return Promise.resolve({
        success: true,
        data: {
          submissionId: 'demo-' + Date.now(),
          redirectUrl: '/complete.html?site=' + encodeURIComponent(payload.siteCode)
        },
        error: null
      });
    }

    return fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: 'submit' }, payload))
    }).then(function (res) { return res.json(); });
  }

  function kakaoRedirectUrl(siteCode) {
    var base = getApiBaseUrl();
    if (!base) return '#';
    return base + '?action=kakao.redirect&siteCode=' + encodeURIComponent(siteCode);
  }

  function getDemoSiteData(siteCode) {
    return {
      schemaVersion: '1.0',
      siteCode: siteCode,
      meta: {
        siteName: '더블역세권',
        status: 'ACTIVE',
        templateId: 'template-a',
        mode: 'scroll'
      },
      seo: {
        title: '더블역세권 분양 | 공식 홈페이지',
        description: '서울 접근성이 우수한 더블역세권 분양 정보를 확인하세요.',
        canonicalUrl: 'https://landing.david-ad.co.kr/' + siteCode,
        ogImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
        showInFooter: false
      },
      assets: { logo: '' },
      hero: {
        type: 'image',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80',
        videoUrl: '',
        hook: '서울 역세권 프리미엄 라이프',
        sub: '더블역 초역세권 주상복합'
      },
      overview: {
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
        siteName: '더블역세권',
        location: '서울특별시 OO구 OO동',
        scale: '지하 3층 / 지상 25층',
        units: '총 412세대',
        moveInDate: '2028년 12월',
        constructor: 'OO건설'
      },
      premium: [
        {
          sortOrder: 1,
          title: '초역세권',
          description: '더블역 도보 3분 거리의 초역세권 입지',
          image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
          icon: ''
        },
        {
          sortOrder: 2,
          title: '프리미엄 커뮤니티',
          description: '피트니스·라운지·키즈존 등 다양한 커뮤니티 시설',
          image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
          icon: ''
        }
      ],
      location: {
        title: '입지환경',
        mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80',
        items: [
          { sortOrder: 1, category: '교통', title: '더블역 환승', description: '3호선·9호선 더블역 환승 이용 가능', image: '' },
          { sortOrder: 2, category: '교육', title: '명문 학군', description: '초·중·고 우수 학군 인접', image: '' },
          { sortOrder: 3, category: '생활', title: '생활 인프라', description: '대형마트·병원·공원 인접', image: '' },
          { sortOrder: 4, category: '개발호재', title: '개발 호재', description: 'OO 개발계획에 따른 미래 가치 기대', image: '' }
        ]
      },
      floorplan: [
        {
          sortOrder: 1,
          typeName: '59A',
          image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
          area: '전용 59.98㎡',
          structure: '3Bay',
          features: '알파룸·드레스룸 구성'
        },
        {
          sortOrder: 2,
          typeName: '84B',
          image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
          area: '전용 84.12㎡',
          structure: '4Bay',
          features: '4Bay 판상형 구성'
        }
      ],
      contact: {
        guide: '궁금하신 점을 남겨주시면 담당자가 빠르게 연락드립니다.',
        formType: 'full',
        privacyConsentText: '개인정보 수집 및 이용에 동의합니다.'
      },
      footer: {
        siteName: '더블역세권',
        developer: 'OO시행',
        constructor: 'OO건설',
        phone: '1688-0000',
        agency: '다비드애드',
        businessNumber: '123-45-67890',
        contact: 'landing@david-ad.co.kr',
        privacyPolicy: '개인정보처리방침에 따른 수집·이용에 동의합니다.'
      },
      flags: {
        phoneButtonEnabled: true,
        kakaoButtonEnabled: true,
        interestFormEnabled: true
      },
      tracking: {
        gtmId: '',
        googleAdsConversionId: '',
        metaPixelId: ''
      }
    };
  }

  global.VidadApi = {
    getApiBaseUrl: getApiBaseUrl,
    resolveSiteCode: resolveSiteCode,
    getUtmParams: getUtmParams,
    fetchSite: fetchSite,
    submitInterest: submitInterest,
    kakaoRedirectUrl: kakaoRedirectUrl,
    getDemoSiteData: getDemoSiteData
  };
})(window);
