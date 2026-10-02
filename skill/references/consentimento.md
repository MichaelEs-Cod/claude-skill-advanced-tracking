# Consentimento (Consent Mode v2, RGPD e LGPD)

## O que o cabeçalho faz
1. `gtag('consent','default', …denied…)` para `ad_storage`, `ad_user_data`, `ad_personalization` e `analytics_storage`, com `wait_for_update: 500`.
2. `ads_data_redaction` e `url_passthrough` ligados: sem consentimento de anúncios, os identificadores de clique não são guardados em cookies e a atribuição passa pelos links.
3. Se o visitante já escolheu (localStorage `trk_consent_v1`), reaplica a escolha **antes** do GTM e empurra `consent_restored` — na visita de retorno não há banner nem perda de dados.
4. Carrega o GTM.

## O banner (rastreamento.js)
- Aceitar, Recusar e Personalizar com o **mesmo destaque** (exigência das autoridades europeias de proteção de dados; boa prática também na LGPD).
- Personalizar: "Necessários" (sempre ativos), "Estatística" (GA4) e "Marketing" (Google Ads + Meta).
- "Preferências de cookies" no rodapé reabre o banner com a escolha guardada; retirar o marketing a meio da visita desliga o pixel na hora (tag "Meta - Consentimento").
- Cada escolha empurra `consent_update` com `consent_analytics`, `consent_marketing`, `consent_source` e `analytics_newly_granted`. O GTM usa este último para reenviar a page_view uma vez com cookies (senão a 1.ª visita de quem aceita perde a origem).

## O que cada escolha produz (é o que o teste confere)
| Escolha | GA4 | Google Ads | Meta |
|---|---|---|---|
| Recusar | pings sem cookies (gcs=G100) — servem para modelação | conversões como ping sem cookies (G100) | nada (o pixel nem carrega) |
| Só estatística | completo com `_ga` (G101) | sinal sem cookies de anúncios (G101), sem `_gcl` | nada |
| Aceitar | completo (G111) | completo com `_gcl_au`/`_gcl_aw` + remarketing | PageView, ViewContent, Lead, Contact… |

## Brasil (LGPD) vs Europa (RGPD)
- Europa: consentimento prévio é obrigatório; Consent Mode v2 é exigido pelo Google para tráfego do EEE desde março de 2024 (sem ele perde-se remarketing e parte da medição).
- Brasil: a LGPD pede base legal e transparência; o padrão desta skill (negado até escolher) é o mais seguro. Se o cliente/jurídico preferir modelo de opt-out (concedido por defeito com aviso), mude o `default` para `granted` **apenas** com essa decisão registada — e mantenha o banner com Recusar.
- Política de privacidade: o link no banner tem de existir e mencionar Google Analytics, Google Ads e Meta.

## Plataformas de consentimento (CMP) já instaladas
Se o site já tem CookieYes/Complianz/Cookiebot com Consent Mode v2, não acrescente outro banner. Confirme que o `default` corre antes do GTM e que o CMP envia `update`. Configure `teste.consentimento` com os seletores dele (botões aceitar/recusar) e `null` no que não existir.
