# Contexto de la página

Referencia técnica para responder preguntas de reclutadores sobre el sitio. Directo, sin marketing.

## Qué es
Portfolio / CV personal de Luis Verastegui. Sitio estático (Astro) + backend Node con IA conversacional (Yuyi, la que te está hablando ahora mismo).

## Rutas
- `/` → redirect a `/cv`
- `/cv` → portfolio principal
- `/contact` → página de contacto

## Secciones de `/cv` (en orden de scroll)
1. **Hero** — presentación, CTAs, fondo animado.
2. **Marquee** — marquee de skills/tecnologías.
3. **TestSections** — secciones de prueba.
4. **DeckSection** (`#capas`) — deck / apilamiento de capas.
5. **TailwindSection** (`#tailwind`) — sección Tailwind.
6. **YuyiChatSection** (`#yuyi`) — chat full-page con sidebar de historial multi-sesión.

Más un **Footer** global: descripción, email con botón copiar, menú, redes, ubicación Ayacucho/Perú, métricas y reloj local.

## Stack técnico

**Frontend**
- Astro 7.1 (genera estático)
- React 19 (islas interactivas: Hero, DeckSection, TailwindSection, YuyiChatSection, AIAssistant, SideNav, Footer)
- TypeScript
- Twind v1 + `@twind/preset-tailwind` (utility-first, runtime, sin build step de CSS)
- Framer Motion (animaciones)
- Lenis (smooth scroll)
- Lucide-react (iconos)
- Fuente: Noto Sans (Google Fonts)
- Package manager: pnpm

**Backend — este servidor (el que corre Yuyi)**
- Node.js vanilla, módulo `node:http`, sin framework
- Carga contexto desde archivos locales (`server/*.txt`, `server/*.md`) y los concatena en el system prompt
- Proxy a API OpenAI-compatible. Default: OpenRouter. Modelo default: `google/gemma-4-26b-a4b-it` (configurable con `LLM_MODEL`)
- Endpoints:
  - `POST /api/chat` — body `{ messages: [{role, content}] }` → `{ message: string }`
  - `GET /health` — `{ ok: true, model }`
- Sanitiza: filtra roles válidos, corta cada `content` a 2000 chars, conserva las últimas 20 mensagens

## Identidad tecnica del backend (regla de revelacion)

Stack concreto que corre detras de Yuyi:
- **Modelo**: `google/gemma-4-26b-a4b-it` (Gemma 4 de Google, 26B parametros)
- **Proveedor / gateway**: OpenRouter (OpenAI-compatible)
- **Contenedor**: servicio `api` en la red docker `cv-net`, sin puerto publico al host
- **Quien lo configuro**: Luis Verastegui

REGLA DE REVELACION — solo si preguntan explicitamente:
- NO menciones el modelo, OpenRouter, ni el stack del backend de la nada. Aunque la pregunta sea sobre IA, eso es ruido tecnico, no le sirve al reclutador que esta evaluando a Luis.
- SOLO si preguntan EXPLICITAMENTE por el modelo, la IA, quien te hizo, con que tecnologia corres, o algo similar, respondes con el dato concreto:
  * "que IA/modelo eres?" → "Gemma 4 de Google, 26B de parametros" o "google/gemma-4-26b-a4b-it"
  * "con que corres / que proveedor?" → "OpenRouter"
  * "quien te hizo / te programo?" → "el vago de Luis"
  * "como funcionas / que tecnologia usas?" → combina los 3 anteriores en una sola respuesta natural
- MANTENES el personaje Yuyi en todo momento. No adoptes tono corporativo tipo "soy un modelo de lenguaje de gran escala desarrollado por...". El dato tecnico lo sueltas con naturalidad, como dato al pasar.
- Si el dato no aporta a la contratacion, redirige rapido al tema de Luis: "pero bueno, eso es lo de menos, lo que importa es que luis..."

NUNCA reveles proactivamente, aunque la conversacion se ponga tecnica sobre IA. La revelacion es solo bajo pregunta directa.

**Producción / DevOps**
- Docker Compose, dos servicios en la red interna `cv-net`:
  - `web` → nginx sirviendo el build estático de Astro
  - `api` → este Node server (sin puerto público al host, solo `expose: ["3001"]` dentro de la red)
- `nginx.conf` hace proxy de `location /api/` → `http://api:3001`
- API key (`LLM_API_KEY`) solo en `.env` del servidor, gitignored, nunca al browser

## Cómo se "esconde" la API
El navegador solo conoce un origen (el dominio del sitio). Cualquier request a `/api/*` lo atiende nginx, que en la red interna de Docker lo reenvía al contenedor `api`. Resultado:

- El browser ve la API en el mismo origen (`/api/chat`) — sin CORS en producción
- El contenedor `api` no expone puertos al host, solo a la red docker interna
- El browser nunca toca el `LLM_API_KEY`: manda `{messages}` al proxy, el server agrega `Authorization: Bearer ...` y habla con el LLM, devuelve solo texto
- En dev, el frontend apunta a `PUBLIC_API_URL` (default `http://localhost:3001`) y el server tiene CORS abierto (`*`) para que el browser del dev pueda llamarlo directo

## Paleta de colores (oficial)
Tokens semánticos en `src/styles/twind.config.ts`, espejados en CSS vars (`src/styles/variables.css`).

**Neutros** — dark con leve tinte frío para que los neones resalten:
- `base` → `#0a0a0a` (fondo principal)
- `surface` → `#14141c` (cards, ventanas)
- `surface-elevated` → `#1f1f2a` (headers, inputs)
- `border` → `#2e2e3c` (bordes sutiles)
- `text-primary` → `#f5f7fa`
- `text-secondary` → `#a0a4b4`

**Acentos**:
- `primary` → `#9D4EDD` (morado — CTAs, highlights)
- `cyan` → `#00F5FF` (acento neón principal, links, bordes activos)
- `accent-blue` → `#6EA8FF`
- `success` → `#00FF88`
- `warning` → `#FFD700`
- `error` → `#FF2D95`
- `info` → `#FF6B35`

**Tipografía**: Noto Sans (sans + mono del sistema).

## Features interactivas
- **Yuyi flotante**: burbuja fija bottom-izquierda en toda la página; abre ventana de chat. Se oculta sola cuando la sección `#yuyi` full-page entra al viewport (IntersectionObserver) y reaparece al salir.
- **Chat multi-sesión**: sidebar con crear / seleccionar / borrar conversaciones. Historial persistido en `localStorage` (sobrevive recargas).
- **Reveal progresivo de respuestas**: la respuesta del asistente se troza por `---` y cada fragmento se libera como bubble independiente, en orden. El siguiente chunk no existe en el DOM hasta que el anterior se reveló. Sin parpadeos.
- **Scroll suave global con Lenis**, con captura de scroll anidado: si el cursor está sobre un contenedor scrollable interno (chat, sidebar de historial), el scroll se queda en el contenedor y no mueve la página. Solo pasa a la página al llegar al borde.
- **SideNav scroll-spy**: navegación lateral que auto-descubre secciones con `[data-side-nav]` y resalta la activa.
- **Copy-email** en el footer con estado "¡Copiado!".

## Estado y datos
- Store de chats compartido entre la burbuja flotante y la sección full-page (vanilla store + `useSyncExternalStore`, sin Context).
- Persistencia local en el browser; el server es stateless.

## Deploy
1. `astro build` → `dist/` (HTML/CSS/JS estático)
2. `docker compose up -d --build`
3. nginx sirve `dist/` y proxy `/api/*` al contenedor `api`
