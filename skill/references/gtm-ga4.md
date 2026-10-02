# GTM e GA4

## GTM
**Criar** (o utilizador, por causa dos termos): conta com o nome do cliente, container Web com o domínio. Anote `GTM-XXXXXXX`, ID da conta e do container (estão no URL: `#/container/accounts/<conta>/containers/<container>`).

**Importar** o `container-gtm.json`:
1. Administrador → Importar contêiner → escolher o ficheiro (no Claude in Chrome: `find` do input de ficheiro + `file_upload`).
2. Espaço de trabalho: o atual (Default Workspace). Opção: **Substituir** (o espaço fica igual ao ficheiro) — ou Combinar → Substituir em conflito.
3. **Ler a pré-visualização**: "N Modificadas, N Adicionado, N Excluídas" e a lista. Num container nosso, o esperado é só o que mudou na configuração. Em Substituir, um item alterado aparece como "Excluído + Adicionado" — normal. Se aparecerem exclusões de coisas que não reconhece (tags de outra pessoa), pare e pergunte.
4. "Adicionar ao espaço de trabalho" → Enviar → **Publicar e criar versão** com nome ("vN - o que mudou") e descrição (porquê + o que foi testado). O GTM mostra "Versão N está ativa".

**Container gerado** (o que cada tag faz):
| Tag | Acionador | Porquê |
|---|---|---|
| GA4 - Google tag | All Pages | page_view + parâmetros comuns (lp_name, lp_version) |
| GA4 - Evento do dataLayer | eventos da lista `eventos_ga4` | um só evento genérico: nome = {{Event}}, parâmetros da configuração |
| GA4 - page_view depois do consentimento | `consent_update` com `analytics_newly_granted = true` | quem aceita depois de entrar não perde a visita/origem |
| Google Ads - Google tag | All Pages | remarketing (só com consentimento) + base das conversões |
| Google Ads - Vinculador de conversões | All Pages | guarda o gclid (com consentimento); url_passthrough sem ele |
| Google Ads - Conversão - X | `^evento$` | uma por conversão; transaction_id = event_id |
| Meta - Pixel base | All Pages + marketing concedido | carrega o pixel e manda PageView/ViewContent (só com ad_storage) |
| Meta - Lead / Contact / Envolvimento | eventos das listas | sequência: pixel base primeiro; eventID = event_id |
| Meta - Consentimento (grant/revoke) | qualquer `consent_update` | pixel já carregado obedece se o visitante mudar de ideias |

**Armadilhas**: tags com consentimento obrigatório (NEEDED) não podem ser "uma vez por página" (ver licoes-aprendidas.md — o gerador recusa); o modo de pré-visualização (Tag Assistant) no Chrome do utilizador não funciona se ele tiver bloqueador de anúncios; quem publica deixa a versão anterior intacta para reverter (Versões → Publicar versão anterior).

## GA4
**Criar** (o utilizador): conta + propriedade (fuso e moeda do cliente) + fluxo Web com o URL publicado. Anote `G-XXXXXXXXXX`, ID da conta, propriedade e fluxo.

**Configurar** (Administrador):
1. Retenção de dados → 14 meses.
2. Fluxo → Medição otimizada: manter page_view; **desligar** rolagem, cliques de saída, pesquisa no site e interações com formulários (o nosso rastreamento já mede melhor e não queremos duplicados); vídeo e downloads podem ficar.
3. Definições personalizadas → criar dimensões de âmbito **evento** para os parâmetros (`cta_name`, `cta_location`, `contact_type`, `social_network`, `section_name`, `lp_name`, `form_name`, `percent_scrolled`, `engagement_seconds`…). Nomes sem parênteses (o GA4 recusa alguns caracteres).
4. Eventos principais (conversões): a lista de eventos só aparece até 24 h depois dos primeiros dados; depois marque a estrela nos contactos reais (ex.: `click_quote_request`, `click_info_request`, `click_phone`, `click_whatsapp`, `generate_lead`). A interface atual não deixa criar um evento principal pelo nome antes de o evento chegar — fica como pendência com data.
5. Ligação ao Google Ads (Administrador → Ligações de produtos → Google Ads): exige ser **administrador** na conta Google Ads. Se o login tiver acesso Padrão, o dono tem de promover; documente como pendência.
6. Tempo real confirma o processamento: veja o cartão "Contagem de eventos por Nome do evento" (o texto é paginado — leia todas as páginas).

**Notas**: o GA4 descarta o parâmetro `event_id` (ele serve o Ads e o Meta); visitas de navegadores automáticos podem ser filtradas — o teste usa user-agent normal e `webdriver=false`; e-mails em URLs aparecem como `(redacted)`.
