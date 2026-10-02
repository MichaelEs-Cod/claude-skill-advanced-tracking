# Instalação por plataforma

O contrato é sempre o mesmo: **cabeçalho** (consentimento + GTM) no topo do `<head>` e **rastreamento.js + banner** na página. O que muda é onde se cola e como os botões ganham nome.

## 1. HTML próprio (LP no nosso código: Cloudflare Pages, Netlify, Vercel, alojamento estático)

1. `cabecalho.html` → primeiro bloco dentro de `<head>` (antes de outros scripts de medição).
2. `banner.html` → logo a seguir a `<body>`.
3. `banner.css` incluído (ou colado no CSS do site) e `<script src="assets/js/rastreamento.js" defer></script>` (versionar o ficheiro, ex.: `?v=2`, para não ficar em cache).
4. `preferencias.html` → dentro do rodapé (o banner esconde-o até haver GTM).
5. Botões: `data-cta="solicitar_orcamento"` (nomes em `CTA_EVENTS` ou em `ctas` na configuração). Secções: `data-track-section="beneficios"`. Links que levam o visitante para um formulário noutro domínio: `data-carry-utm` (ou `carry: true` no CTA) — as UTMs vão sempre, o gclid só com consentimento.
6. Formulário próprio: quando o servidor confirmar o envio, chamar `window.trkLead('orcamento')`.
7. Publicar num ramo de teste primeiro (ex.: `wrangler pages deploy … --branch=teste`), testar, depois produção. Cabeçalhos HTTP: `noindex` só no endereço provisório.

## 2. WordPress / Elementor

Preferir um plugin de "código no cabeçalho e rodapé" (WPCode — Insert Headers and Footers) em vez de editar o tema (o tema atualiza e apaga).
1. WPCode → Header: colar `cabecalho.html` (prioridade alta, carregar em todo o site ou só na LP).
2. WPCode → Footer: colar `rodape.html` (banner + estilos + rastreamento.js + botão flutuante "Preferências de cookies").
3. Se o site **já** usa um plugin de cookies com Consent Mode v2 (CookieYes, Complianz, Cookiebot…), escolha com o utilizador **uma** de duas — dois banners nunca:
   a. manter o plugin: cole só o carregamento do GTM (sem o nosso bloco de consentimento) e confirme que o plugin define o `default` antes do GTM e envia o `update` quando o visitante escolhe; o rastreamento.js funciona na mesma (sem `#consent` não mostra banner);
   b. desativar o plugin e usar o nosso cabeçalho + rodapé.
4. Botões: sem tocar no HTML, telefone/WhatsApp/e-mail/redes/mapa/links externos já são classificados pelo destino. Para nomes próprios (ex.: "Solicitar orçamento" que abre um formulário), no Elementor: Avançado → Atributos → `data-cta|solicitar_orcamento` (Elementor Pro); ou dar um ID ao botão e mapear no GTM.
5. Formulários (envio confirmado → `generate_lead`): Elementor Pro (`submit_success`), Contact Form 7 (`wpcf7mailsent`), WPForms (`wpformsAjaxSubmitSuccess`), Gravity Forms (`gform_confirmation_loaded`) já são escutados pelo rastreamento.js. Outros (HubSpot, RD Station, Forminator…): usar a página de obrigado (acionador de visualização de página no GTM) ou o evento do plugin.
6. Cache (WP Rocket, LiteSpeed): limpar depois de colar; excluir o rastreamento.js de "atrasar JavaScript" se o banner não aparecer.
7. Teste: `?trk_debug=1` na URL mostra os eventos na consola; depois o teste automático.

## 3. Outras plataformas (Wix, Webflow, Shopify, Hotmart, RD Station, construtores de LP)

1. Procure o campo de "código personalizado" do `<head>` e do fim do `<body>` (Wix: Configurações → Código personalizado; Webflow: Project settings → Custom code; Shopify: `theme.liquid` ou app de pixels; Hotmart/RD: campo de scripts da página).
2. Cabeçalho → head; rodapé → fim do body. Se a plataforma só aceitar o GTM pelo próprio campo "Google Tag Manager", use-o e cole o resto no código personalizado — mas o consentimento (`gtag('consent','default',…)`) tem de correr **antes** do GTM; se não for possível, use o banner/CMP nativo da plataforma com Consent Mode v2.
3. Se não houver forma de pôr JavaScript, o plano B é só o GTM com acionadores de clique (Click URL começa por `tel:`, contém `wa.me`…) e de página de obrigado — mais frágil; documente a limitação.
4. Shopify/lojas: eventos de e-commerce (`view_item`, `add_to_cart`, `begin_checkout`, `purchase` com valor) vêm da integração oficial da loja (Google & YouTube app, canal do Facebook) — não duplicar com o GTM; esta skill cobre a parte de leads/contactos.
