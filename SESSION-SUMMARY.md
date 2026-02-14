# SensMundi — Session Summary (2026-02-14)

## Concepto
**SensMundi** (del latín "Sentire Mundum" — Sentir el mundo): Mapa emocional del mundo en tiempo real. Visualiza sentimientos y preocupaciones de cada región usando datos de GDELT.

**Motivación de Joaquín:** "Quiero que la gente seamos capaces de entender las preocupaciones y sentimientos de las personas de otra región, con una visual atractiva e información lo más objetiva posible."

**Feature clave — Interior vs Exterior:** Mostrar sentimiento interno (medios locales del país) vs externo (lo que dice el mundo sobre el país). Índice de disonancia = cuánto difiere percepción interna de externa.

## Stack Técnico
- **Frontend:** React + Vite + react-simple-maps + Recharts
- **Backend:** Express + better-sqlite3
- **Pipeline:** Python daemon (systemd service)
- **DB:** SQLite en `/home/ubuntu/projects/sensmundi/pipeline/sensmundi.db`
- **Puerto:** 3300 (no expuesto en Caddy todavía)
- **Servicios systemd:**
  - `sensmundi.service` — Frontend + API (puerto 3300)
  - `sensmundi-pipeline.service` — Daemon de recolección GDELT

## Arquitectura del Pipeline

### Daemon (`pipeline/daemon.py`)
- Recorre los **195 países** del mundo, uno por minuto
- Por cada país hace 4 requests a GDELT (con 15s entre cada una):
  1. Tono externo (timelinetone con nombre del país)
  2. Tono interno (timelinetone con `sourcecountry:FIPS`)
  3. Artículos externos (artlist)
  4. Artículos internos (artlist con sourcecountry)
- Ciclo completo: ~3h15m
- Guarda todo en SQLite
- Actualmente corre directo desde el VPS (la Pi se usó antes pero quedó baneada)

### Base de Datos (schema.sql)
```
countries  → code, name, name_es, region, fips, last_updated
sentiment  → country_code, timestamp, tone_int, tone_ext, dissonance, timelines (JSON)
articles   → country_code, url, title, title_es, title_en, source, published, language, source_type
analyses   → country_code, timestamp, summary_es/en, key_topics, tension_level, context, model
```

### GDELT — Lecciones Aprendidas
- **Rate limit estricto:** 1 request cada 5 segundos. Si te pasas, ban temporal (minutos a horas)
- **`artlist` NO devuelve tono** por artículo — solo título, url, source, fecha
- **`timelinetone`** es la API que da el tono agregado diario (3 meses de histórico)
- **`sourcecountry:XX`** usa códigos FIPS, no ISO. No todos los países tienen cobertura interna
- **`curl -sf`** descartaba respuestas válidas de GDELT silenciosamente → cambiado a `curl -s` con filtro de rate limit en el código
- El VPS (OVH) fue baneado; la Pi (Tailscale) también fue baneada por abuso acumulado
- VPS se desbaneó más rápido (~30min), Pi tardó más

## Frontend — Estado Actual

### Mapa (WorldMap.jsx)
- Usa `world-atlas@2/countries-110m.json` (topojson)
- ISO numérico → alpha-2 mapping en `isoMapping.js`
- **Bug resuelto:** topojson usa IDs con ceros a la izquierda ("032" para Argentina) — se normaliza con `parseInt`
- 3 modos: Dissonance / Internal / External
- Hover tooltip con etiquetas de texto (sin emojis)
- Países sin datos: gris oscuro + "Pending..."
- Territorios no reconocidos: "No data available"

### Country Detail (CountryDetail.jsx)
- Panel lateral al hacer click en un país
- **Header:** Bandera (imagen de flagcdn.com, 64px) | Nombre centrado | Dissonance valor grande a la derecha
- **Sentiment meters:** Dos cards (Internal / External) con:
  - Etiqueta: Very Negative / Negative / Neutral / Positive / Very Positive (5 niveles, consistente en todo)
  - Descripción contextual
  - Barra de gradiente con indicador de posición
  - Labels: Very Neg. / Negative / Neutral / Positive / Very Pos.
- **Timeline:** Gráfico de líneas (Recharts) con datos mergeados internal+external
  - Eje X: fechas formateadas "26 Nov '25"
  - Eje Y: etiquetas de texto (Very Neg. / Negative / Neutral / Positive / Very Pos.)
  - Línea de referencia en 0
  - Tooltip con labels de texto por línea
- **Tabs:** Timeline / Internal News / External News (artículos)
- Sirve todo desde SQLite (instantáneo, sin llamadas a GDELT en tiempo real)

### Decisiones de Diseño
- **Tono serio** — sin emojis de caritas, sin infantilizar los datos
- **Ocultar scores numéricos** al usuario — solo texto descriptivo
- **Banderas como imágenes** (flagcdn.com) en vez de emoji flags (Windows no los muestra)

## Bugs Resueltos en Esta Sesión
1. **Carga lenta (5+ min):** Fetch secuencial de 50 países → paralelizado en batches
2. **0 artículos:** Rate limit de GDELT por exceso de requests paralelas
3. **Tono siempre 0:** `artlist` no devuelve tono; cambiado a `timelinetone`
4. **"Cannot read name":** CountryDetail renderizaba antes de tener datos → early return con loading
5. **"Unknown" en países:** Topojson tiene territorios no mapeados → fallback a geo.properties.name
6. **Países no se colorean:** Faltaba check de `lastUpdated` para distinguir "sin datos" de "dato neutro"
7. **Austria sin datos:** ISO numérico con ceros a la izquierda ("040") no matcheaba "40" → parseInt
8. **Sentimiento interno faltante:** `curl -sf` descartaba respuestas válidas de GDELT → cambiado a `curl -s`
9. **Country detail tardaba mucho:** Intentaba fetch a GDELT en tiempo real → cambiado a servir desde cache/DB

## Pendiente (Plan Futuro)
1. **Cron de análisis (Sonnet):** Analizar artículos → resumen contextualizado, temas clave, nivel de tensión
2. **Cron de traducción (Haiku):** Traducir títulos/resúmenes a ES/EN
3. **Exponer en Caddy** con ruta pública `/sensmundi/`
4. **Subir a GitHub** (aeon-clawd/sensmundi)
5. **Mejorar cobertura interna:** Para países sin `sourcecountry`, usar queries alternativas
6. **UI pendiente:** Ajustes de diseño según feedback de Joaquín

## Estructura de Archivos
```
/home/ubuntu/projects/sensmundi/
├── server.js                    # API Express + better-sqlite3
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── App.jsx                  # Main: mapa + modos + colores + tooltips
│   ├── WorldMap.jsx             # Mapa interactivo
│   ├── CountryDetail.jsx        # Panel lateral detalle país
│   ├── isoMapping.js            # ISO numérico → alpha-2 (195 países)
│   ├── App.css                  # Estilos
│   └── main.jsx                 # Entry point
├── pipeline/
│   ├── daemon.py                # Pipeline 24/7 (1 país/min via GDELT)
│   ├── countries.py             # 195 países (ISO, FIPS, nombre, región)
│   ├── schema.sql               # Schema SQLite
│   └── sensmundi.db             # Base de datos
├── data/
│   ├── sentiment-cache.json     # Cache viejo (ya no se usa, API lee de DB)
│   ├── fetch-gdelt.sh           # Script v1 fetch (histórico)
│   └── fetch-gdelt-v2.sh        # Script v2 fetch (histórico)
├── dist/                        # Build producción
└── SESSION-SUMMARY.md           # Este archivo
```

## Servicios Activos
```bash
systemctl --user status sensmundi.service          # API + Frontend (puerto 3300)
systemctl --user status sensmundi-pipeline.service  # Daemon GDELT (1 país/min)
```

## Acceso
- Tailscale: http://100.105.100.57:3300
- No hay ruta en Caddy todavía
