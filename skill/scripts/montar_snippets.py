"""Monta os snippets do site a partir do rastreamento.config.json do projeto.

Uso: python montar_snippets.py rastreamento.config.json [--saida pasta]

Gera na pasta de saída (por defeito: rastreamento-snippets/ ao lado da configuração):
- cabecalho.html     colar no <head>, o mais acima possível (Consent Mode v2 + GTM). Serve para qualquer plataforma.
- rodape.html        colar antes de </body> em plataformas sem acesso aos ficheiros (WordPress via WPCode,
                     Elementor, Wix, Webflow…): banner + estilos + rastreamento.js embutidos + botão flutuante
                     "Preferências de cookies".
- banner.html, banner.css, rastreamento.js, preferencias.html
                     versão em ficheiros separados para sites com código próprio (LP em HTML).
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SITE = SKILL / "assets" / "site"

TEXTOS = {
    "pt-PT": {
        "T_TITLE": "Cookies",
        "T_TEXT": "Utilizamos cookies para medir as visitas e melhorar os nossos anúncios. Pode aceitar, recusar ou escolher o que permite. Saiba mais na",
        "T_PRIVACY": "Política de Privacidade",
        "T_NEEDED": "<strong>Necessários</strong> — guardam a sua escolha de cookies. Sempre ativos.",
        "T_STATS": "<strong>Estatística</strong> — Google Analytics, para perceber como a página é usada.",
        "T_MKT": "<strong>Marketing</strong> — Meta e Google Ads, para medir e melhorar anúncios.",
        "T_REJECT": "Recusar",
        "T_CUSTOMIZE": "Personalizar",
        "T_SAVE": "Guardar escolhas",
        "T_ACCEPT": "Aceitar",
        "T_PREFS": "Preferências de cookies",
    },
    "pt-BR": {
        "T_TITLE": "Cookies",
        "T_TEXT": "Usamos cookies para medir as visitas e melhorar nossos anúncios. Você pode aceitar, recusar ou escolher o que permite. Saiba mais na",
        "T_PRIVACY": "Política de Privacidade",
        "T_NEEDED": "<strong>Necessários</strong> — guardam sua escolha de cookies. Sempre ativos.",
        "T_STATS": "<strong>Estatística</strong> — Google Analytics, para entender como a página é usada.",
        "T_MKT": "<strong>Marketing</strong> — Meta e Google Ads, para medir e melhorar anúncios.",
        "T_REJECT": "Recusar",
        "T_CUSTOMIZE": "Personalizar",
        "T_SAVE": "Salvar escolhas",
        "T_ACCEPT": "Aceitar",
        "T_PREFS": "Preferências de cookies",
    },
}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("config", help="caminho do rastreamento.config.json do projeto")
    parser.add_argument("--saida", help="pasta de saída (por defeito: rastreamento-snippets/ ao lado da configuração)")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    out = Path(args.saida).resolve() if args.saida else config_path.parent / "rastreamento-snippets"
    out.mkdir(parents=True, exist_ok=True)
    avisos = []

    gtm_id = cfg.get("gtm_id", "")
    if not re.fullmatch(r"GTM-[A-Z0-9]{5,}", gtm_id or "") or gtm_id == "GTM-XXXXXXX":
        avisos.append("gtm_id vazio ou de exemplo: o cabeçalho NÃO carrega o GTM nem mostra o banner até gerar de novo com o ID real.")
        gtm_id = ""
    idioma = cfg.get("idioma_banner", "pt-BR")
    if idioma not in TEXTOS:
        sys.exit(f"idioma_banner inválido: {idioma} (use pt-BR ou pt-PT)")
    textos = TEXTOS[idioma]
    privacidade = cfg.get("politica_privacidade") or ""
    if not privacidade:
        avisos.append("politica_privacidade vazia: o banner precisa de um link válido para a política de privacidade.")
    cor = cfg.get("cor_destaque") or "#1f4e79"
    if not re.fullmatch(r"#[0-9a-fA-F]{3,8}", cor):
        sys.exit(f"cor_destaque inválida: {cor} (use #RRGGBB)")
    pagina = cfg.get("pagina", {})

    trk_config = {
        "gtm_id": gtm_id,
        "consent_key": cfg.get("chave_consentimento") or "trk_consent_v1",
        "lp_name": pagina.get("lp_name"),
        "lp_version": pagina.get("lp_version"),
        "ctas": cfg.get("ctas", {}),
    }
    # "</" fecharia o <script> se aparecesse num nome de botão.
    trk_json = json.dumps(trk_config, ensure_ascii=False).replace("</", "<\\/")

    cabecalho = (SITE / "cabecalho.html").read_text(encoding="utf-8").replace("%%TRK_CONFIG%%", trk_json)
    banner = (SITE / "banner.html").read_text(encoding="utf-8").replace("%%PRIVACY_URL%%", html.escape(privacidade, quote=True))
    for chave, texto in textos.items():
        banner = banner.replace(f"%%{chave}%%", texto)
    css = (SITE / "banner.css").read_text(encoding="utf-8").replace("%%COR_DESTAQUE%%", cor)
    js = (SITE / "rastreamento.js").read_text(encoding="utf-8")
    preferencias = f'<span class="consent-open" data-consent-open hidden><button type="button" class="consent-open__btn">{textos["T_PREFS"]}</button></span>'
    flutuante = f'<div class="consent-open consent-open--flutuante" data-consent-open hidden><button type="button" class="consent-open__btn">{textos["T_PREFS"]}</button></div>'
    rodape = (
        "<!-- Rastreamento: banner de cookies + eventos (gerado pelo montar_snippets.py) -->\n"
        f"{banner}{flutuante}\n<style>\n{css}</style>\n<script>\n{js}</script>\n"
    )
    restos = re.findall(r"%%[A-Z_]+%%", cabecalho + banner + css)
    if restos:
        sys.exit(f"marcadores por preencher: {sorted(set(restos))}")

    ficheiros = {
        "cabecalho.html": cabecalho,
        "rodape.html": rodape,
        "banner.html": banner,
        "banner.css": css,
        "rastreamento.js": js,
        "preferencias.html": preferencias + "\n",
    }
    for nome, conteudo in ficheiros.items():
        (out / nome).write_text(conteudo, encoding="utf-8")

    print(f"Snippets em {out}")
    plataforma = cfg.get("plataforma", "html")
    if plataforma == "html":
        print("Site com código próprio:\n"
              "  1. cabecalho.html no topo do <head>;\n"
              "  2. banner.html logo a seguir a <body>; banner.css e <script src=\"rastreamento.js\" defer> no site;\n"
              "  3. preferencias.html dentro do rodapé (link 'Preferências de cookies');\n"
              "  4. data-cta nos botões e data-track-section nas secções (ver references/plataformas.md).")
    else:
        print("Plataforma sem acesso aos ficheiros (WordPress/Elementor/construtores):\n"
              "  1. cabecalho.html no campo de código do <head> (WPCode: 'Header', prioridade alta);\n"
              "  2. rodape.html no campo de código antes de </body> (WPCode: 'Footer').\n"
              "  Os links de telefone, WhatsApp, e-mail, redes e mapa são rastreados sozinhos; formulários Elementor,\n"
              "  Contact Form 7, WPForms e Gravity Forms geram generate_lead quando o envio é confirmado.")
    for aviso in avisos:
        print("AVISO:", aviso)


if __name__ == "__main__":
    main()
