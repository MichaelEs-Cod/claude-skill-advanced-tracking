# rastreamento.config.json — campo a campo

Um ficheiro por projeto (copiar de `assets/rastreamento.config.example.json`), guardado na pasta do projeto. Os três scripts leem-no:
`montar_snippets.py` (site), `gerar_container_gtm.py` (GTM) e `teste_rastreamento.cjs` (teste).

| Campo | Para quê | Notas |
|---|---|---|
| `projeto` | nome do container e do relatório | livre |
| `url_publicada` | endereço que o teste visita | pode ter caminho (`https://site.pt/lp/`) |
| `plataforma` | `html`, `wordpress` ou `outra` | só muda as instruções do montar_snippets |
| `idioma_banner` | `pt-BR` ou `pt-PT` | textos do banner |
| `politica_privacidade` | link no banner | obrigatório (RGPD/LGPD) |
| `cor_destaque` | cor do botão "Aceitar" | `#RRGGBB` da marca |
| `chave_consentimento` | chave no localStorage | mude a versão (`_v2`) para voltar a perguntar a todos (ex.: nova finalidade de cookies) |
| `pagina.lp_name` / `lp_version` | vão em todos os eventos do GA4 | distinguir LPs e versões nos relatórios |
| `gtm_id` | `GTM-XXXXXXX` | vazio = o cabeçalho não carrega o GTM nem mostra o banner |
| `ga4_id` | `G-XXXXXXXXXX` | obrigatório para gerar o container |
| `google_ads.conversion_id` | só dígitos (sem `AW-`) | vazio = tags do Ads pausadas |
| `google_ads.conversoes[]` | `{nome, evento, rotulo}` | uma por ação de conversão; `evento` = nome no dataLayer; sem rótulo = tag pausada |
| `meta.pixel_id` | ID do conjunto de dados | vazio = tags do Meta pausadas |
| `meta.lead[]` / `meta.contact[]` | eventos do dataLayer que viram Lead / Contact | o mesmo evento não deve estar nas duas listas |
| `meta.envolvimento_segundos` | evento personalizado `EnvolvimentoNs` | tem de ser um dos marcos do rastreamento.js (15/30/60/120) |
| `meta.nome_conteudo` | `content_name` do ViewContent | nome legível da página |
| `ctas` | botões com nome próprio além dos padrão | `{"nome": {"event": "click_cta"}}`; aceita `contact_type`, `social_network`, `carry` |
| `eventos_ga4[]` | eventos que o GTM envia ao GA4 | acrescentar no fim |
| `parametros_ga4[]` | parâmetros enviados em cada evento | acrescentar no fim; registar como dimensões personalizadas no GA4 |
| `teste.query` | UTMs + gclid de teste | o gclid falso não conta no Google Ads |
| `teste.consentimento` | seletores do banner | mudar só se o site usar outro banner (CMP); `null` num seletor = cenário saltado |
| `teste.botoes[]` | `{seletor, evento, params}` | um por botão a verificar; `params` = o que tem de chegar ao GA4 (ex.: `cta_name`, `cta_location`) |
| `teste.secoes[]` | nomes de `data-track-section` esperados | vazio = não testa secções |
| `teste.mapa_iframe` | seletor do iframe do mapa | vazio = não testa |
| `teste.link_atribuicao` | link que deve levar UTMs/gclid | ex.: botão para formulário noutro domínio |
| `teste.segundos_envolvimento` | marcos de tempo | iguais aos do rastreamento.js |

## Regra de ouro: acrescentar no fim

O gerador numera tags, acionadores e variáveis pela ordem da configuração. Acrescentar uma conversão **no fim** da lista mantém os IDs já publicados; inserir no meio "renomeia" itens na pré-visualização da importação do GTM (não parte nada, mas confunde o histórico). Reveja sempre a pré-visualização antes de confirmar.

## Exemplo de `teste.botoes`

```json
[
  { "seletor": "[data-cta=\"solicitar_orcamento\"]", "evento": "click_quote_request", "params": { "cta_name": "solicitar_orcamento", "cta_location": "pedido_orcamento" } },
  { "seletor": "a[href^=\"https://wa.me\"]", "evento": "click_whatsapp", "params": { "cta_name": "whatsapp" } },
  { "seletor": "footer a[href^=\"tel:\"]", "evento": "click_phone", "params": { "cta_name": "telefone", "cta_location": "footer" } }
]
```
Use seletores estáveis (atributos, `href`) e não classes geradas por construtores.
