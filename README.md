# Advanced website tracking — a Claude Code skill

[Español](README.es.md)

A reusable, tested process for Claude Code (an AI coding agent) to implement consent-aware tracking on client websites before running ads: **Google Tag Manager, GA4, Google Ads conversions and the Meta Pixel**, with a cookie banner (Google Consent Mode v2) and an automated end-to-end test of the published page.

## Problem

Before a client invests in ads, the website needs tracking that:

1. records each real contact (quote request, phone, WhatsApp, e-mail, form) **exactly once**;
2. respects cookie consent (GDPR in Europe, LGPD in Brazil; Google requires Consent Mode v2 for European traffic);
3. is **tested on the published site**, not only in a preview.

Doing this by hand across four tools is slow, and the mistakes are silent: nothing breaks on screen, the data is simply wrong and the ad algorithms learn from it.

## What I built

A Claude Code *skill*: a folder of instructions and scripts that the agent loads when I ask it to track a website.

| Part | What it does |
|---|---|
| `skill/SKILL.md` | 9-phase workflow — discovery, accounts, site layer, GTM, GA4, Google Ads, Meta, testing, hand-over — and the limits the agent must respect (it never creates accounts, accepts terms, handles passwords or spends money). |
| `skill/assets/site/` | Generic tracking layer (`rastreamento.js`), cookie banner (Accept / Reject / Customize with equal weight) and the `<head>` snippet with Consent Mode v2. |
| `skill/scripts/montar_snippets.py` | Builds the code to paste into the site (own HTML, WordPress/Elementor, other builders) from one config file. |
| `skill/scripts/gerar_container_gtm.py` | Generates the GTM container to import: GA4, Google Ads conversions and Meta Pixel, all consent-aware. |
| `skill/scripts/teste_rastreamento.cjs` | Playwright test of the published page, simulating four visitors: rejects cookies, accepts, returns later (and withdraws consent), accepts statistics only. |
| `skill/references/` | Guides per platform and tool, and 32 lessons learned in a real project. |

**Status:** version 1, validated on one real client landing page (own HTML). The skill is written in Portuguese, my working language with clients.

**How it was built — my contribution and the AI's.** I built this with Claude Code. My part was the project: deciding what had to be measured and why, choosing which conversions count, the consent model and what could be published, operating the client accounts, reviewing each step and requiring tests on the live site. Most of the code was written by the AI under my direction. I am at the beginning of learning Python and JavaScript, and I use projects like this one to study the code it produces.

## Demo

Real lines from the skill's end-to-end test against the client's published page (original output, in Portuguese; identifiers removed). A = visitor rejects cookies, B = accepts, C = returns and withdraws consent, D = accepts statistics only:

```text
OK   [A. Recusa] Sem cookies do GA4 (_ga) nem do Google Ads (_gcl)
OK   [A. Recusa] Meta: nenhum pedido sem consentimento (o pixel nem carrega)
OK   [B. Aceita] Botão [data-cta="solicitar_orcamento"] → click_quote_request — dataLayer ok; GA4 G111; Ads "Pedido de orçamento" ok (G111); Meta Lead ok
OK   [B. Aceita] Rolagem 25/50/75/90 %, uma vez cada
OK   [C. Retorno] Retirar o marketing a meio da visita: o Meta para logo
OK   [D. Só estatística] Cookie _ga sim; cookies do Google Ads (_gcl) não
OK   [D. Só estatística] Meta: nenhum pedido sem consentimento de marketing

63/63 verificações aprovadas
```

(`G100`/`G101`/`G111` is Google's consent state sent with each hit: nothing granted / statistics only / everything granted.)

## Technologies

- **Google Tag Manager, GA4, Google Ads, Meta Pixel, Consent Mode v2:** the tracking stack being configured.
- **JavaScript:** tracking layer and cookie banner in the browser.
- **Python:** generators for the site snippets and the GTM container.
- **Node.js + Playwright:** automated end-to-end test of the published site.
- **Claude Code:** the agent that follows the skill; Claude in Chrome was used to operate the tools' web interfaces.

## How to use

1. Copy the `skill/` folder to `~/.claude/skills/rastreamento-avancado/`.
2. In a project folder, ask Claude Code something like *"track this landing page with GTM, GA4, Google Ads and Meta"*. The skill guides it phase by phase and asks you for what only you can do (create accounts, accept terms, log in).
3. Or use the scripts directly:

```bash
cp skill/assets/rastreamento.config.example.json my-project/rastreamento.config.json   # fill in the IDs
python skill/scripts/montar_snippets.py my-project/rastreamento.config.json             # site code
python skill/scripts/gerar_container_gtm.py my-project/rastreamento.config.json         # GTM import file
npm i -D playwright-core                                                                # once, in the project
node skill/scripts/teste_rastreamento.cjs my-project/rastreamento.config.json           # test the live site
```

No passwords, tokens or credentials go into the config: only public IDs (GTM-…, G-…, AW-…, pixel ID).

## How to verify it works

- `python skill/scripts/gerar_container_gtm.py skill/assets/rastreamento.config.example.json --saida /tmp/container.json` produces a container with every tag **paused** and a warning not to import it (the example has no real IDs). Before writing, the generator runs consistency checks — for example, every referenced variable must exist and no consent-dependent tag may fire "once per page".
- On a real page, the test must reach 100%. In the project where the skill was born, the project's own test passed 68/68; the skill's generic scripts, run afterwards against the same published page with an equivalent config, passed 63/63 and produced a GTM container equivalent to the one validated by hand (same tags, triggers, consent settings and sequencing). The platforms confirmed it on their side: GA4 real-time received all 14 event types and Google Ads detected the conversion tags.

## Decisions and lessons learned

- **Consent first.** Everything is denied until the visitor chooses; the choice is re-applied before GTM loads. Visitors who refuse still send cookieless signals that Google uses to model conversions.
- **Test the published site.** The automated test caught a problem invisible to the eye: a GTM setting ("once per page" on a consent-dependent tag) that would have left the Meta Pixel blind to almost every first-time visitor. It is now documented and blocked by the generator.
- **One real contact, one conversion.** Each event carries a unique ID used as the Google Ads transaction ID and the Meta event ID, so the same click is never counted twice.
- **Never delete the client's previous setup.** Old conversions from another agency became "secondary" instead of being removed.

## Results and limitations

- Observed in the real project: 68/68 checks on the live page (63/63 with the skill's generic test); all 14 event types received by GA4; conversion tags detected by Google Ads; domain verified on Meta. Meta's Events Manager had not yet displayed the automated test traffic when this was written (the pixel requests were accepted with HTTP 200; confirmation with a real visit is part of the process).
- Validated on one site with its own HTML. The WordPress/Elementor path (automatic link classification and form-plugin listeners) follows the same contract but has not yet been validated on a real WordPress site.
- No server-side tracking (Meta Conversions API) yet.
- The web interfaces of Google and Meta change; the step-by-step guides reflect October 2026.

## Next steps

- Validate the WordPress/Elementor path on a real client site.
- Add an optional server-side (Conversions API) component.
- An English version of the skill.

## License

MIT — see [LICENSE](LICENSE).
