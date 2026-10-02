# Seguimiento avanzado de sitios web — una skill para Claude Code

[English](README.md)

Un proceso reutilizable y probado para que Claude Code (un agente de programación con IA) implemente el seguimiento de un sitio web antes de invertir en anuncios: **Google Tag Manager, GA4, conversiones de Google Ads y el píxel de Meta**, con banner de cookies (Consent Mode v2 de Google) y una prueba automática de la página publicada.

## Problema

Antes de lanzar anuncios, el sitio necesita medir cada contacto real (petición de presupuesto, teléfono, WhatsApp, correo, formulario) **una sola vez**, respetar el consentimiento de cookies (RGPD en Europa, LGPD en Brasil) y estar **probado en el sitio publicado**. Hacerlo a mano en cuatro herramientas es lento, y los errores son silenciosos: los datos salen mal y los algoritmos de anuncios aprenden de ellos.

## Qué construí

Una *skill* de Claude Code: una carpeta con instrucciones y scripts que el agente carga cuando le pido medir un sitio.

- `skill/SKILL.md`: flujo en 9 fases y los límites del agente (no crea cuentas, no acepta términos, no maneja contraseñas ni gasta dinero).
- `skill/assets/site/`: capa de seguimiento, banner de cookies (Aceptar / Rechazar / Personalizar con el mismo peso) y fragmento del `<head>` con Consent Mode v2.
- `skill/scripts/`: genera el código para el sitio y el contenedor de GTM a partir de un único archivo de configuración, y prueba la página publicada con Playwright simulando cuatro visitantes.
- `skill/references/`: guías por plataforma y herramienta, y 32 lecciones aprendidas en un proyecto real.

**Estado:** versión 1, validada en una landing page real de un cliente. La skill está escrita en portugués.

**Cómo se hizo.** La construí con Claude Code. Mi parte fue el proyecto: decidir qué medir y por qué, qué conversiones cuentan, el modelo de consentimiento y qué se podía publicar, operar las cuentas del cliente, revisar cada paso y exigir pruebas en el sitio real. La mayor parte del código la escribió la IA bajo mi dirección. Estoy empezando con Python y JavaScript y uso proyectos como este para estudiar el código que produce.

## Resultados y limitaciones

- En el proyecto real: 68/68 comprobaciones en la página publicada (63/63 con la prueba genérica de la skill); GA4 recibió los 14 tipos de evento en tiempo real; Google Ads detectó las etiquetas de conversión; dominio verificado en Meta.
- Validada en un sitio con HTML propio; el camino para WordPress/Elementor aún no se ha probado en un sitio real.
- Todavía sin seguimiento del lado del servidor (API de Conversiones de Meta).

Instrucciones de uso, decisiones y próximos pasos: ver el [README en inglés](README.md).

## Licencia

MIT — ver [LICENSE](LICENSE).
