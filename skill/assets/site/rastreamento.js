/* Camada de rastreamento do site — modelo da skill "rastreamento-avancado".
   O site só escreve eventos no dataLayer; o GTM decide o destino (GA4, Google Ads, Meta).
   Não envia dados pessoais do visitante. O consentimento por defeito (negado) e a escolha
   guardada são aplicados no <head> (cabecalho.html), antes do GTM; aqui ficam o banner e os eventos.

   Configuração por projeto: window.TRK_CONFIG (definido no cabecalho.html pelo montar_snippets.py)
   - consent_key: chave do localStorage (igual à do cabeçalho);
   - ctas: botões com nome próprio (<a data-cta="nome">) → { event, contact_type, social_network, carry };
   - links sem data-cta são classificados pelo destino (AUTO_LINKS): telefone, e-mail, WhatsApp, redes, mapa, saída.
   Depuração: abrir a página com ?trk_debug=1 mostra cada evento na consola. */
(function () {
  'use strict';

  var CONFIG = window.TRK_CONFIG || {};
  var CONSENT_KEY = CONFIG.consent_key || 'trk_consent_v1';
  var dataLayer = (window.dataLayer = window.dataLayer || []);
  var debug = /[?&]trk_debug=1(&|$)/.test(location.search);

  // Chaves repostas a cada evento: o modelo de dados do GTM guarda valores antigos e,
  // sem isto, um scroll_depth levaria o cta_name do último clique.
  var EVENT_KEYS = ['cta_name', 'cta_location', 'link_url', 'contact_type', 'social_network',
    'section_name', 'percent_scrolled', 'engagement_seconds', 'form_name', 'form_source'];

  // Botões com nome próprio. "carry: true" leva as UTMs (e o gclid, com consentimento) no link —
  // útil quando o botão abre um formulário noutro domínio.
  var CTA_EVENTS = {
    solicitar_orcamento: { event: 'click_quote_request', contact_type: 'email_comercial' },
    pedido_informacao: { event: 'click_info_request', contact_type: 'formulario_site', carry: true },
    telefone: { event: 'click_phone', contact_type: 'telefone' },
    whatsapp: { event: 'click_whatsapp', contact_type: 'whatsapp' },
    email: { event: 'click_email', contact_type: 'email' },
    instagram: { event: 'click_social', social_network: 'instagram' },
    facebook: { event: 'click_social', social_network: 'facebook' },
    mapa: { event: 'click_map' },
    morada: { event: 'click_address' },
    site: { event: 'click_outbound' }
  };
  Object.keys(CONFIG.ctas || {}).forEach(function (name) { CTA_EVENTS[name] = CONFIG.ctas[name]; });

  // Links sem data-cta (WordPress, construtores de sites): ganha a primeira regra que bater no href.
  var AUTO_LINKS = [
    { test: /^tel:/i, name: 'telefone', event: 'click_phone', contact_type: 'telefone' },
    { test: /^mailto:/i, name: 'email', event: 'click_email', contact_type: 'email' },
    { test: /(wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com|^whatsapp:)/i, name: 'whatsapp', event: 'click_whatsapp', contact_type: 'whatsapp' },
    { test: /instagram\.com/i, name: 'instagram', event: 'click_social', social_network: 'instagram' },
    { test: /(facebook\.com|fb\.me\/|m\.me\/)/i, name: 'facebook', event: 'click_social', social_network: 'facebook' },
    { test: /linkedin\.com/i, name: 'linkedin', event: 'click_social', social_network: 'linkedin' },
    { test: /(youtube\.com|youtu\.be)/i, name: 'youtube', event: 'click_social', social_network: 'youtube' },
    { test: /tiktok\.com/i, name: 'tiktok', event: 'click_social', social_network: 'tiktok' },
    { test: /(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps)/i, name: 'mapa', event: 'click_map' }
  ];

  function gtag() { dataLayer.push(arguments); }

  function newEventId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function track(eventName, params) {
    var payload = { event: eventName, event_id: newEventId() };
    EVENT_KEYS.forEach(function (key) { payload[key] = undefined; });
    if (params) {
      Object.keys(params).forEach(function (key) {
        if (params[key] !== undefined) payload[key] = params[key];
      });
    }
    dataLayer.push(payload);
    if (debug && window.console) console.log('[trk]', payload);
    return payload;
  }
  window.trkTrack = track;

  function slug(text) {
    return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  }

  // Onde está o elemento: data-track-section, senão cabeçalho/rodapé, senão a secção com id.
  function locationOf(el) {
    if (!el || !el.closest) return undefined;
    var tagged = el.closest('[data-track-section]');
    if (tagged) return tagged.getAttribute('data-track-section');
    var landmark = el.closest('header, nav, footer');
    if (landmark) return landmark.tagName.toLowerCase();
    var section = el.closest('section[id]');
    return section ? slug(section.id) : undefined;
  }

  /* ---------- Consentimento ---------- */

  function readConsent() {
    try {
      var value = JSON.parse(localStorage.getItem(CONSENT_KEY));
      return value && value.v === 1 ? value : null;
    } catch (e) {
      return null;
    }
  }

  function storeConsent(choice) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(choice)); } catch (e) { /* sem armazenamento: o banner volta na próxima visita */ }
  }

  function applyConsent(choice, source, previous) {
    var analytics = choice.analytics ? 'granted' : 'denied';
    var marketing = choice.marketing ? 'granted' : 'denied';
    // A page_view inicial saiu sem cookies; o GTM reenvia-a quando a estatística é aceite agora.
    var analyticsNewlyGranted = choice.analytics && !(previous && previous.analytics) ? 'true' : 'false';
    gtag('consent', 'update', {
      analytics_storage: analytics,
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing
    });
    track('consent_update', { consent_analytics: analytics, consent_marketing: marketing, consent_source: source, analytics_newly_granted: analyticsNewlyGranted });
  }

  function setupConsentBanner() {
    var banner = document.getElementById('consent');
    if (!banner) return;
    var prefs = document.getElementById('consent-prefs');
    var analyticsBox = document.getElementById('consent-analytics');
    var marketingBox = document.getElementById('consent-marketing');
    var customizeButton = banner.querySelector('[data-consent="customize"]');
    var saveButton = banner.querySelector('[data-consent="save"]');

    function showPrefs(show) {
      prefs.hidden = !show;
      saveButton.hidden = !show;
      customizeButton.hidden = show;
      customizeButton.setAttribute('aria-expanded', show ? 'true' : 'false');
      if (show) analyticsBox.focus();
    }

    function open(withPrefs) {
      var current = readConsent();
      analyticsBox.checked = !!(current && current.analytics);
      marketingBox.checked = !!(current && current.marketing);
      banner.hidden = false;
      showPrefs(!!withPrefs);
    }

    function decide(choice, source) {
      var previous = readConsent();
      choice.v = 1;
      choice.ts = new Date().toISOString();
      storeConsent(choice);
      applyConsent(choice, source, previous);
      banner.hidden = true;
    }

    banner.addEventListener('click', function (event) {
      var button = event.target.closest('[data-consent]');
      if (!button) return;
      var action = button.getAttribute('data-consent');
      if (action === 'accept') decide({ analytics: true, marketing: true }, 'aceitar_tudo');
      else if (action === 'reject') decide({ analytics: false, marketing: false }, 'recusar_tudo');
      else if (action === 'customize') showPrefs(true);
      else if (action === 'save') decide({ analytics: analyticsBox.checked, marketing: marketingBox.checked }, 'personalizado');
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-open]'), function (wrapper) {
      wrapper.hidden = false;
      wrapper.addEventListener('click', function (event) {
        if (event.target.closest('button, a')) open(true);
      });
    });

    if (!readConsent()) open(false);
  }

  /* ---------- Cliques ---------- */

  var CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
  var CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'];

  // Leva a origem da visita para o destino do link: UTMs sempre; IDs de clique só com consentimento de marketing.
  function carryAttribution(link) {
    var current = new URLSearchParams(location.search);
    var consent = readConsent();
    var keys = CAMPAIGN_PARAMS.concat(consent && consent.marketing ? CLICK_ID_PARAMS : []);
    var target;
    try { target = new URL(link.href); } catch (e) { return; }
    var changed = false;
    keys.forEach(function (key) {
      var value = current.get(key);
      if (value && !target.searchParams.has(key)) {
        target.searchParams.set(key, value);
        changed = true;
      }
    });
    if (changed) link.href = target.toString();
  }

  function autoRule(link, href) {
    for (var i = 0; i < AUTO_LINKS.length; i += 1) {
      if (AUTO_LINKS[i].test.test(href)) return AUTO_LINKS[i];
    }
    if (/^https?:/i.test(href) && link.hostname && link.hostname !== location.hostname) {
      return { name: slug(link.hostname.replace(/^www\./, '')), event: 'click_outbound' };
    }
    return null; // âncora ou link interno: não é evento
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-cta], a[href]');
    if (!link) return;
    var name = link.getAttribute('data-cta');
    var href = link.getAttribute('href') || '';
    var spec = name ? (CTA_EVENTS[name] || { event: 'click_cta' }) : autoRule(link, href);
    if (!spec) return;
    if (!name) name = spec.name;
    if (spec.carry || link.hasAttribute('data-carry-utm')) carryAttribution(link);
    track(spec.event, {
      cta_name: name,
      cta_location: locationOf(link),
      link_url: href || undefined,
      contact_type: spec.contact_type,
      social_network: spec.social_network
    });
  }, true);

  /* ---------- Formulários (envio confirmado) ---------- */

  function lead(form, source, fallbackName) {
    var name = form && form.getAttribute
      ? (form.getAttribute('data-track-form') || form.getAttribute('name') || form.id || form.getAttribute('aria-label'))
      : fallbackName;
    track('generate_lead', { form_name: slug(name) || 'formulario', form_source: source, cta_location: locationOf(form) });
  }
  // Formulário próprio: chamar window.trkLead('nome') quando o servidor confirmar o envio.
  window.trkLead = function (name) { lead(null, 'site', name); };

  document.addEventListener('wpcf7mailsent', function (e) { lead(e.target, 'contact_form_7'); });
  function bindJQueryForms() {
    var $ = window.jQuery;
    if (!$ || bindJQueryForms.done) return;
    bindJQueryForms.done = true;
    $(document).on('submit_success', function (e) { lead(e.target, 'elementor'); });
    $(document).on('wpformsAjaxSubmitSuccess', function (e) { lead(e.target, 'wpforms'); });
    $(document).on('gform_confirmation_loaded', function (e, formId) { lead(null, 'gravity_forms', 'gform_' + formId); });
  }
  bindJQueryForms();
  window.addEventListener('load', bindJQueryForms);

  /* ---------- Profundidade de rolagem ---------- */

  var scrollMarks = [25, 50, 75, 90];
  var scrollSent = {};
  var scrollQueued = false;

  function checkScroll() {
    scrollQueued = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var percent = max > 0 ? (window.scrollY / max) * 100 : 100;
    scrollMarks.forEach(function (mark) {
      if (percent >= mark && !scrollSent[mark]) {
        scrollSent[mark] = true;
        track('scroll_depth', { percent_scrolled: mark });
      }
    });
  }

  window.addEventListener('scroll', function () {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(checkScroll);
  }, { passive: true });

  /* ---------- Secções vistas ---------- */

  if ('IntersectionObserver' in window) {
    var tagged = document.querySelectorAll('[data-track-section]');
    var sections = tagged.length ? tagged : document.querySelectorAll('section[id]');
    var sectionName = function (el) { return el.getAttribute('data-track-section') || slug(el.id); };
    var seenSections = {};
    var thresholds = [];
    for (var step = 0; step <= 10; step += 1) thresholds.push(step / 10);
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var name = sectionName(entry.target);
        // Metade da secção, ou metade do ecrã ocupada por ela (secções mais altas que o ecrã).
        var reference = Math.min(entry.boundingClientRect.height, window.innerHeight);
        if (reference > 0 && entry.intersectionRect.height / reference >= 0.5 && !seenSections[name]) {
          seenSections[name] = true;
          sectionObserver.unobserve(entry.target);
          track('section_view', { section_name: name });
        }
      });
    }, { threshold: thresholds });
    Array.prototype.forEach.call(sections, function (section) { sectionObserver.observe(section); });
  }

  /* ---------- Tempo com a página visível ---------- */

  var engagedSeconds = 0;
  var engagedMarks = [15, 30, 60, 120];
  var engagedTimer = window.setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    engagedSeconds += 1;
    engagedMarks.forEach(function (mark) {
      if (engagedSeconds === mark) track('engaged_time', { engagement_seconds: mark });
    });
    if (engagedSeconds >= engagedMarks[engagedMarks.length - 1]) window.clearInterval(engagedTimer);
  }, 1000);

  /* ---------- Interação com mapa do Google (iframe) ---------- */

  var mapFrames = document.querySelectorAll('iframe[src*="google.com/maps"], iframe[src*="maps.google"]');
  var mapTracked = false;
  if (mapFrames.length) {
    window.addEventListener('blur', function () {
      window.setTimeout(function () {
        var active = document.activeElement;
        if (!mapTracked && active && Array.prototype.indexOf.call(mapFrames, active) >= 0) {
          mapTracked = true;
          track('map_interaction', { section_name: locationOf(active) || 'mapa' });
        }
      }, 0);
    });
  }

  if (window.TRK_GTM_ID) setupConsentBanner();
})();
