# Testes (QA) — o rastreamento só está pronto quando passa no site publicado

## Teste automático
```bash
node <skill>/scripts/teste_rastreamento.cjs rastreamento.config.json            # completo (~4 min)
node <skill>/scripts/teste_rastreamento.cjs rastreamento.config.json --rapido   # sem os marcos de tempo (~1,5 min)
node <skill>/scripts/teste_rastreamento.cjs rastreamento.config.json --url https://teste.site.pages.dev/
```
Corra a partir da pasta do projeto. Precisa do Playwright: `npm i -D playwright-core` (usa o Chrome instalado; `CHROME_PATH` se não estiver no sítio padrão) ou `PLAYWRIGHT_PATH` a apontar para uma instalação existente. Sem Chrome instalado: `npm i -D playwright` + `npx playwright install chromium`. Relatórios JSON por cenário em `teste-rastreamento/`.

| Cenário | O que prova |
|---|---|
| A. Recusa | banner aparece; nenhum cookie `_ga`/`_gcl`; GA4 e Ads só com pings sem cookies (G100); Meta nem carrega; cada botão gera o seu evento; UTMs passam, gclid não |
| B. Aceita | page_view reenviada com cookies; cada botão → GA4 (G111, parâmetros certos), conversão do Ads (rótulo, transaction_id = event_id) e Lead/Contact no Meta, 1 vez cada; rolagem, secções, tempo, mapa; cookies `_ga`, `_gcl_au`, `_gcl_aw` |
| C. Retorno | sem banner; consentimento lembrado (page_view já G111, pixel logo à entrada); "Preferências de cookies" reabre; retirar o marketing desliga o pixel na hora |
| D. Só estatística | GA4 com cookies (G101), Ads sem cookies de anúncios, Meta nada |

Objetivo: **100%**. Corrija e repita até lá; registe o resultado (data, versão do GTM, n/n) no plano de mensuração.

## Confirmação do lado das plataformas
1. **GA4 → Tempo real**: cartão "Contagem de eventos por Nome do evento" com todos os eventos (paginar). Vale mais do que o teste para provar processamento.
2. **Google Ads → Todas as conversões**: estado passa de "Inativo" a "Não há conversões recentes" (tag detetada) em horas.
3. **Meta → Gerenciador de Eventos**: pode não mostrar o tráfego automático; confirmar com uma visita real.
4. **Formulários** (WordPress): enviar um pedido de teste real com `?trk_debug=1` e ver `generate_lead` na consola; avisar o cliente de que vai receber esse contacto.

## Falsos alarmes conhecidos (não são erros)
- **page_view atrasada**: o GA4 agrupa eventos; na visita de retorno a page_view pode sair até ~15 s depois (ou ao sair da página). Espere antes de concluir.
- **Pedido repetido do pixel** com o mesmo `eid`: o Meta desduplica pelo eventID; conte eventos por eventID, não por pedido.
- **`SubscribedButtonClick`** no Meta: evento automático do próprio pixel.
- **`www.google.es`/`.pt` nos pedidos do Ads**: domínios regionais do remarketing.
- **Nada no Chrome do utilizador**: bloqueador de anúncios bloqueia `gtm.js` e o pixel.

## Falhas reais já vistas (e a causa)
- Pixel não dispara quando o visitante aceita na 1.ª visita, mas dispara no retorno → tag base do Meta "uma vez por página" (ver licoes-aprendidas.md).
- Botão sem evento → seletor errado em `teste.botoes`, ou o clique foi absorvido por outro elemento (overlay, menu); ou o `data-cta` não está no elemento clicado.
- Conversão do Ads em falta → rótulo errado/pausado no container, ou acionador com nome de evento diferente do dataLayer.
