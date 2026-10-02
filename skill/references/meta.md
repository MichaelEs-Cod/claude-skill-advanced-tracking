# Pixel do Meta — configuração profissional

## Antes
- O utilizador entra no **portfólio empresarial do cliente** (Meta Business Suite → Configurações). Ver em Contas de anúncios se a conta está ativa — "desabilitada, forma de pagamento" bloqueia campanhas (o cliente resolve), não o pixel.
- Pixels antigos ("conjuntos de dados"): se o utilizador pedir "outro pixel"/"do zero", crie novo e deixe os antigos sem uso (não apagar).

## Criar e configurar
1. Configurações → Fontes de dados → **Conjuntos de dados e pixels** → Adicionar → nome ("Cliente - LP Nome").
   - A caixa "Conecte **todos** os conjuntos de dados… à API de Conversões com a Meta" vem **marcada** e afeta o portfólio inteiro, com termos próprios: **desmarque** e pergunte ao utilizador (recomendação: ligar depois, se o cliente aprovar — o Meta estima ~18% menos custo por resultado).
   - Se o clique na caixa não pegar, confirme o estado por JavaScript (`input[type=checkbox].checked`) antes de clicar em Criar.
2. A seguir pede as **contas de anúncios** a ligar → marcar a do cliente → Avançar.
3. Copiar a **Identificação** (é o ID do pixel; o `selected_asset_id` do URL é outra coisa).
4. **Atribuir pessoas** → o utilizador e o dono do cliente → Acesso total (não incluir utilizadores de sistema sem razão).
5. Gerenciador de Eventos → conjunto de dados → **Configurações**:
   - Permissões de tráfego → **Criar lista de permissão** → domínio da LP e domínio oficial (cada um inclui os subdomínios) — impede eventos falsos de outros sites;
   - "Eventos automáticos" (IA) e "Rastrear eventos automaticamente sem código": **desligados** (só contam os eventos definidos por nós);
   - Correspondência avançada automática: só faz sentido com formulários; sem formulário, deixar desligada;
   - Cookies internos: ligados (padrão).
6. Configurações da empresa → Segurança da marca → **Domínios** → Adicionar → "Criar um domínio" → domínio raiz (um `*.pages.dev`/`*.vercel.app` conta como raiz) → método **meta-tag** → colar `<meta name="facebook-domain-verification" content="…">` no `<head>` do HTML **estático** (não por GTM/JS) → publicar → Verificar domínio. No caso HS ficou "Verified" em minutos.
7. Preencher `meta.pixel_id` (+ `lead`, `contact`, `envolvimento_segundos`) na configuração, regenerar, importar e publicar o GTM; correr o teste.

## Eventos enviados
| Evento | Quando | Notas |
|---|---|---|
| PageView + ViewContent | ao aceitar o marketing (ou logo à entrada se já aceitou) | `content_name` = nome da página |
| Lead | eventos em `meta.lead` (orçamento, formulário…) | `content_name` = botão/formulário |
| Contact | eventos em `meta.contact` (telefone, WhatsApp, e-mail) | |
| EnvolvimentoNs (personalizado) | N segundos com a página visível | público de quem leu a página |
Todos com `eventID` = `event_id` (desduplicação e prontos para a API de Conversões). O pixel envia sozinho `SubscribedButtonClick` (inofensivo).

## Confirmar
- Teste automático: pedidos a `facebook.com/tr` com o ID certo, um por evento, nada sem consentimento, paragem ao retirar o consentimento.
- Gerenciador de Eventos → Visão geral: pode **não mostrar** tráfego do teste automático (filtro de robôs) e demora até ~30 min num pixel novo. Confirmação definitiva: visita real (telemóvel ou janela sem extensões) → aceitar → clicar um botão de Lead → ver o evento chegar.
- A aba "Ações" mostra recomendações (ex.: API de Conversões com 1 clique) — não são erros.
