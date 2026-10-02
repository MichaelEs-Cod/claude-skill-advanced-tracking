# Google Ads — conversões (sem criar campanhas)

## Antes
- Conta do cliente (preferível) ou nova (criada pelo utilizador/cliente, com faturação dele). Fuso e moeda são definitivos.
- Ver o nível de acesso (Administrador → Acesso e segurança): **Padrão** cria conversões e campanhas, mas não liga o GA4 nem gere utilizadores.
- Listar o que existe: campanhas (estado) e conversões (Metas → Conversões → Todas as conversões; a tabela é paginada — "1 - 10 de N"). Nada se apaga.

## Criar as ações de conversão (interface 2026, "configuração simplificada")
1. Metas → Conversões → **+ Nova conversão**.
2. Fontes de dados: "Conversões em um site" → Editar fontes → URL publicado → Verificar → manter "Tag do Google" (não importar do GA4 — duplicaria e atrasa); desmarcar chamadas telefónicas se não forem usadas agora.
3. Escolher a **categoria** (cada uma vira uma meta): Solicitar cotação (orçamento), Enviar formulário de lead (formulário/pedido de informação), Contato (telefone, WhatsApp, e-mail), Reservar horário… "Ver tudo" mostra todas.
4. "Manualmente com código" → Concluído → **Editar configurações** de cada uma:
   - Nome claro e com prefixo do projeto ("LP Obras - Pedido de orçamento") para distinguir de conversões antigas;
   - Valor: **usar o mesmo valor** (1) enquanto não houver ticket médio/taxa de fecho; depois valores reais;
   - Contagem: **Uma** (leads: o mesmo clique no anúncio conta uma vez);
   - Janelas: 90 dias clique / 3 dias visualização engajada / 1 dia visualização para ciclos longos (B2B, serviços);
   - Atribuição baseada em dados.
   - Na criação, a opção "secundária" pode vir desativada: crie como principal e mude depois.
5. "+ Criar conversão" acrescenta outra na mesma categoria; "Adicionar outra categoria" para as restantes. Salvar e continuar.
6. Resumo → **Usar o Google Tag Manager** → copiar o **ID de conversão** (igual para todas) e o **rótulo** de cada uma para a configuração (`google_ads.conversion_id`, `conversoes[].rotulo`). Finalizar.
7. Regenerar o container, importar, publicar; correr o teste.

## Depois
- Mudar para **secundária**: abrir a conversão (clique real no nome — o link não tem href) → separador Configurações → "Otimização de ações" → "Ação secundária…" → Salvar. Atalho direto: `…/aw/conversions/detail/settings?ocid=<ocid>&ctId=<id>&__c=…&__u=…&authuser=N` (o ctId aparece no URL ao abrir a conversão).
- Conversões antigas de outras agências: secundárias (não apagar). As de campanhas inteligentes vêm bloqueadas — deixar.
- Estado: "Inativo"/"Conversões pendentes" logo após criar → "**Não há conversões recentes**" quando o Google deteta a tag (horas) → "Gravando conversões" com cliques de anúncios. Os pings do teste (com gclid falso) não contam como conversões.
- Configurações da conta: confirmar **Codificação/Marcação automática: Sim** e o fuso.
- Na campanha (fase seguinte): escolher as metas das conversões principais; não usar as secundárias para lances.
