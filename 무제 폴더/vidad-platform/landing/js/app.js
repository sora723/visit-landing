(function () {
  'use strict';

  var siteCode = VidadApi.resolveSiteCode();
  var siteData = null;
  var activeFloorplanIndex = 0;

  var els = {
    loading: document.getElementById('app-loading'),
    error: document.getElementById('app-error'),
    errorMessage: document.getElementById('error-message'),
    app: document.getElementById('app'),
    heroMedia: document.getElementById('hero-media'),
    heroHook: document.getElementById('hero-hook'),
    heroSub: document.getElementById('hero-sub'),
    logoText: document.getElementById('logo-text'),
    overviewImage: document.getElementById('overview-image'),
    overviewName: document.getElementById('overview-name'),
    overviewSpecs: document.getElementById('overview-specs'),
    premiumGrid: document.getElementById('premium-grid'),
    locationTitle: document.getElementById('location-title'),
    locationMap: document.getElementById('location-map'),
    locationMapWrap: document.getElementById('location-map-wrap'),
    locationItems: document.getElementById('location-items'),
    floorplanTabs: document.getElementById('floorplan-tabs'),
    floorplanPanel: document.getElementById('floorplan-panel'),
    contactGuide: document.getElementById('contact-guide'),
    formFields: document.getElementById('form-fields'),
    privacyText: document.getElementById('privacy-text'),
    contactForm: document.getElementById('contact-form'),
    formError: document.getElementById('form-error'),
    submitBtn: document.getElementById('submit-btn'),
    footerSiteName: document.getElementById('footer-site-name'),
    footerSeo: document.getElementById('footer-seo'),
    footerInfo: document.getElementById('footer-info'),
    footerPrivacy: document.getElementById('footer-privacy'),
    footerYear: document.getElementById('footer-year'),
    ctaPhone: document.getElementById('cta-phone'),
    ctaKakao: document.getElementById('cta-kakao'),
    ctaForm: document.getElementById('cta-form'),
    navToggle: document.getElementById('nav-toggle'),
    navMobile: document.getElementById('nav-mobile'),
    siteHeader: document.getElementById('site-header')
  };

  function showError(message) {
    els.loading.hidden = true;
    els.app.hidden = true;
    els.error.hidden = false;
    els.errorMessage.textContent = message;
  }

  function showApp() {
    els.loading.hidden = true;
    els.error.hidden = true;
    els.app.hidden = false;
  }

  function setMeta(data) {
    document.title = data.seo.title || data.meta.siteName + ' 분양';
    setMetaContent('description', data.seo.description);
    setLinkCanonical(data.seo.canonicalUrl);
    setMetaProperty('og:title', data.seo.title);
    setMetaProperty('og:description', data.seo.description);
    setMetaProperty('og:image', data.seo.ogImage);
    injectTracking(data.tracking);
  }

  function setMetaContent(name, content) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (el) el.setAttribute('content', content || '');
  }

  function setMetaProperty(prop, content) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (el) el.setAttribute('content', content || '');
  }

  function setLinkCanonical(href) {
    var el = document.querySelector('link[rel="canonical"]');
    if (el) el.setAttribute('href', href || '');
  }

  function injectTracking(tracking) {
    if (!tracking) return;
    if (tracking.gtmId) {
      var gtmScript = document.createElement('script');
      gtmScript.textContent = '(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","' + tracking.gtmId + '");';
      document.head.appendChild(gtmScript);
    }
    if (tracking.metaPixelId) {
      var fbScript = document.createElement('script');
      fbScript.textContent = '!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","' + tracking.metaPixelId + '");fbq("track","PageView");';
      document.head.appendChild(fbScript);
    }
  }

  function renderHero(data) {
    els.heroMedia.innerHTML = '';
    if (data.hero.type === 'video' && data.hero.videoUrl) {
      var iframe = document.createElement('iframe');
      iframe.src = toEmbedUrl(data.hero.videoUrl);
      iframe.title = '홍보 영상';
      iframe.allow = 'autoplay; encrypted-media';
      iframe.setAttribute('allowfullscreen', '');
      els.heroMedia.appendChild(iframe);
    } else if (data.hero.image) {
      var img = document.createElement('img');
      img.src = data.hero.image;
      img.alt = data.meta.siteName;
      els.heroMedia.appendChild(img);
    }
    els.heroHook.textContent = data.hero.hook || data.meta.siteName;
    els.heroSub.textContent = data.hero.sub || '';
  }

  function toEmbedUrl(url) {
    if (url.indexOf('youtube.com/watch') !== -1) {
      var id = new URL(url).searchParams.get('v');
      return 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id;
    }
    return url;
  }

  function renderOverview(data) {
    var o = data.overview;
    els.logoText.textContent = data.meta.siteName;
    els.overviewName.textContent = o.siteName;
    if (o.image) {
      els.overviewImage.src = o.image;
      els.overviewImage.alt = o.siteName + ' 조감도';
    }
    var specs = [
      { label: '위치', value: o.location },
      { label: '규모', value: o.scale },
      { label: '세대수', value: o.units },
      { label: '입주예정', value: o.moveInDate },
      { label: '시공사', value: o.constructor }
    ];
    els.overviewSpecs.innerHTML = specs
      .filter(function (s) { return s.value; })
      .map(function (s) {
        return '<div class="spec-item"><dt>' + escapeHtml(s.label) + '</dt><dd>' + escapeHtml(s.value) + '</dd></div>';
      })
      .join('');
  }

  function renderPremium(items) {
    els.premiumGrid.innerHTML = items.map(function (item, i) {
      return (
        '<article class="premium-card" style="--delay:' + (i * 0.1) + 's">' +
          (item.image ? '<div class="premium-card-image"><img src="' + escapeAttr(item.image) + '" alt="' + escapeAttr(item.title) + '" loading="lazy"></div>' : '') +
          '<div class="premium-card-body">' +
            '<h3>' + escapeHtml(item.title) + '</h3>' +
            '<p>' + escapeHtml(item.description) + '</p>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function renderLocation(data) {
    var loc = data.location;
    els.locationTitle.textContent = loc.title || '입지환경';
    if (loc.mapImage) {
      els.locationMap.src = loc.mapImage;
      els.locationMapWrap.hidden = false;
    } else {
      els.locationMapWrap.hidden = true;
    }
    els.locationItems.innerHTML = (loc.items || []).map(function (item) {
      return (
        '<article class="location-card">' +
          '<span class="location-category">' + escapeHtml(item.category) + '</span>' +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          '<p>' + escapeHtml(item.description) + '</p>' +
        '</article>'
      );
    }).join('');
  }

  function renderFloorplan(items) {
    if (!items.length) {
      document.getElementById('floorplan').hidden = true;
      return;
    }
    els.floorplanTabs.innerHTML = items.map(function (item, i) {
      return (
        '<button type="button" role="tab" class="floorplan-tab' + (i === 0 ? ' is-active' : '') + '" data-index="' + i + '" aria-selected="' + (i === 0) + '">' +
          escapeHtml(item.typeName) +
        '</button>'
      );
    }).join('');
    renderFloorplanPanel(items, 0);
    els.floorplanTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.floorplan-tab');
      if (!btn) return;
      var index = Number(btn.dataset.index);
      activeFloorplanIndex = index;
      els.floorplanTabs.querySelectorAll('.floorplan-tab').forEach(function (tab, i) {
        tab.classList.toggle('is-active', i === index);
        tab.setAttribute('aria-selected', i === index);
      });
      renderFloorplanPanel(items, index);
    });
  }

  function renderFloorplanPanel(items, index) {
    var item = items[index];
    els.floorplanPanel.innerHTML =
      '<div class="floorplan-content">' +
        '<div class="floorplan-image"><img src="' + escapeAttr(item.image) + '" alt="' + escapeAttr(item.typeName) + ' 평면도" loading="lazy"></div>' +
        '<div class="floorplan-details">' +
          '<h3>' + escapeHtml(item.typeName) + '</h3>' +
          '<ul class="floorplan-meta">' +
            (item.area ? '<li><strong>면적</strong>' + escapeHtml(item.area) + '</li>' : '') +
            (item.structure ? '<li><strong>구조</strong>' + escapeHtml(item.structure) + '</li>' : '') +
            (item.features ? '<li><strong>특징</strong>' + escapeHtml(item.features) + '</li>' : '') +
          '</ul>' +
        '</div>' +
      '</div>';
  }

  function renderContact(data) {
    var contact = data.contact;
    var flags = data.flags;
    els.contactGuide.textContent = contact.guide || '';
    els.privacyText.textContent = contact.privacyConsentText || '개인정보 수집 및 이용에 동의합니다.';

    if (!flags.interestFormEnabled) {
      document.getElementById('contact').hidden = true;
      els.ctaForm.hidden = true;
      return;
    }

    var isFull = contact.formType === 'full';
    var baseFields = [
      fieldHtml('name', '성함', 'text', true, '홍길동'),
      fieldHtml('phone', '연락처', 'tel', true, '01012345678')
    ];
    var fullFields = isFull ? [
      fieldSelect('ageRange', '연령대', true, ['20대', '30대', '40대', '50대', '60대 이상']),
      fieldSelect('consultType', '상담유형', true, ['방문상담', '전화상담', '카카오상담']),
      fieldHtml('reserveDate', '예약날짜', 'date', true),
      fieldHtml('reserveTime', '예약시간', 'time', true),
      fieldHtml('inquiry', '기타문의', 'textarea', false, '문의사항을 입력해주세요')
    ] : [
      fieldHtml('inquiry', '문의내용', 'textarea', false, '문의사항을 입력해주세요 (선택)')
    ];

    els.formFields.innerHTML = baseFields.concat(fullFields).join('');
  }

  function fieldHtml(name, label, type, required, placeholder) {
    if (type === 'textarea') {
      return (
        '<div class="form-group form-group--full">' +
          '<label for="' + name + '">' + escapeHtml(label) + (required ? ' <span class="required">*</span>' : '') + '</label>' +
          '<textarea id="' + name + '" name="' + name + '" rows="3" placeholder="' + escapeAttr(placeholder || '') + '"' + (required ? ' required' : '') + '></textarea>' +
        '</div>'
      );
    }
    return (
      '<div class="form-group">' +
        '<label for="' + name + '">' + escapeHtml(label) + (required ? ' <span class="required">*</span>' : '') + '</label>' +
        '<input type="' + type + '" id="' + name + '" name="' + name + '" placeholder="' + escapeAttr(placeholder || '') + '"' + (required ? ' required' : '') + '>' +
      '</div>'
    );
  }

  function fieldSelect(name, label, required, options) {
    return (
      '<div class="form-group">' +
        '<label for="' + name + '">' + escapeHtml(label) + ' <span class="required">*</span></label>' +
        '<select id="' + name + '" name="' + name + '" required>' +
          '<option value="">선택해주세요</option>' +
          options.map(function (opt) { return '<option value="' + escapeAttr(opt) + '">' + escapeHtml(opt) + '</option>'; }).join('') +
        '</select>' +
      '</div>'
    );
  }

  function renderFooter(data) {
    var f = data.footer;
    els.footerSiteName.textContent = f.siteName;
    els.footerYear.textContent = new Date().getFullYear();
    if (data.seo.showInFooter && data.seo.description) {
      els.footerSeo.textContent = data.seo.description;
      els.footerSeo.hidden = false;
    }
    var info = [
      { label: '시행사', value: f.developer },
      { label: '시공사', value: f.constructor },
      { label: '대표번호', value: f.phone },
      { label: '광고대행', value: f.agency },
      { label: '사업자등록번호', value: f.businessNumber },
      { label: '문의', value: f.contact }
    ];
    els.footerInfo.innerHTML = info
      .filter(function (i) { return i.value; })
      .map(function (i) {
        return '<div><dt>' + escapeHtml(i.label) + '</dt><dd>' + escapeHtml(i.value) + '</dd></div>';
      })
      .join('');
    els.footerPrivacy.textContent = f.privacyPolicy || '';
  }

  function renderCta(data) {
    var flags = data.flags;
    var phone = data.footer.phone;

    if (flags.phoneButtonEnabled && phone) {
      els.ctaPhone.href = 'tel:' + phone.replace(/\D/g, '');
      els.ctaPhone.hidden = false;
    }
    if (flags.kakaoButtonEnabled) {
      els.ctaKakao.href = VidadApi.kakaoRedirectUrl(siteCode);
      els.ctaKakao.hidden = false;
    }
    if (!flags.interestFormEnabled) {
      els.ctaForm.hidden = true;
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    els.formError.hidden = true;

    var form = els.contactForm;
    var fd = new FormData(form);
    var utm = VidadApi.getUtmParams();

    var payload = {
      siteCode: siteCode,
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      privacyAgreed: fd.get('privacyAgreed') === 'on',
      inquiry: String(fd.get('inquiry') || '').trim(),
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign
    };

    if (siteData.contact.formType === 'full') {
      payload.ageRange = String(fd.get('ageRange') || '').trim();
      payload.consultType = String(fd.get('consultType') || '').trim();
      payload.reserveDate = String(fd.get('reserveDate') || '').trim();
      payload.reserveTime = String(fd.get('reserveTime') || '').trim();
    }

    setSubmitting(true);

    VidadApi.submitInterest(payload).then(function (res) {
      setSubmitting(false);
      if (res.success && res.data) {
        var redirect = res.data.redirectUrl || ('complete.html?site=' + encodeURIComponent(siteCode));
        if (redirect.indexOf('http') !== 0) {
          var base = window.location.pathname.replace(/\/[^/]*$/, '/');
          window.location.href = base + redirect.replace(/^\//, '');
        } else {
          window.location.href = redirect;
        }
        return;
      }
      els.formError.textContent = (res.error && res.error.message) || '접수에 실패했습니다. 다시 시도해주세요.';
      els.formError.hidden = false;
    }).catch(function () {
      setSubmitting(false);
      els.formError.textContent = '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
      els.formError.hidden = false;
    });
  }

  function setSubmitting(isSubmitting) {
    els.submitBtn.disabled = isSubmitting;
    els.submitBtn.querySelector('.btn-text').hidden = isSubmitting;
    els.submitBtn.querySelector('.btn-loading').hidden = !isSubmitting;
  }

  function setupNav() {
    els.navToggle.addEventListener('click', function () {
      var expanded = els.navToggle.getAttribute('aria-expanded') === 'true';
      els.navToggle.setAttribute('aria-expanded', !expanded);
      els.navMobile.hidden = expanded;
    });

    els.navMobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        els.navMobile.hidden = true;
        els.navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    window.addEventListener('scroll', function () {
      els.siteHeader.classList.toggle('is-scrolled', window.scrollY > 60);
    }, { passive: true });

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = anchor.getAttribute('href');
        if (id === '#') return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.section, .premium-card, .location-card').forEach(function (el) {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function init() {
    setupNav();

    VidadApi.fetchSite(siteCode).then(function (res) {
      if (!res.success || !res.data) {
        showError((res.error && res.error.message) || '현장 정보를 찾을 수 없습니다.');
        return;
      }

      if (res.data.meta.status !== 'ACTIVE') {
        showError('현재 접수가 마감된 현장입니다.');
        return;
      }

      siteData = res.data;
      setMeta(siteData);
      renderHero(siteData);
      renderOverview(siteData);
      renderPremium(siteData.premium || []);
      renderLocation(siteData);
      renderFloorplan(siteData.floorplan || []);
      renderContact(siteData);
      renderFooter(siteData);
      renderCta(siteData);
      showApp();
      setupReveal();
    }).catch(function () {
      showError('서버 연결에 실패했습니다.');
    });

    els.contactForm.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
