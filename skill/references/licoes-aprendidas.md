# Lições aprendidas (projeto real, out/2026 — LP de serviços B2B, Portugal)

Cada item custou tempo uma vez. Leia antes de começar.

## GTM
1. **Tag com consentimento obrigatório + "uma vez por página" = tag morta na 1.ª visita.** O GTM gasta a "única vez" no All Pages, quando a tag é bloqueada por falta de consentimento; quando o visitante aceita, a tag já não volta a disparar (e as tags em sequência — Lead/Contact — falham com ela). Na visita de retorno funciona, o que esconde o problema. Solução: "uma vez por evento" + guarda no código (`window.trkMetaReady`). O gerador recusa a combinação.
2. **Importar em "Substituir"**: itens alterados aparecem como "Excluído + Adicionado". Normal. Exclusões inesperadas → parar.
3. **IDs estáveis**: o gerador numera pela ordem da configuração; acrescentar no fim das listas.
4. O utilizador pode republicar uma versão sem alterações (aparece "Não há alterações nessa versão"): verificar o diff da versão antes de assumir que algo mudou.

## GA4
5. A lista de eventos (para marcar eventos principais) leva até 24 h; não dá para criar o evento principal pelo nome antes.
6. GA4 agrupa eventos: page_view de retorno pode sair ~15 s depois. O teste espera.
7. Medição otimizada duplica cliques de saída/rolagem/formulários: desligar o que o nosso rastreamento já mede.
8. Nomes de dimensões personalizadas com parênteses são recusados.
9. Navegador automático: usar user-agent normal e `webdriver=false`, senão o Tempo real fica vazio.

## Google Ads
10. Acesso **Padrão** cria conversões, mas não liga o GA4 nem gere utilizadores — pedir ao dono para promover a Administrador.
11. Na criação simplificada, "secundária" vem desativada: criar principal e mudar depois.
12. Links da tabela de conversões não têm `href`: clique real (coordenadas/ref) para abrir; depois usar o URL direto das configurações (`ctId`).
13. Conversões antigas de agência anterior ("Configuração incorreta", nunca registaram): passar a secundárias, não apagar.
14. "Inativo" logo após criar é normal; passa a "Não há conversões recentes" quando a tag é detetada.
15. Contagem "Uma" + transaction_id = event_id: sem inflação nem duplicados.

## Meta
16. A criação do pixel traz **pré-marcada** a ligação de TODO o portfólio à API de Conversões (com termos): desmarcar e pedir OK.
17. A caixa às vezes não desmarca ao primeiro clique: confirmar `checked` por JavaScript antes de "Criar".
18. A "Identificação" é o ID do pixel; o `selected_asset_id` do URL não é.
19. Domínio `*.pages.dev` verifica-se como domínio raiz (meta-tag no HTML estático) — ficou verificado em minutos.
20. Conta de anúncios pode estar desativada por pagamento: não impede o pixel; impede campanhas (cliente resolve).
21. O Gerenciador de Eventos pode não mostrar tráfego automático; o teste prova pelos pedidos (`facebook.com/tr` → 200) e a confirmação final é uma visita real.
22. As páginas do Meta às vezes congelam (o script não responde): navegar de novo para o URL resolve.

## Site e consentimento
23. A meta-tag de verificação e o bloco de consentimento têm de estar no HTML, não injetados por JS/GTM.
24. Chaves repostas a cada push (`EVENT_KEYS`): sem isso o GTM herda `cta_name` antigo em eventos seguintes.
25. Quem aceita depois de entrar perde a page_view com cookies → tag "page_view depois do consentimento" (`analytics_newly_granted`).
26. Retirar o consentimento a meio da visita: o pixel já carregado continua a enviar eventos automáticos se não houver `fbq('consent','revoke')`.

## Navegador (Claude in Chrome) e ambiente
27. O Chrome do utilizador pode ter bloqueador de anúncios: `gtm.js` e o pixel não carregam lá; testar com Playwright ou janela sem extensões.
28. Várias contas Google: confirmar o `authuser=N` antes de criar/alterar.
29. Separador em segundo plano: cliques por coordenadas podem falhar; `element.click()` em JavaScript funciona nos botões Material; em links sem href use clique real.
30. Resultados de JavaScript com URLs com parâmetros são bloqueados: não devolver `location.href`.
31. A janela pode ser redimensionada pelo utilizador a meio (o viewport muda): refaça a captura antes de clicar por coordenadas e não mexa nos separadores dele.
32. O Wrangler pode estar com sessão noutra conta: `npx wrangler whoami` antes de publicar.
