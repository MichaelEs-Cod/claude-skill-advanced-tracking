# Entrega — resumo para o utilizador apresentar ao cliente

No fim, o utilizador costuma pedir "explica tudo o que foi feito como se fosses apresentar". Escreva na voz dele (primeira pessoa), em linguagem simples, cada bloco com **o que fiz → porque é bom para o negócio**. Só afirme o que foi feito e testado neste projeto; números concretos (n/n verificações, nº de eventos, conversões) dão credibilidade.

## Estrutura
1. **Como encontrei** — o problema de partida (rastreamento inexistente/quebrado, conversões erradas de outra agência, risco de otimizar às cegas).
2. **Uma central de controlo** — GTM: tudo mudável sem mexer no site, versões descritas e reversíveis.
3. **Privacidade do jeito certo** — banner com Aceitar/Recusar/Personalizar iguais; Consent Mode v2 (obrigatório para tráfego europeu desde 2024); nada antes do consentimento; retirar desliga na hora; quem recusa ainda gera sinal anónimo para modelação.
4. **Cada botão medido com contexto** — evento por botão e por secção; rolagem, secções vistas, tempo; saber o que vende e o que melhorar.
5. **Conversões que ensinam o algoritmo certo** — só contactos reais como principais; contagem 1 por clique; ID único por conversão; antigas fora dos lances; remarketing a recolher (com consentimento).
6. **Pixel do Meta blindado** — Lead/Contact; domínios autorizados (sem eventos falsos); eventos automáticos desligados; domínio verificado; pronto para a API de Conversões.
7. **A origem do lead não se perde** — UTMs/gclid levados para formulários noutros domínios.
8. **Testado de verdade** — teste automático com 4 tipos de visitante, n/n aprovadas; confirmado nas plataformas; o problema que o teste apanhou e foi corrigido (se houve).
9. **Tudo documentado** — IDs, decisões, versões, testes; container gerado por script.
10. **Fecho** — "a base está pronta para investir sabendo o que cada euro/real traz".
11. **Próximos passos** — o que depende do cliente (acessos, pagamento, domínio oficial, API de Conversões).

Ofereça transformar em slides (tipo de artefacto de apresentação) se o utilizador for mostrar ao cliente.
