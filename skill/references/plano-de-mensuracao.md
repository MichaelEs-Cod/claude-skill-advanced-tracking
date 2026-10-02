# Modelo — PLANO_DE_MENSURACAO.md (copiar para o projeto e preencher)

```markdown
# Plano de mensuração — <Cliente> / <Página>

Atualizado em <data>. Estado: <em implementação | no ar e testado (n/n)>.

## Contas e IDs (públicos — sem senhas nem tokens)
| Ferramenta | ID | Dono / acesso |
|---|---|---|
| Google Tag Manager | GTM-… (conta …, container …) | |
| Google Analytics 4 | G-… (propriedade …, fluxo …) | |
| Google Ads | conta …-…-…, AW-… | nível de acesso do nosso login |
| Pixel do Meta | … ("nome") | portfólio …, conta de anúncios … |

## Como funciona
Consentimento (Consent Mode v2, banner) → dataLayer → GTM → GA4 / Google Ads / Meta. <particularidades do projeto>

## Eventos
| Ação | Evento | Parâmetros | Google Ads | Meta |
|---|---|---|---|---|
| Clique em "…" | click_quote_request | cta_name, cta_location | <conversão> (principal) | Lead |
| … | | | | |

## Conversões do Google Ads
| Ação | Categoria | Principal? | Rótulo | Contagem / janela |
|---|---|---|---|---|

## Pixel do Meta
Domínios autorizados: … · eventos automáticos: desligados · domínio verificado: sim/não · API de Conversões: <decisão>

## Evidência de QA
- Teste automático <data>, GTM versão N: n/n (cenários A–D).
- GA4 Tempo real: <eventos vistos>. Google Ads: <estado das conversões>. Meta: <confirmação>.

## Decisões
- <data> — <decisão> — <porquê> — <quem aprovou>

## Pendências
- [ ] <o quê> — <quem> — <prazo>
```

## Dicas
- Escreva o plano **antes** de implementar e mostre ao utilizador: a lista de conversões principais é uma decisão de negócio.
- IDs públicos podem ficar no repositório do projeto; e-mails, senhas, tokens e dados de faturação não.
