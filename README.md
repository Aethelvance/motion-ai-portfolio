# ingenierodeia-landing-page

Personal portfolio / CV site for Luis Verastegui. Static Astro frontend + Node API powering the Yuyi AI assistant.

## Stack

- **Frontend**: Astro 7.1, React 19 (islands), TypeScript, Twind v1, Framer Motion, Lenis, lucide-react.
- **Backend (api/)**: Node 22, `node:http`, OpenAI-compatible proxy to OpenRouter. Default model: `google/gemma-4-26b-a4b-it`.
- **Deploy**: Docker Compose (nginx static + api container on internal `cv-net` network).

## Project Structure

```text
/
├── api/                            # Yuyi AI backend
│   ├── app.mjs                     # entry point (Node http server)
│   └── prompts/                    # system prompt sections, concatenated in numeric order
│       ├── 01-persona.md           # Yuyi's persona
│       ├── 02-mission.md           # persuasion + delivery rules
│       ├── 03-examples.md          # few-shot examples
│       ├── 04-knowledge.md         # Luis's knowledge + project catalog
│       └── 05-context.md           # site technical context
├── public/                         # static assets served as-is
│   ├── assets/                     # favicon, avatar
│   ├── certs/                      # CV and Coursera certificates (kebab-case)
│   └── projects/                   # project screenshots + catalog.md
├── src/                            # Astro source
│   ├── components/
│   │   ├── atoms/                  # flat file pair per component (no folder)
│   │   ├── molecules/              # flat file pair per component (no folder)
│   │   ├── organisms/              # only multi-file components in folder
│   │   │   ├── ChatBubble/         # floating chat window (renamed from AIAssistant)
│   │   │   ├── Footer/
│   │   │   ├── HamburgerMenu/
│   │   │   └── Hero/
│   │   ├── sections/               # page sections
│   │   │   ├── Contact/
│   │   │   ├── Deck/
│   │   │   ├── Tailwind/
│   │   │   ├── TextReveal/
│   │   │   └── YuyiFullChat/       # full-viewport chat page
│   │   └── providers/              # Astro providers only
│   │       ├── SmoothScroll.astro
│   │       └── TwindInit.astro
│   ├── stores/                     # application state
│   │   └── yuyi.ts                 # Yuyi chat store (moved from components/providers/)
│   ├── hooks/                      # React hooks
│   ├── lib/                        # utilities
│   ├── constants/                  # shared constants
│   ├── layouts/                    # Astro layouts
│   ├── pages/                      # routes
│   ├── styles/                     # global CSS and Twind config
│   └── middleware.ts
├── Dockerfile.api                  # api container build
├── Dockerfile.web                  # web (nginx) container build
├── docker-compose.yml              # 2-service compose
├── nginx.conf                      # reverse proxy /api/* -> api:3001
├── astro.config.mjs
├── tsconfig.json
├── package.json
├── plan.md                         # restructuring plan (historical)
└── README.md
```

## Commands

| Command                | Action                                              |
| :--------------------- | :-------------------------------------------------- |
| `pnpm install`         | Install dependencies                                |
| `pnpm dev`             | Start Astro dev server in background (port 4321)    |
| `pnpm build`           | Build production site to `./dist/`                  |
| `pnpm preview`         | Preview the production build locally                |
| `pnpm server`          | Start the Yuyi API server (port 3001)               |
| `pnpm dev:server`      | Start the API server with `--watch`                 |
| `pnpm dev stop`        | Stop the background Astro dev server                |
| `pnpm dev status`      | Check Astro dev server status                       |
| `pnpm dev logs`        | Tail Astro dev server logs                          |

## Environment

Copy `.env.example` to `.env` and fill in:

- `LLM_API_KEY` (required) — OpenRouter key.
- `LLM_BASE_URL` (optional) — defaults to `https://openrouter.ai/api/v1`.
- `LLM_MODEL` (optional) — defaults to `google/gemma-4-26b-a4b-it`.
- `SITE_URL` (optional) — public URL used to resolve relative paths in prompts.
- `PORT` (optional) — api server port, defaults to 3001.

Frontend uses `PUBLIC_API_URL` to reach the API in development (default `http://localhost:3001`).

## Architecture Notes

- The browser only knows the web origin. nginx proxies `/api/*` to the api container on the internal docker network. The api never binds a public port.
- The `api` container has no public port; only the `web` container (nginx) is exposed on 80/443.
- The browser never sees the LLM API key. It posts `{messages}` to `/api/chat`; the server adds `Authorization: Bearer ...` and forwards.
- Yuyi chat state is persisted in `localStorage` (client-side only); the API is stateless.
- The system prompt is built by concatenating `api/prompts/0N-*.md` files in numeric order, separated by `---`.
- All screenshots, certificates, and brand assets live under `public/` with kebab-case names and semantic subfolders (`assets/`, `certs/`, `projects/`).

## See Also

- `plan.md` — project restructuring plan and history.
- `AGENTS.md` — agent execution rules, stack reference, browser automation rules.
