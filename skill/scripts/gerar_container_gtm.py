"""Gera o container do Google Tag Manager (ficheiro para Administrador → Importar contêiner)
a partir do rastreamento.config.json do projeto.

Uso: python gerar_container_gtm.py rastreamento.config.json [--saida container-gtm.json]

O site escreve os eventos no dataLayer (assets/site/rastreamento.js); o container decide os destinos:
- GA4: Google tag (com lp_name/lp_version), um evento genérico (nome = {{Event}}) com os parâmetros
  configurados e a page_view reenviada quando a estatística é aceite depois de a página abrir;
- Google Ads: Google tag (AW-), vinculador de conversões e uma tag de conversão por evento configurado,
  com transaction_id = event_id;
- Meta: pixel base (PageView + ViewContent), Lead, Contact, envolvimento (personalizado) e uma tag que
  liga/desliga o pixel quando o consentimento muda a meio da visita.
Consentimento: as tags Google seguem o Consent Mode do site; as do Meta exigem ad_storage.
IDs vazios ou de exemplo geram as tags correspondentes PAUSADAS (o script avisa).
A ordem de criação é fixa e os itens novos entram no fim: acrescente sempre no FIM das listas da
configuração, para os IDs das tags já publicadas não mudarem.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ALL_PAGES = "2147479553"  # acionador interno "All Pages" do GTM
BASE_DLV = ["event_id", "cta_name", "cta_location", "link_url", "contact_type", "social_network",
            "section_name", "percent_scrolled", "engagement_seconds", "form_name", "form_source",
            "consent_marketing", "consent_analytics", "analytics_newly_granted", "lp_name", "lp_version"]
DEFAULT_GA4_EVENTS = ["click_quote_request", "click_info_request", "click_email", "click_phone", "click_whatsapp",
                      "click_social", "click_map", "click_address", "click_outbound", "click_cta", "generate_lead",
                      "scroll_depth", "section_view", "engaged_time", "map_interaction"]
DEFAULT_GA4_PARAMS = ["cta_name", "cta_location", "link_url", "contact_type", "social_network", "section_name",
                      "percent_scrolled", "engagement_seconds", "form_name", "form_source"]


def is_real(value, pattern, examples=()):
    return bool(value) and re.fullmatch(pattern, value) is not None and value not in examples


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("config", help="caminho do rastreamento.config.json do projeto")
    parser.add_argument("--saida", help="ficheiro de saída (por defeito: container-gtm.json ao lado da configuração)")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    out = Path(args.saida).resolve() if args.saida else config_path.parent / "container-gtm.json"
    avisos = []

    ga4_id = cfg.get("ga4_id", "")
    ga4_ok = is_real(ga4_id, r"G-[A-Z0-9]{6,}", ("G-XXXXXXXXXX",))
    if not ga4_ok:
        avisos.append("ga4_id vazio ou de exemplo: tags do GA4 PAUSADAS — NÃO importar este container até preencher o ID real.")
        ga4_id = ga4_id or "G-XXXXXXXXXX"
    ads = cfg.get("google_ads") or {}
    ads_id = str(ads.get("conversion_id") or "").replace("AW-", "")
    ads_ok = is_real(ads_id, r"\d{6,12}")
    conversoes = ads.get("conversoes") or []
    meta = cfg.get("meta") or {}
    pixel = str(meta.get("pixel_id") or "")
    pixel_ok = is_real(pixel, r"\d{10,20}")
    ga4_events = cfg.get("eventos_ga4") or DEFAULT_GA4_EVENTS
    ga4_params = cfg.get("parametros_ga4") or DEFAULT_GA4_PARAMS
    if not ads_ok:
        avisos.append("google_ads.conversion_id vazio: as tags do Google Ads foram geradas PAUSADAS.")
    if not pixel_ok:
        avisos.append("meta.pixel_id vazio: as tags do Meta foram geradas PAUSADAS.")

    stamp = str(int(datetime.now(timezone.utc).timestamp()))
    account, container = "0", "0"
    ids = {"var": 100, "trig": 200, "tag": 300}

    def tmpl(key, value):
        return {"type": "TEMPLATE", "key": key, "value": value}

    def boolean(key, value):
        return {"type": "BOOLEAN", "key": key, "value": "true" if value else "false"}

    def table(rows):
        return [{"type": "MAP", "map": [tmpl("parameter", k), tmpl("parameterValue", v)]} for k, v in rows]

    def base(key, kind, name):
        ids[kind] += 1
        return {"accountId": account, "containerId": container, key: str(ids[kind]), "name": name, "fingerprint": stamp}

    # ---------- Variáveis ----------
    variables = []

    def add_variable(name, kind, parameters):
        item = base("variableId", "var", name)
        item.update({"type": kind, "parameter": parameters, "formatValue": {}})
        variables.append(item)

    add_variable("CONST - GA4 ID de medição", "c", [tmpl("value", ga4_id)])
    add_variable("CONST - Meta Pixel ID", "c", [tmpl("value", pixel if pixel_ok else "000000000000000")])
    add_variable("CONST - Google Ads ID de conversão", "c", [tmpl("value", ads_id if ads_ok else "000000000")])
    for key in BASE_DLV + [p for p in ga4_params if p not in BASE_DLV]:
        add_variable(f"DLV - {key}", "v", [
            {"type": "INTEGER", "key": "dataLayerVersion", "value": "2"},
            boolean("setDefaultValue", False),
            tmpl("name", key),
        ])

    # ---------- Acionadores ----------
    triggers = []
    trigger_ids = {}

    def add_trigger(name, event_regex, filters=()):
        item = base("triggerId", "trig", name)
        item.update({
            "type": "CUSTOM_EVENT",
            "customEventFilter": [{"type": "MATCH_REGEX", "parameter": [tmpl("arg0", "{{_event}}"), tmpl("arg1", event_regex)]}],
        })
        if filters:
            item["filter"] = [{"type": op, "parameter": [tmpl("arg0", a0), tmpl("arg1", a1)]} for op, a0, a1 in filters]
        triggers.append(item)
        trigger_ids[name] = item["triggerId"]

    def regex_of(events):
        return "^(" + "|".join(re.escape(e) for e in events) + ")$"

    add_trigger("CE - Eventos GA4 (dataLayer)", regex_of(ga4_events))
    add_trigger("CE - Consentimento de marketing concedido", r"^consent_update$", [("EQUALS", "{{DLV - consent_marketing}}", "granted")])
    add_trigger("CE - Estatística aceite agora", r"^consent_update$", [("EQUALS", "{{DLV - analytics_newly_granted}}", "true")])
    add_trigger("CE - Consentimento atualizado", r"^consent_update$")
    meta_lead = meta.get("lead") or []
    meta_contact = meta.get("contact") or []
    engaged = meta.get("envolvimento_segundos")
    if meta_lead:
        add_trigger("CE - Meta Lead", regex_of(meta_lead))
    if meta_contact:
        add_trigger("CE - Meta Contact", regex_of(meta_contact))
    if engaged:
        add_trigger(f"CE - Envolvimento {engaged} s", r"^engaged_time$", [("EQUALS", "{{DLV - engagement_seconds}}", str(engaged))])
    for conv in conversoes:
        name = f"CE - {conv['evento']}"
        if name not in trigger_ids:
            add_trigger(name, rf"^{re.escape(conv['evento'])}$")

    # ---------- Tags ----------
    tags = []
    needs_marketing = {"consentStatus": "NEEDED", "consentType": {"type": "LIST", "list": [{"type": "TEMPLATE", "value": "ad_storage"}]}}
    meta_base = "Meta - Pixel base (PageView + ViewContent)"

    def add_tag(name, kind, parameters, trigger_list, firing="ONCE_PER_EVENT", consent=None, setup=None, paused=False):
        item = base("tagId", "tag", name)
        item.update({"type": kind, "parameter": parameters, "firingTriggerId": trigger_list,
                     "tagFiringOption": firing, "monitoringMetadata": {"type": "MAP"}})
        if consent:
            item["consentSettings"] = consent
        if setup:
            item["setupTag"] = [{"tagName": setup, "stopOnSetupFailure": True}]
        if paused:
            item["paused"] = True
        tags.append(item)

    def html(code):
        return [tmpl("html", code.strip()), boolean("supportDocumentWrite", False)]

    add_tag("GA4 - Google tag", "googtag", [
        tmpl("tagId", "{{CONST - GA4 ID de medição}}"),
        {"type": "LIST", "key": "eventSettingsTable", "list": table([("lp_name", "{{DLV - lp_name}}"), ("lp_version", "{{DLV - lp_version}}")])},
    ], [ALL_PAGES], paused=not ga4_ok)
    add_tag("GA4 - Evento do dataLayer (nome do evento = Event)", "gaawe", [
        boolean("sendEcommerceData", False),
        tmpl("eventName", "{{Event}}"),
        {"type": "LIST", "key": "eventSettingsTable", "list": table([(p, f"{{{{DLV - {p}}}}}") for p in ga4_params])},
        tmpl("measurementIdOverride", "{{CONST - GA4 ID de medição}}"),
    ], [trigger_ids["CE - Eventos GA4 (dataLayer)"]], paused=not ga4_ok)
    # A page_view inicial sai sem cookies; quando o visitante aceita a estatística depois, reenvia-se uma vez.
    add_tag("GA4 - page_view depois do consentimento", "gaawe", [
        boolean("sendEcommerceData", False),
        tmpl("eventName", "page_view"),
        tmpl("measurementIdOverride", "{{CONST - GA4 ID de medição}}"),
    ], [trigger_ids["CE - Estatística aceite agora"]], firing="ONCE_PER_LOAD", paused=not ga4_ok)

    # Criadas sempre (pausadas sem ID), para acrescentar o Google Ads mais tarde não mudar os IDs das outras tags.
    add_tag("Google Ads - Google tag", "googtag", [tmpl("tagId", "AW-{{CONST - Google Ads ID de conversão}}")], [ALL_PAGES], paused=not ads_ok)
    add_tag("Google Ads - Vinculador de conversões", "gclidw", [
        boolean("enableCrossDomain", False), boolean("enableUrlPassthrough", True), boolean("enableCookieOverrides", False),
    ], [ALL_PAGES], paused=not ads_ok)

    view_content = json.dumps(meta.get("nome_conteudo") or cfg.get("projeto") or "Página", ensure_ascii=False)
    # Sem "uma vez por página": o GTM gasta essa vez no All Pages bloqueado pelo consentimento e a tag não volta
    # a disparar quando o visitante aceita depois. O trkMetaReady impede iniciar o pixel duas vezes.
    add_tag(meta_base, "html", html(f"""
<script>
  !function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  if (!window.trkMetaReady) {{
    window.trkMetaReady = true;
    var trkEventId = function (prefix) {{ return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }};
    fbq('init', {{{{CONST - Meta Pixel ID}}}});
    fbq('track', 'PageView', {{}}, {{ eventID: trkEventId('pv') }});
    fbq('track', 'ViewContent', {{ content_name: {view_content}, content_category: 'landing_page' }}, {{ eventID: trkEventId('vc') }});
  }}
</script>
"""), [ALL_PAGES, trigger_ids["CE - Consentimento de marketing concedido"]], consent=needs_marketing, paused=not pixel_ok)
    if meta_lead:
        add_tag("Meta - Lead", "html", html("""
<script>
  if (window.fbq) fbq('track', 'Lead', { content_name: {{DLV - cta_name}} || {{DLV - form_name}}, content_category: {{DLV - contact_type}} || {{DLV - form_source}} }, { eventID: {{DLV - event_id}} });
</script>
"""), [trigger_ids["CE - Meta Lead"]], consent=needs_marketing, setup=meta_base, paused=not pixel_ok)
    if meta_contact:
        add_tag("Meta - Contact", "html", html("""
<script>
  if (window.fbq) fbq('track', 'Contact', { content_name: {{DLV - cta_name}}, content_category: {{DLV - contact_type}} }, { eventID: {{DLV - event_id}} });
</script>
"""), [trigger_ids["CE - Meta Contact"]], consent=needs_marketing, setup=meta_base, paused=not pixel_ok)
    if engaged:
        add_tag(f"Meta - Envolvimento {engaged} s (personalizado)", "html", html(f"""
<script>
  if (window.fbq) fbq('trackCustom', 'Envolvimento{engaged}s', {{ content_name: {view_content} }}, {{ eventID: {{{{DLV - event_id}}}} }});
</script>
"""), [trigger_ids[f"CE - Envolvimento {engaged} s"]], consent=needs_marketing, setup=meta_base, paused=not pixel_ok)
    # Liga/desliga o pixel já carregado quando o consentimento muda a meio da visita. Não carrega o pixel.
    add_tag("Meta - Consentimento (grant/revoke)", "html", html("""
<script>
  if (window.fbq) fbq('consent', {{DLV - consent_marketing}} === 'granted' ? 'grant' : 'revoke');
</script>
"""), [trigger_ids["CE - Consentimento atualizado"]], paused=not pixel_ok)

    for conv in conversoes:
        label = str(conv.get("rotulo") or "")
        if ads_ok and not label:
            avisos.append(f"conversão '{conv['nome']}' sem rótulo: tag gerada PAUSADA.")
        add_tag(f"Google Ads - Conversão - {conv['nome']}", "awct", [
            boolean("enableNewCustomerReporting", False), boolean("enableConversionLinker", True),
            boolean("enableProductReporting", False), tmpl("conversionCookiePrefix", "_gcl"),
            boolean("enableShippingData", False),
            tmpl("conversionId", "{{CONST - Google Ads ID de conversão}}"),
            tmpl("conversionLabel", label or "ROTULO_EM_FALTA"),
            tmpl("orderId", "{{DLV - event_id}}"),  # o mesmo clique nunca conta duas vezes
            boolean("rdp", False),
        ], [trigger_ids[f"CE - {conv['evento']}"]], paused=not (ads_ok and label))

    builtins = [{"accountId": account, "containerId": container, "type": t, "name": n} for t, n in [
        ("EVENT", "Event"), ("PAGE_URL", "Page URL"), ("PAGE_HOSTNAME", "Page Hostname"),
        ("PAGE_PATH", "Page Path"), ("REFERRER", "Referrer")]]

    export = {
        "exportFormatVersion": 2,
        "exportTime": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "containerVersion": {
            "path": f"accounts/{account}/containers/{container}/versions/0",
            "accountId": account, "containerId": container, "containerVersionId": "0",
            "container": {"path": f"accounts/{account}/containers/{container}", "accountId": account,
                          "containerId": container, "name": cfg.get("projeto") or "Site",
                          "publicId": cfg.get("gtm_id") or "GTM-XXXXXXX", "usageContext": ["WEB"],
                          "fingerprint": stamp, "tagManagerUrl": ""},
            "tag": tags, "trigger": triggers, "variable": variables, "builtInVariable": builtins,
            "fingerprint": stamp, "tagManagerUrl": "",
        },
    }

    # ---------- Verificações de consistência ----------
    names = {v["name"] for v in variables} | {b["name"] for b in builtins} | {"_event"}
    text = json.dumps(export, ensure_ascii=False)
    missing = sorted(set(re.findall(r"\{\{([^}]+)\}\}", text)) - names)
    if missing:
        sys.exit(f"variáveis referidas sem definição: {missing}")
    known = {t["triggerId"] for t in triggers} | {ALL_PAGES}
    for tag in tags:
        assert set(tag["firingTriggerId"]) <= known, tag["name"]
        for setup in tag.get("setupTag", []):
            assert any(t["name"] == setup["tagName"] for t in tags), setup
        assert tag.get("tagFiringOption") != "ONCE_PER_LOAD" or not tag.get("consentSettings"), \
            f"{tag['name']}: tag com consentimento obrigatório não pode ser 'uma vez por página'"

    out.write_text(json.dumps(export, ensure_ascii=False, indent=2), encoding="utf-8")
    paused = [t["name"] for t in tags if t.get("paused")]
    print(f"{len(tags)} tags, {len(triggers)} acionadores, {len(variables)} variáveis -> {out}")
    if paused:
        print("Pausadas:", ", ".join(paused))
    for aviso in avisos:
        print("AVISO:", aviso)


if __name__ == "__main__":
    main()
