---
name: rastreamento-avancado
description: |
  Implementa rastreamento avançado em sites e landing pages de clientes, de ponta a ponta e testado: Google Tag Manager, GA4, conversões do Google Ads, pixel do Meta, banner de cookies com Consent Mode v2 (RGPD/LGPD), eventos de cada botão, formulário, rolagem, secção e tempo na página, e teste automático no site publicado. Use SEMPRE que o utilizador pedir para "traquear"/rastrear um site ou LP, instalar ou configurar GTM, GA4, tag/conversão do Google Ads, pixel do Facebook/Meta, eventos, conversões, banner/consentimento de cookies, ou "deixar o site pronto para subir campanhas" — mesmo que só mencione uma destas peças. Serve para LP em HTML próprio, WordPress/Elementor e outras plataformas (Wix, Webflow…). Não é para criar ou otimizar campanhas (isso vem depois do rastreamento validado).
---

# Rastreamento avançado de site

Objetivo: cada contacto real (orçamento, WhatsApp, telefone, formulário…) medido **uma vez**, com origem, sem cookies antes do consentimento, e a ensinar o Google Ads e o Meta a procurar quem converte. Tudo verificado no site publicado antes de se dizer "pronto".

Este processo foi feito de ponta a ponta num projeto real (LP de serviços B2B em Portugal, out/2026), onde as peças desta skill foram validadas em produção (68/68 verificações). As armadilhas encontradas lá estão em `references/licoes-aprendidas.md` — leia-as antes de começar; poupam horas.

## Como o sistema funciona (explique isto ao utilizador quando ajudar)

```
site → dataLayer (eventos com nome, parâmetros e event_id) → GTM → GA4 / Google Ads / Meta
              ↑ consentimento aplicado no <head>, ANTES do GTM (Consent Mode v2)
```

- O site só **anuncia** o que aconteceu; o GTM decide para onde vai. Ajustes futuros fazem-se no GTM, com versões descritas e reversíveis.
- Um único ficheiro por projeto, `rastreamento.config.json`, alimenta os três scripts: snippets do site, container do GTM e teste. Copie `assets/rastreamento.config.example.json` para a pasta do projeto e preencha à medida que os IDs surgem (`references/configuracao.md` explica cada campo).

## Limites (o que fica com o utilizador)

- **Não** criar contas, aceitar termos, introduzir senhas, tokens ou dados de pagamento: o utilizador faz isso; prepare-lhe os passos exatos e continue depois.
- **Não** ativar campanhas nem gastar verba; **não** apagar conversões, tags ou pixels antigos (passe-os a secundários/pausados — é reversível).
- Peça confirmação explícita antes de ações com efeito amplo: opções que afetam o portfólio inteiro do cliente (ex.: "ligar todos os conjuntos de dados à API de Conversões com a Meta"), pedidos de acesso/ligação entre contas, deploy do site do cliente.
- Antes de publicar o site, confirme a conta/projeto de destino (ex.: `npx wrangler whoami`).
- Nada de segredos em ficheiros, relatórios ou capturas. IDs públicos (GTM-, G-, AW-, pixel) podem e devem ficar documentados.

## Fluxo

Siga as fases por ordem; cada uma termina com uma verificação. Se o pedido for só uma parte (ex.: "instala o pixel"), faça a fase correspondente, mas confirme as dependências (consentimento e GTM) primeiro.

### Fase 0 — Descoberta (antes de tocar em nada)

1. **Plataforma do site**: HTML próprio (temos o código), WordPress/Elementor, ou outra (Wix, Webflow, Shopify, Hotmart…). Define como se instala — `references/plataformas.md`.
2. **O que já existe**: abra o HTML publicado e procure `googletagmanager.com/gtm.js`, `gtag/js?id=`, `fbq('init'`, plugins de cookies. Contas antigas de outras agências: não apague; documente e decida com o utilizador se reaproveita ou cria de novo ("do zero" = contas/containers novos, conversões antigas passam a secundárias).
3. **Conversões**: o que é um contacto real para este cliente? (pedido de orçamento, formulário, WhatsApp, telefone, e-mail…). Defina 2–4 **principais** (as que vão ensinar os lances) e o resto secundário/observação.
4. **País e privacidade**: Europa (RGPD — Consent Mode v2 obrigatório para Google Ads/remarketing desde 2024) ou Brasil (LGPD). Padrão desta skill: tudo negado até o visitante escolher, nos dois casos — `references/consentimento.md`.
5. **Domínios**: onde a página está publicada hoje e onde vai ficar (afeta GA4, lista de domínios do Meta e verificação de domínio).
6. Escreva o plano de mensuração (`references/plano-de-mensuracao.md` tem o modelo) e mostre ao utilizador antes de implementar.

### Fase 1 — Contas e acessos

- **GTM** (container Web) e **GA4** (propriedade + fluxo Web): se forem novos, o utilizador cria (termos); depois configure você — `references/gtm-ga4.md`.
- **Google Ads**: confirme o nível de acesso do login usado (Administrador → Acesso e segurança). Com acesso **Padrão** dá para criar conversões, mas **não** para ligar o GA4 — só o dono da conta pode promover a Administrador.
- **Meta**: o utilizador precisa de entrar no portfólio empresarial do cliente (convite por e-mail). Verifique a conta de anúncios (pode estar desativada por pagamento — não é bloqueio para o pixel, é para as campanhas).
- No Chrome do utilizador, contas Google múltiplas aparecem como `authuser=N`; confirme qual é antes de criar coisas.

### Fase 2 — Camada no site (consentimento + eventos)

1. Preencha `gtm_id`, `idioma_banner`, `politica_privacidade`, `cor_destaque`, `pagina` e `ctas` na configuração.
2. `python <skill>/scripts/montar_snippets.py rastreamento.config.json` → gera `cabecalho.html`, `rodape.html` e a versão em ficheiros.
3. Instale conforme a plataforma (`references/plataformas.md`):
   - **HTML próprio**: cabeçalho no topo do `<head>`; banner logo a seguir a `<body>`; `banner.css` + `rastreamento.js` (defer); link "Preferências de cookies" no rodapé; `data-cta="nome"` em cada botão importante e `data-track-section="nome"` em cada secção.
   - **WordPress/Elementor/outros**: `cabecalho.html` no campo de código do `<head>` e `rodape.html` antes de `</body>` (WPCode ou equivalente). Telefone, WhatsApp, e-mail, redes e mapa são classificados sozinhos pelo destino do link; formulários Elementor, Contact Form 7, WPForms e Gravity Forms geram `generate_lead` quando o envio é confirmado.
4. Verifique localmente/no ramo de teste com `?trk_debug=1` (cada evento aparece na consola) antes de publicar.

Nomes de eventos (contrato entre site, GTM e testes — mantenha-os em todos os projetos): `click_quote_request`, `click_info_request`, `click_phone`, `click_whatsapp`, `click_email`, `click_social`, `click_map`, `click_address`, `click_outbound`, `click_cta`, `generate_lead`, `scroll_depth`, `section_view`, `engaged_time`, `map_interaction`, `consent_update`, `consent_restored`.

### Fase 3 — GTM

1. `python <skill>/scripts/gerar_container_gtm.py rastreamento.config.json` → `container-gtm.json` (tags sem ID saem pausadas).
2. GTM → Administrador → Importar contêiner → espaço de trabalho atual → **Substituir** (ou Combinar). **Leia a pré-visualização** (adicionados/modificados/excluídos) e confirme que só muda o esperado.
3. Enviar → publicar com nome e descrição claros ("v4 - Google Ads: conversões…"). Cada mudança futura = regenerar, importar, rever o diff, publicar nova versão.
Detalhes e armadilhas: `references/gtm-ga4.md`.

### Fase 4 — GA4

Retenção 14 meses; medição otimizada só com o que não duplica os nossos eventos; dimensões personalizadas para os parâmetros; eventos principais marcados quando aparecerem (até 24 h — a interface atual não deixa criar antes). Ver `references/gtm-ga4.md`.

### Fase 5 — Google Ads (conversões, sem campanhas)

Crie uma ação de conversão por contacto real (Site → manualmente com código), principais vs secundárias, contagem "Uma", valor igual (1) até haver ticket real; copie ID e rótulos ("Usar o Google Tag Manager") para a configuração; regenere e publique o GTM. Conversões antigas → secundárias. Marcação automática (gclid) ligada. Passo a passo da interface: `references/google-ads.md`.

### Fase 6 — Pixel do Meta

Criar conjunto de dados no portfólio do cliente, **desmarcar** a ligação de todo o portfólio à API de Conversões (pedir OK), ligar à conta de anúncios, atribuir pessoas, lista de domínios autorizados, eventos automáticos por IA desligados, verificar o domínio (meta-tag no `<head>`, publicada no HTML estático). Preencher `meta.pixel_id`, regenerar e publicar o GTM. Ver `references/meta.md`.

### Fase 7 — Teste no site publicado

`node <skill>/scripts/teste_rastreamento.cjs rastreamento.config.json` (configure `teste.botoes`, `teste.secoes`…). São 4 visitantes simulados; o objetivo é **100%**. Depois confirme do lado das plataformas: GA4 Tempo real (nomes dos eventos), Google Ads (conversões passam a "Não há conversões recentes" = tag detetada) e Meta (Gerenciador de Eventos; tráfego automático pode não aparecer — confirme com uma visita real). Como ler falhas e falsos alarmes: `references/qa.md`.

### Fase 8 — Documentar e entregar

- `PLANO_DE_MENSURACAO.md` no projeto com IDs, eventos, conversões, decisões, evidência de testes e pendências (modelo em `references/plano-de-mensuracao.md`). Se o projeto tiver pasta de gestão (STATUS/DECISOES/MEMORY), atualize-a também.
- Guarde o `rastreamento.config.json`, o `container-gtm.json` e os relatórios de teste no projeto.
- Feche com o resumo para o utilizador apresentar ao cliente: `references/entrega-cliente.md`.

## Automação no navegador (Claude in Chrome)

As interfaces do GTM, GA4, Google Ads e Meta são operadas no Chrome do utilizador. Dicas que funcionaram (detalhes em `references/licoes-aprendidas.md`):
- Botões Angular/Material (Google): `element.click()` via JavaScript funciona mesmo com o separador em segundo plano; para links sem `href` e alguns menus, use clique real por coordenadas/ref depois de uma captura.
- Use `get_page_text`/JavaScript para ler; o texto devolvido é cortado (~1000 caracteres): leia por fatias.
- Não devolva URLs com parâmetros no resultado do JavaScript (o retorno é bloqueado); navegue com `location.href = a.href` se precisar.
- O utilizador pode estar a usar a mesma janela: se ela mudar de tamanho ou aparecerem separadores novos, não mexa nos separadores dele.
- O Chrome do utilizador pode ter bloqueador de anúncios (bloqueia `gtm.js` e o pixel): os testes manuais dele aí não mostram nada — use o teste automático ou peça janela sem extensões.
