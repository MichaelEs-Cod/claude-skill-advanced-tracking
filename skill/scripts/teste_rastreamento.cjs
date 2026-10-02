// Teste ponta a ponta do rastreamento num site PUBLICADO, a partir do rastreamento.config.json do projeto.
// Simula 4 visitantes — recusa, aceita (e fica na página), retorno com retirada do consentimento e
// "só estatística" — e confere pelos pedidos de rede: GA4 (gcs G100/G101/G111), Google Ads (conversões com o
// rótulo certo e transaction_id = event_id) e Meta (PageView, ViewContent, Lead, Contact, envolvimento — só com
// consentimento de marketing). O que não estiver configurado (Ads, Meta, secções, mapa…) é saltado.
//
// Uso: node teste_rastreamento.cjs rastreamento.config.json [--url URL] [--saida pasta] [--rapido]
//   --url     testa outro endereço (ex.: ramo de teste) em vez de url_publicada
//   --saida   pasta dos relatórios (por defeito: teste-rastreamento/ ao lado da configuração)
//   --rapido  não espera pelos marcos de tempo na página (poupa ~2 min; não testa engaged_time nem o envolvimento do Meta)
// Precisa do Playwright ("npm i -D playwright" ou PLAYWRIGHT_PATH). Usa o Chrome instalado (CHROME_PATH) se existir.
const fs = require('node:fs');
const path = require('node:path');

function loadPlaywright() {
  const { createRequire } = require('node:module');
  const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
  const attempts = [
    () => process.env.PLAYWRIGHT_PATH && require(process.env.PLAYWRIGHT_PATH),
    () => fromProject('playwright'), () => fromProject('playwright-core'),
    () => require('playwright'), () => require('playwright-core'),
  ];
  for (const attempt of attempts) {
    try { const lib = attempt(); if (lib) return lib; } catch (e) { /* tenta o próximo */ }
  }
  console.error('Playwright não encontrado: "npm i -D playwright-core" na pasta do projeto (usa o Chrome instalado), ou defina PLAYWRIGHT_PATH.');
  process.exit(2);
}

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || '') : null; };
const configPath = args.find(a => !a.startsWith('--') && /\.json$/i.test(a));
if (!configPath) { console.error('Uso: node teste_rastreamento.cjs rastreamento.config.json [--url URL] [--saida pasta] [--rapido]'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const T = cfg.teste || {};
const RAPIDO = args.includes('--rapido');
const BASE = flag('--url') || cfg.url_publicada;
if (!BASE) { console.error('Falta url_publicada na configuração (ou --url).'); process.exit(2); }
const QUERY = T.query || '?utm_source=qa&utm_medium=teste&utm_campaign=teste_rastreamento&gclid=QA-teste-rastreamento';
const withQuery = BASE + (BASE.includes('?') ? '&' + QUERY.replace(/^\?/, '') : QUERY);
const OUT = path.resolve(flag('--saida') || path.join(path.dirname(path.resolve(configPath)), 'teste-rastreamento'));
fs.mkdirSync(OUT, { recursive: true });

const GTM_ID = cfg.gtm_id;
const GA4_ID = cfg.ga4_id;
const ADS_ID = String((cfg.google_ads || {}).conversion_id || '').replace('AW-', '');
const HAS_ADS = /^\d{6,12}$/.test(ADS_ID);
const PIXEL_ID = String((cfg.meta || {}).pixel_id || '');
const HAS_META = /^\d{10,20}$/.test(PIXEL_ID);
const CONVERSIONS = HAS_ADS ? ((cfg.google_ads || {}).conversoes || []).filter(c => c.rotulo) : [];
const CONV_BY_EVENT = Object.fromEntries(CONVERSIONS.map(c => [c.evento, c]));
const LABELS = CONVERSIONS.map(c => c.rotulo);
const META_BY_EVENT = {};
if (HAS_META) {
  for (const e of cfg.meta.lead || []) META_BY_EVENT[e] = 'Lead';
  for (const e of cfg.meta.contact || []) META_BY_EVENT[e] = 'Contact';
}
const ENGAGED_META = HAS_META && cfg.meta.envolvimento_segundos ? cfg.meta.envolvimento_segundos : null;
const META_EVENTS = ['PageView', 'ViewContent', 'Lead', 'Contact'].concat(ENGAGED_META ? [`Envolvimento${ENGAGED_META}s`] : []);
const C = Object.assign({
  banner: '#consent', aceitar: '[data-consent="accept"]', recusar: '[data-consent="reject"]',
  personalizar: '[data-consent="customize"]', guardar: '[data-consent="save"]',
  estatistica: '#consent-analytics', marketing: '#consent-marketing', preferencias: '[data-consent-open] button',
}, T.consentimento || {});
const BUTTONS = T.botoes || [];
const SECTIONS = T.secoes || [];
const ENGAGED_MARKS = T.segundos_envolvimento || [15, 30, 60, 120];
const PAGE = cfg.pagina || {};

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok, detail: detail === undefined ? '' : detail });
  const text = detail === undefined ? '' : ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail));
  console.log(`${ok ? 'OK  ' : 'FALHA'} [${group}] ${name}${text}`);
}
const skip = (group, name, why) => console.log(`--   [${group}] ${name} — saltado (${why})`);

function parseCollect(request) {
  const url = new URL(request.url());
  const common = Object.fromEntries(url.searchParams);
  const lines = (request.postData() || '').split('\n').filter(Boolean);
  const events = lines.length ? lines.map(line => ({ ...common, ...Object.fromEntries(new URLSearchParams(line)) })) : [common];
  return events.filter(e => e.en);
}

async function newSession(browser, label, context) {
  if (!context) {
    // Navegador "normal" (sem HeadlessChrome nem webdriver), para o GA4 não descartar as visitas como robô.
    const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`;
    context = await browser.newContext({ viewport: { width: 1280, height: 860 }, userAgent, locale: 'pt-BR' });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // Os botões abrem e-mail, telefone e outros sites: o clique é registado, a navegação é cancelada.
      window.addEventListener('click', e => { if (e.target.closest && e.target.closest('a[href]')) e.preventDefault(); });
    });
  }
  const page = await context.newPage();
  const s = { label, context, page, ga4: [], ads: [], fb: [], meta: 0, gtm: 0, errors: [] };
  page.on('pageerror', e => s.errors.push(e.message));
  page.on('request', request => {
    const u = request.url();
    if (u.includes('googletagmanager.com/gtm.js') && u.includes(GTM_ID)) s.gtm += 1;
    if (/facebook\.(com|net)/.test(u)) {
      s.meta += 1;
      if (/facebook\.com\/tr/.test(u)) {
        const url = new URL(u);
        const body = request.postData() || '';
        const fields = { ...Object.fromEntries(url.searchParams) };
        if (/Content-Disposition/i.test(body)) {
          for (const m of body.matchAll(/name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g)) fields[m[1]] = m[2];
        } else if (body) Object.assign(fields, Object.fromEntries(new URLSearchParams(body)));
        s.fb.push({ id: fields.id, ev: fields.ev, eid: fields.eid || '', cn: fields['cd[content_name]'] || '' });
      }
    }
    if (/\/g\/collect/.test(u) && u.includes(GA4_ID)) {
      for (const e of parseCollect(request)) {
        s.ga4.push({ en: e.en, gcs: e.gcs, p: Object.fromEntries(Object.entries(e).filter(([k]) => k.startsWith('ep.') || k.startsWith('epn.')).map(([k, v]) => [k.replace(/^epn?\./, ''), v])) });
      }
    }
    if (HAS_ADS && u.includes(ADS_ID) && /\/pagead\/|googleadservices|doubleclick|\/ccm\/|\/rmkt\//.test(u)) {
      const url = new URL(u);
      const p = { ...Object.fromEntries(url.searchParams), ...Object.fromEntries(new URLSearchParams(request.postData() || '')) };
      s.ads.push({ kind: url.hostname + url.pathname.replace(ADS_ID, 'ID').replace(/\/+$/, ''), label: p.label || '', gcs: p.gcs || '', oid: p.oid || '' });
    }
  });
  return s;
}

const wait = ms => new Promise(r => setTimeout(r, ms));
const dl = page => page.evaluate(() => JSON.parse(JSON.stringify(window.dataLayer.filter(e => e && e.event && !/^gtm\./.test(e.event)))));
const cookieNames = async s => (await s.context.cookies()).map(c => c.name);
const matches = (obj, params) => Object.entries(params || {}).every(([k, v]) => String(obj[k]) === String(v));
const exists = async (page, selector) => !!selector && (await page.locator(selector).count()) > 0;

async function scrollAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 200) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await wait(800);
}

async function clickAll(s, group) {
  for (const b of BUTTONS) {
    try {
      const el = s.page.locator(b.seletor).first();
      await el.scrollIntoViewIfNeeded({ timeout: 5000 });
      await el.click({ timeout: 5000 });
      await wait(500);
    } catch (e) {
      check(group, `Botão ${b.seletor} encontrado e clicável`, false, e.message.split('\n')[0]);
    }
  }
}

// Para cada botão: evento no dataLayer, hit no GA4 com os parâmetros, conversão do Ads (se houver) e evento do Meta.
async function checkButtons(s, group, gcs, adsGcs, metaExpected) {
  const layer = await dl(s.page);
  for (const b of BUTTONS) {
    const ev = layer.find(e => e.event === b.evento && matches(e, b.params));
    const hit = s.ga4.find(h => h.en === b.evento && matches(h.p, b.params));
    const okHit = hit && hit.gcs === gcs;
    const parts = [`dataLayer ${ev ? 'ok' : 'FALHOU'}`, `GA4 ${hit ? hit.gcs : 'sem hit'}`];
    let ok = !!ev && !!okHit;
    const conv = CONV_BY_EVENT[b.evento];
    if (conv) {
      const hits = s.ads.filter(a => a.label === conv.rotulo);
      const okConv = hits.length > 0 && hits.every(a => a.gcs === adsGcs) && hits.some(a => ev && a.oid === ev.event_id);
      ok = ok && okConv;
      parts.push(`Ads "${conv.nome}" ${okConv ? 'ok' : 'FALHOU'} (${[...new Set(hits.map(a => a.gcs))].join('/') || 'sem pedido'})`);
    }
    const metaEv = META_BY_EVENT[b.evento];
    if (metaEv && metaExpected) {
      const eids = [...new Set(s.fb.filter(f => f.ev === metaEv && ev && f.eid === ev.event_id).map(f => f.eid))];
      ok = ok && eids.length === 1;
      parts.push(`Meta ${metaEv} ${eids.length === 1 ? 'ok' : 'FALHOU'}`);
    }
    check(group, `Botão ${b.seletor} → ${b.evento}`, ok, parts.join('; '));
  }
  if (HAS_ADS) {
    const stray = s.ads.filter(a => a.label && !LABELS.includes(a.label));
    check(group, 'Google Ads: nenhuma conversão com rótulo desconhecido', stray.length === 0, [...new Set(stray.map(a => a.label))]);
  }
  return layer;
}

(async () => {
  const { chromium } = loadPlaywright();
  const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
  const firstConvButton = BUTTONS.find(b => CONV_BY_EVENT[b.evento]) || BUTTONS[0];

  /* ===== A. Visitante que RECUSA tudo ===== */
  {
    const G = 'A. Recusa';
    const s = await newSession(browser, 'recusa');
    await s.page.goto(withQuery, { waitUntil: 'load' });
    await wait(3500);
    check(G, `GTM carregado (${GTM_ID})`, s.gtm > 0, `${s.gtm} pedido(s) gtm.js`);
    check(G, 'Banner de cookies aparece na 1.ª visita', await s.page.locator(C.banner).first().isVisible());
    const pv = s.ga4.filter(h => h.en === 'page_view');
    check(G, 'GA4: page_view enviada sem cookies (G100)', pv.length === 1 && pv[0].gcs === 'G100', pv.map(h => h.gcs));
    if (HAS_ADS) check(G, 'Google Ads: tag do Google com ping sem cookies', s.ads.some(a => !a.label && a.gcs === 'G100'), [...new Set(s.ads.map(a => a.kind))]);
    await s.page.locator(C.recusar).first().click();
    await wait(800);
    const cu = (await dl(s.page)).find(e => e.event === 'consent_update');
    check(G, 'consent_update = recusar_tudo', cu && cu.consent_analytics === 'denied' && cu.consent_marketing === 'denied', cu);
    await scrollAll(s.page);
    await clickAll(s, G);
    await wait(8000);
    await checkButtons(s, G, 'G100', 'G100', false);
    const cookies = await cookieNames(s);
    check(G, 'Sem cookies do GA4 (_ga) nem do Google Ads (_gcl)', !cookies.some(n => n.startsWith('_ga') || n.startsWith('_gcl')), cookies);
    check(G, 'Todos os hits do GA4 sem cookies (G100)', s.ga4.every(h => h.gcs === 'G100'), [...new Set(s.ga4.map(h => h.gcs))]);
    check(G, 'page_view não é reenviada ao recusar', s.ga4.filter(h => h.en === 'page_view').length === 1);
    if (T.link_atribuicao && await exists(s.page, T.link_atribuicao)) {
      const href = await s.page.locator(T.link_atribuicao).first().getAttribute('href');
      check(G, 'Link de atribuição leva as UTMs mas não o gclid', /utm_source=/.test(href) && !/gclid=/.test(href), href);
    }
    check(G, 'Meta: nenhum pedido sem consentimento (o pixel nem carrega)', s.meta === 0, `${s.meta} pedido(s)`);
    check(G, 'Sem erros de JavaScript', s.errors.length === 0, s.errors);
    fs.writeFileSync(path.join(OUT, 'A-recusa.json'), JSON.stringify({ ga4: s.ga4, ads: s.ads, dataLayer: await dl(s.page) }, null, 1));
    await s.context.close();
  }

  /* ===== B. Visitante que ACEITA tudo e fica na página ===== */
  let contextB;
  {
    const G = 'B. Aceita';
    const s = await newSession(browser, 'aceita');
    contextB = s.context;
    await s.page.goto(withQuery, { waitUntil: 'load' });
    await wait(3000);
    await s.page.locator(C.aceitar).first().click();
    await wait(2500);
    const cu = (await dl(s.page)).find(e => e.event === 'consent_update');
    check(G, 'consent_update = aceitar_tudo', cu && cu.consent_analytics === 'granted' && cu.consent_marketing === 'granted' && cu.analytics_newly_granted === 'true', cu);
    if (HAS_ADS) check(G, 'Google Ads: remarketing ativo depois de aceitar', s.ads.some(a => !a.label && /viewthroughconversion|rmkt|1p-user-list/.test(a.kind)), [...new Set(s.ads.filter(a => !a.label).map(a => a.kind))]);
    await scrollAll(s.page);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await wait(600);
    await scrollAll(s.page);
    if (T.mapa_iframe && await exists(s.page, T.mapa_iframe)) {
      const frame = s.page.locator(T.mapa_iframe).first();
      await frame.scrollIntoViewIfNeeded();
      await frame.click({ position: { x: 40, y: 40 } }).catch(() => {});
      await wait(600);
      if (!(await dl(s.page)).some(e => e.event === 'map_interaction')) {
        await s.page.evaluate(sel => document.querySelector(sel).focus(), T.mapa_iframe);
        await wait(600);
      }
    }
    await clickAll(s, G);
    const maxMark = Math.max(...ENGAGED_MARKS);
    if (!RAPIDO) {
      for (let i = 0; i < maxMark + 30; i += 1) {
        if ((await dl(s.page)).some(e => e.event === 'engaged_time' && e.engagement_seconds === maxMark)) break;
        await wait(1000);
      }
    }
    await wait(9000);
    // O GA4 agrupa os eventos e envia-os segundos depois: a page_view confere-se no fim.
    const pageViews = s.ga4.filter(h => h.en === 'page_view').map(h => h.gcs);
    check(G, 'GA4: page_view reenviada 1 vez com cookies depois de aceitar', JSON.stringify(pageViews) === '["G100","G111"]', pageViews);
    const layer = await checkButtons(s, G, 'G111', 'G111', true);
    const scrolls = s.ga4.filter(h => h.en === 'scroll_depth').map(h => Number(h.p.percent_scrolled)).sort((a, b) => a - b);
    check(G, 'Rolagem 25/50/75/90 %, uma vez cada', JSON.stringify(scrolls) === '[25,50,75,90]', scrolls);
    if (SECTIONS.length) {
      const seen = s.ga4.filter(h => h.en === 'section_view').map(h => h.p.section_name);
      const missing = SECTIONS.filter(n => !seen.includes(n));
      check(G, `As ${SECTIONS.length} secções vistas, sem repetições`, missing.length === 0 && seen.length === new Set(seen).size, missing.length ? `faltam: ${missing.join(', ')}` : seen.join(', '));
    } else skip(G, 'Secções vistas', 'teste.secoes vazio');
    if (!RAPIDO) {
      const engaged = s.ga4.filter(h => h.en === 'engaged_time').map(h => Number(h.p.engagement_seconds)).sort((a, b) => a - b);
      check(G, `Tempo na página ${ENGAGED_MARKS.join('/')} s`, JSON.stringify(engaged) === JSON.stringify([...ENGAGED_MARKS].sort((a, b) => a - b)), engaged);
    } else skip(G, 'Tempo na página', '--rapido');
    if (T.mapa_iframe) {
      const mapHit = s.ga4.find(h => h.en === 'map_interaction');
      check(G, 'Interação com o mapa (map_interaction)', !!mapHit && mapHit.gcs === 'G111', mapHit ? mapHit.p : 'sem hit');
    }
    const scrollHit = s.ga4.find(h => h.en === 'scroll_depth');
    check(G, 'Eventos sem restos de cliques anteriores (scroll_depth sem cta_name)', scrollHit && !scrollHit.p.cta_name, scrollHit && scrollHit.p);
    if (PAGE.lp_name) check(G, 'lp_name e lp_version em todos os eventos', s.ga4.every(h => h.p.lp_name === PAGE.lp_name && String(h.p.lp_version) === String(PAGE.lp_version)));
    const firstGranted = s.ga4.findIndex(h => h.gcs === 'G111');
    const after = firstGranted >= 0 ? s.ga4.slice(firstGranted) : [];
    check(G, 'Depois de aceitar, tudo com cookies (G111)', after.length > 0 && after.every(h => h.gcs === 'G111'), `${after.length} hits: ${[...new Set(after.map(h => h.gcs))].join('/')}`);
    const cookies = await cookieNames(s);
    const expected = ['_ga', `_ga_${GA4_ID.replace(/^G-/, '')}`].concat(HAS_ADS ? ['_gcl_au'] : []).concat(HAS_ADS && /gclid=/.test(QUERY) ? ['_gcl_aw'] : []);
    check(G, `Cookies criados: ${expected.join(', ')}`, expected.every(n => cookies.includes(n)), cookies.filter(n => /^_g/.test(n)));
    if (T.link_atribuicao && await exists(s.page, T.link_atribuicao)) {
      const href = await s.page.locator(T.link_atribuicao).first().getAttribute('href');
      check(G, 'Link de atribuição leva UTMs e gclid (com consentimento de marketing)', /utm_source=/.test(href) && (!/gclid=/.test(QUERY) || /gclid=/.test(href)), href);
    }
    if (HAS_META) {
      const ours = s.fb.filter(f => META_EVENTS.includes(f.ev));
      const uniq = ev => [...new Set(ours.filter(f => f.ev === ev).map(f => f.eid))];
      check(G, `Meta: eventos vão para o pixel ${PIXEL_ID}`, ours.length > 0 && ours.every(f => f.id === PIXEL_ID), [...new Set(ours.map(f => f.id))]);
      check(G, 'Meta: PageView 1 vez depois de aceitar', uniq('PageView').length === 1, `${uniq('PageView').length}`);
      check(G, 'Meta: ViewContent 1 vez', uniq('ViewContent').length === 1, `${uniq('ViewContent').length}`);
      for (const kind of ['Lead', 'Contact']) {
        const expectedCount = BUTTONS.filter(b => META_BY_EVENT[b.evento] === kind).length;
        check(G, `Meta: ${kind} só nos botões previstos (${expectedCount})`, uniq(kind).length === expectedCount, `${uniq(kind).length} evento(s)`);
      }
      if (ENGAGED_META && !RAPIDO) {
        const id = (layer.find(e => e.event === 'engaged_time' && e.engagement_seconds === ENGAGED_META) || {}).event_id;
        const ids = uniq(`Envolvimento${ENGAGED_META}s`);
        check(G, `Meta: Envolvimento${ENGAGED_META}s 1 evento (eventID = event_id)`, ids.length === 1 && ids[0] === id, ids);
      }
      const auto = [...new Set(s.fb.filter(f => !META_EVENTS.includes(f.ev)).map(f => f.ev))];
      console.log('      Eventos automáticos do próprio pixel (informativo):', auto.join(', ') || 'nenhum');
    } else skip(G, 'Meta', 'sem pixel_id');
    check(G, 'Sem erros de JavaScript', s.errors.length === 0, s.errors);
    fs.writeFileSync(path.join(OUT, 'B-aceita.json'), JSON.stringify({ ga4: s.ga4, ads: s.ads, meta: s.fb, dataLayer: layer }, null, 1));
    await s.page.close();
  }

  /* ===== C. Visita de retorno; depois retira o marketing a meio da visita ===== */
  {
    const G = 'C. Retorno';
    const s = await newSession(browser, 'retorno', contextB);
    await s.page.goto(BASE, { waitUntil: 'load' });
    await wait(4000);
    check(G, 'Banner não volta a aparecer', !(await s.page.locator(C.banner).first().isVisible()));
    const restored = (await dl(s.page)).find(e => e.event === 'consent_restored');
    check(G, 'consent_restored com estatística e marketing concedidos', restored && restored.consent_analytics === 'granted' && restored.consent_marketing === 'granted', restored);
    // Na visita de retorno o GA4 junta a page_view a outros eventos (envio até ~15 s, ou ao sair da página).
    for (let i = 0; i < 25 && !s.ga4.some(h => h.en === 'page_view'); i += 1) await wait(1000);
    await wait(1500);
    const pv = s.ga4.filter(h => h.en === 'page_view');
    check(G, 'GA4: page_view com cookies desde a entrada (G111), uma só vez', pv.length === 1 && pv[0].gcs === 'G111', pv.map(h => h.gcs));
    if (HAS_META) {
      // Conta por eventID: o pixel às vezes repete um pedido com o mesmo eID (o Meta desduplica).
      const uniqOnLoad = ev => new Set(s.fb.filter(f => f.ev === ev).map(f => f.eid)).size;
      check(G, 'Meta: PageView e ViewContent logo à entrada, 1 vez cada', uniqOnLoad('PageView') === 1 && uniqOnLoad('ViewContent') === 1,
        { PageView: uniqOnLoad('PageView'), ViewContent: uniqOnLoad('ViewContent') });
    }
    if (await exists(s.page, C.preferencias)) {
      await s.page.locator(C.preferencias).first().click();
      await wait(500);
      const boxes = await s.page.evaluate(([a, m]) => [document.querySelector(a)?.checked, document.querySelector(m)?.checked], [C.estatistica, C.marketing]);
      check(G, '"Preferências de cookies" reabre o banner com a escolha guardada', (await s.page.locator(C.banner).first().isVisible()) && boxes[0] && boxes[1], boxes);
      await s.page.locator(C.marketing).first().uncheck();
      await s.page.locator(C.guardar).first().click();
      await wait(1500);
      const before = s.fb.length;
      if (firstConvButton) await s.page.locator(firstConvButton.seletor).first().click().catch(() => {});
      await wait(6000);
      if (HAS_META) check(G, 'Retirar o marketing a meio da visita: o Meta para logo', s.fb.length === before, s.fb.slice(before).map(f => f.ev));
      const conv = firstConvButton && CONV_BY_EVENT[firstConvButton.evento];
      if (conv) {
        const hits = s.ads.filter(a => a.label === conv.rotulo);
        check(G, 'Depois de retirar o marketing: Ads só recebe sinal sem cookies de anúncios (G101)', hits.length > 0 && hits.every(a => a.gcs === 'G101'), [...new Set(hits.map(a => a.gcs))]);
      }
    } else skip(G, 'Preferências de cookies e retirada do consentimento', `seletor ${C.preferencias} não encontrado`);
    await s.context.close();
  }

  /* ===== D. Personalizar: só estatística ===== */
  {
    const G = 'D. Só estatística';
    const s = await newSession(browser, 'personalizado');
    await s.page.goto(withQuery, { waitUntil: 'load' });
    await wait(3000);
    if (await exists(s.page, C.personalizar)) {
      await s.page.locator(C.personalizar).first().click();
      await s.page.locator(C.estatistica).first().check();
      await s.page.locator(C.marketing).first().uncheck();
      await s.page.locator(C.guardar).first().click();
      await wait(2500);
      const cu = (await dl(s.page)).find(e => e.event === 'consent_update');
      check(G, 'consent_update = personalizado (estatística sim, marketing não)', cu && cu.consent_analytics === 'granted' && cu.consent_marketing === 'denied', cu);
      if (firstConvButton) await s.page.locator(firstConvButton.seletor).first().click().catch(() => {});
      await wait(8000);
      check(G, 'GA4: page_view reenviada só com estatística (G101)', s.ga4.filter(h => h.en === 'page_view' && h.gcs === 'G101').length === 1);
      if (firstConvButton) {
        const hit = s.ga4.find(h => h.en === firstConvButton.evento);
        check(G, `GA4 recebe ${firstConvButton.evento} com estatística (G101)`, hit && hit.gcs === 'G101', hit && hit.gcs);
        const conv = CONV_BY_EVENT[firstConvButton.evento];
        if (conv) {
          const hits = s.ads.filter(a => a.label === conv.rotulo);
          check(G, 'Google Ads recebe a conversão sem cookies de anúncios (G101)', hits.length > 0 && hits.every(a => a.gcs === 'G101'), [...new Set(hits.map(a => a.gcs))]);
        }
      }
      const cookies = await cookieNames(s);
      check(G, 'Cookie _ga sim; cookies do Google Ads (_gcl) não', cookies.includes('_ga') && !cookies.some(n => n.startsWith('_gcl')), cookies.filter(n => /^_g/.test(n)));
      check(G, 'Meta: nenhum pedido sem consentimento de marketing', s.meta === 0, `${s.meta} pedido(s)`);
    } else skip(G, 'Cenário "só estatística"', `seletor ${C.personalizar} não encontrado`);
    await s.context.close();
  }

  await browser.close();
  const failed = results.filter(r => !r.ok);
  fs.writeFileSync(path.join(OUT, 'relatorio.json'), JSON.stringify({ url: BASE, testedAt: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 1));
  console.log(`\n${results.length - failed.length}/${results.length} verificações aprovadas — relatório em ${OUT}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
