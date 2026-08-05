# plan.md — Project Restructuring Plan

> Living document. Follow phase order. Do not execute without approval. Each phase leaves the project in a working state (atomic commits).

## Current State Diagnosis

### Detected Issues

**1. `server/` directory is misnamed and mixed.**
- The folder is named `server/` but contains both runtime code (`server.mjs`) and prompt content (5 `.txt`/`.md` files).
- `server/server.mjs` is redundant.
- Prompts are content, not code. Mixing them hinders maintainability.

**2. Prompts are ungrouped and inconsistently named.**
- 5 flat files, mix of `.txt` and `.md`.
- `about-me.txt` does not communicate that it is Luis's knowledge base.
- `page-context.md` does not communicate that it is technical context.
- Concatenation order in `server.mjs` is not obvious from the file listing.

**3. `src/components/providers/` mixes concerns.**
- Contains Astro providers (`SmoothScroll.astro`, `TwindInit.astro`) AND a React state store (`yuyiStore.ts`).
- Providers are Astro infrastructure. The store is application state.

**4. Atomic design is over-organized.**
- Every component (even single-file ones) has its own folder. Verbose for small atoms/molecules.
- `SectionLabel` (1 file, 12 lines) does not need a folder.
- Only large multi-file organisms justify a dedicated folder.

**5. `public/` is flat and ungrouped.**
- Certificates (PDFs + 1 PNG) mixed with avatar and favicon.
- `screenshots/` is a reasonable name but files have inconsistent names:
  - `Digrama-use-case-1.png` (typo: "Digrama" instead of "Diagrama")
  - `MachineLearningwithPython.png` (lowercase "with", inconsistent with the PDF)
  - Mix of CamelCase (`MinecraftAi-1`) and kebab-case (`Digrama-use-case-1`).

**6. `scripts/` is a dump of 14 visual testing files.**
- Generic names: `verify.mjs`, `verify2.mjs`, `final-verify.mjs`, `verify-menu.mjs`, `verify-yuyi-menu.mjs`.
- Likely duplicates (`verify.mjs` vs `verify2.mjs`).
- No grouping by purpose.

**7. `src/hooks/`, `src/lib/`, and `src/components/providers/` are 3 sibling "infrastructure" folders.**
- Could be consolidated or share a common parent.

### Restructuring Goals

- **Scalable**: prompt system can grow to 10+ files without chaos.
- **Discoverable**: each file name communicates its purpose.
- **Cohesive**: structure groups by responsibility (code, content, assets, infra).
- **No breaking changes**: dev server, AI server, build, deploy continue to work.
- **Maximum 6 phases** (this document is phase 0).

---

## Phase 1 — Rename `server/` → `api/` and `server.mjs` → `app.mjs`

**Objective**: the folder name should describe its purpose. "server" is generic; "api" follows the project's convention. `server/server.mjs` becomes `api/app.mjs` (standard Node entry point convention).

### Operations

```bash
git mv server/ api/
git mv api/server.mjs api/app.mjs
```

### References to Update

- `package.json:13-14` — `server` and `dev:server` scripts change path:
  ```json
  "server": "node --env-file=.env api/app.mjs",
  "dev:server": "node --watch --env-file=.env api/app.mjs"
  ```
- `Dockerfile.api` — `WORKDIR` and `CMD` change path to `api/app.mjs`.
- `docker-compose.yml:25-26` — `dockerfile: Dockerfile.api` (unchanged) but `context: .` resolves `api/app.mjs` (unchanged).
- `.gitignore` — verify `.env` remains excluded (should be unchanged).
- `nginx.conf` — `proxy_pass http://api:3001` uses the Docker service name, not the path, so it is unchanged.

### Verification

```bash
pnpm server
curl http://localhost:3001/health
```

---

## Phase 2 — Group prompts under `api/prompts/` with descriptive names

**Objective**: separate content from code, make concatenation order explicit, unify format to `.md` (Markdown allows headers/structure), number files to enforce reading order.

### Operations

```bash
mkdir -p api/prompts

git mv api/personality.txt    api/prompts/01-persona.md
git mv api/mission.txt        api/prompts/02-mission.md
git mv api/examples.txt       api/prompts/03-examples.md
git mv api/about-me.txt       api/prompts/04-knowledge.md
git mv api/page-context.md    api/prompts/05-context.md
```

Explicit renames:
- `personality.txt` → `01-persona.md` (Yuyi's persona — who she is)
- `mission.txt` → `02-mission.md` (hard rules for persuasion, formatting, attachments)
- `examples.txt` → `03-examples.md` (few-shot examples of tone and behavior)
- `about-me.txt` → `04-knowledge.md` (Luis's knowledge, projects, skills, screenshot catalog, GitHub)
- `page-context.md` → `05-context.md` (technical context of the site, stack, backend technical identity)

### References to Update

- `api/app.mjs:7-20` — change `readFileSync(join(__dirname, ...))` calls to `join(__dirname, 'prompts', ...)` and update the filenames.
- `api/prompts/04-knowledge.md:108-110` — the reference to `descriptions.txt` (in `public/screenshots/`) remains valid but its path changes in Phase 5.

### Verification

```bash
pnpm dev:server
# Test 2-3 questions to confirm Yuyi still responds in her tone
```

---

## Phase 3 — Reorganize `src/components/`: flatten atoms/molecules, keep folders only for multi-file components

**Objective**: remove redundant folders for single-file components. Preserve Atomic Design but reduce noise.

### Operations

#### Atoms (all become flat files, no folders)

```bash
# Components with .tsx + .module.css become a file pair, no folder
git mv src/components/atoms/CloseTrigger/CloseTrigger.tsx        src/components/atoms/CloseTrigger.tsx
git mv src/components/atoms/CloseTrigger/CloseTrigger.module.css  src/components/atoms/CloseTrigger.module.css
rmdir src/components/atoms/CloseTrigger

# Repeat for: HeroButton, HeroCorner, HeroLetter, HeroParticle,
#             MenuBackground, MenuLink, MenuTrigger, SectionLabel, SideNavItem
```

#### Molecules (same treatment)

```bash
# Repeat the pattern for: HeroBackground, HeroCTA, HeroTagline, HeroTitle,
#                         Marquee, MenuList, SideNav
```

#### Organisms (only multi-file keep folders; rename `AIAssistant` → `ChatBubble`)

```bash
git mv src/components/organisms/AIAssistant/  src/components/organisms/ChatBubble/
git mv src/components/organisms/ChatBubble/AIAssistant.tsx        src/components/organisms/ChatBubble/index.tsx
git mv src/components/organisms/ChatBubble/AIAssistant.module.css  src/components/organisms/ChatBubble/bubble.module.css
git mv src/components/organisms/ChatBubble/AssistantMessage.tsx    src/components/organisms/ChatBubble/message.tsx
git mv src/components/organisms/ChatBubble/useAnimateLastMessage.ts src/components/organisms/ChatBubble/use-animate-last.ts
git mv src/components/organisms/ChatBubble/useDelayedReveal.ts     src/components/organisms/ChatBubble/use-delayed-reveal.ts
git mv src/components/organisms/ChatBubble/renderRichText.tsx      src/components/organisms/ChatBubble/rich-text.tsx
```

Explicit rename: `AIAssistant` → `ChatBubble` (describes what it is: the floating chat bubble, not a generic "AI assistant").

Internal renames inside `ChatBubble/`:
- `AIAssistant.tsx` → `index.tsx` (entry point)
- `AIAssistant.module.css` → `bubble.module.css`
- `AssistantMessage.tsx` → `message.tsx`
- `useAnimateLastMessage.ts` → `use-animate-last.ts`
- `useDelayedReveal.ts` → `use-delayed-reveal.ts`
- `renderRichText.tsx` → `rich-text.tsx`

Footer, HamburgerMenu, Hero: only rename internal files where applicable (preserve structure).

#### Sections (same pattern; rename `YuyiPage` → `YuyiFullChat`)

```bash
git mv src/components/sections/YuyiPage/  src/components/sections/YuyiFullChat/
git mv src/components/sections/YuyiFullChat/YuyiPage.tsx        src/components/sections/YuyiFullChat/index.tsx
git mv src/components/sections/YuyiFullChat/YuyiPage.module.css  src/components/sections/YuyiFullChat/full-chat.module.css
```

Explicit rename: `YuyiPage` → `YuyiFullChat` (it is the full-viewport chat, not "Yuyi's page" — the page is `/yuyi` in `src/pages/`).

Same pattern for `ContactSection` → `Contact` (folder), `TailwindSection` → `Tailwind`, `DeckSection` → `Deck`, `TextReveal` (unchanged).

### References to Update

- All imports of `@/components/organisms/AIAssistant/AIAssistant` → `@/components/organisms/ChatBubble`
- All imports of `@/components/sections/YuyiPage/YuyiPage` → `@/components/sections/YuyiFullChat`
- Apply same pattern to the remaining renames.

### Verification

```bash
astro dev --background
astro dev status
# Visually verify: /cv, /yuyi, /contact load without errors
# Floating bubble appears on /cv
astro dev stop
```

---

## Phase 4 — Separate Astro providers from the React state store

**Objective**: `components/providers/` must contain ONLY Astro providers. The Yuyi store moves to a dedicated state folder.

### Operations

```bash
mkdir -p src/stores
git mv src/components/providers/yuyiStore.ts  src/stores/yuyi.ts
```

`src/components/providers/` keeps only:
- `SmoothScroll.astro` (Astro provider for Lenis)
- `TwindInit.astro` (Astro provider for Twind)

### References to Update

- `@/components/providers/yuyiStore` → `@/stores/yuyi`
- `yuyiStore.ts` → `yuyi.ts` (shorter, no need for `Store` suffix because the folder already says `stores/`)

### Verification

```bash
astro dev --background
# Test /yuyi: multi-session sidebar, new chat, send message, reload persists
astro dev stop
```

---

## Phase 5 — Reorganize `public/` and rename public assets

**Objective**: group assets by type, normalize naming, fix typos, enforce a single convention.

### Operations

```bash
mkdir -p public/assets public/certs public/projects

# Move CV and certificates (consistent kebab-case)
git mv public/cv.pdf                                          public/certs/cv.pdf
git mv public/MachineLearningWithPython.pdf                   public/certs/ml-python.pdf
git mv public/CourseraDeepLearningWithPyTorch.pdf             public/certs/dl-pytorch.pdf
git mv public/IntroductionToNeuralNetworksAndPyTorch.pdf      public/certs/nn-pytorch.pdf
git mv public/MachineLearningwithPython.png                   public/certs/ml-python.png  # fix casing

# Move screenshots
git mv public/screenshots/  public/projects/
git mv public/projects/descriptions.txt  public/projects/catalog.md
```

Screenshot renames (consistent kebab-case, no typos, descriptive):

```bash
git mv public/projects/Yuyi-ai-1.png            public/projects/yuyi-cli-1.png
git mv public/projects/Yuyi-ai-2.png            public/projects/yuyi-cli-2.png
git mv public/projects/MinecraftAi-1.png        public/projects/minecraft-cave-1.png
git mv public/projects/MinecraftAi-2.png        public/projects/minecraft-death-2.png
git mv public/projects/MinecraftAi-3.png        public/projects/minecraft-rain-3.png
git mv public/projects/MinecraftAi-4.png        public/projects/minecraft-zombies-4.png
git mv public/projects/Mailapi-1.png            public/projects/mailapi-repo-1.png
git mv public/projects/Mailapi-2.png            public/projects/mailapi-keys-2.png
git mv public/projects/Mailapi-3.png            public/projects/mailapi-smtp-3.png
git mv public/projects/Mailapi-4.png            public/projects/mailapi-email-4.png
git mv public/projects/Chatapi-1.png            public/projects/chatapi-datasources-1.png
git mv public/projects/Chatapi-2.png            public/projects/chatapi-runtime-2.png
git mv public/projects/Chatapi-3.png            public/projects/chatapi-repo-3.png
git mv public/projects/Chatapi-4.png            public/projects/chatapi-flows-4.png
git mv public/projects/CylukWa-1.png            public/projects/cylukwa-logs-1.png
git mv public/projects/CylukWa-2.png            public/projects/cylukwa-tester-2.png
git mv public/projects/Dockploy-1.png           public/projects/dockploy-dashboard-1.png
git mv public/projects/Dockploy-2.png           public/projects/dockploy-s3-2.png
git mv public/projects/Dockploy-3.png           public/projects/dockploy-ssl-3.png
git mv public/projects/Dockploy-4.png           public/projects/dockploy-github-4.png
git mv public/projects/Dockploy-5.png           public/projects/dockploy-deploys-wa-5.png
git mv public/projects/Dockploy-6.png           public/projects/dockploy-monitoring-6.png
git mv public/projects/Dockploy-7.png           public/projects/dockploy-deploys-lp-7.png
git mv public/projects/Cloudflare-1.png         public/projects/cloudflare-dns-1.png
git mv public/projects/vps-contabo-1.png        public/projects/vps-ssh-1.png
git mv public/projects/Digrama-use-case-1.png   public/projects/uml-matricula-stripe-1.png  # fix typo
git mv public/projects/AddHomeWork-1.png        public/projects/addhomework-script-1.png
```

Move brand assets:

```bash
git mv public/avatar-bot.png   public/assets/avatar-bot.png
git mv public/favicon.ico      public/assets/favicon.ico
git mv public/favicon.svg      public/assets/favicon.svg
```

### References to Update

- `api/prompts/04-knowledge.md` — ALL `/screenshots/X.png` → `/projects/X.png` (per renames above).
- `public/projects/catalog.md` — update paths and labels to match the new names.
- `src/components/organisms/ChatBubble/bubble.module.css` and `rich-text.tsx` — if they reference hardcoded paths.
- `src/components/sections/YuyiFullChat/index.tsx` — `/avatar-bot.png` → `/assets/avatar-bot.png`.
- `astro.config.mjs` and layouts that use the favicon — verify paths.

### Verification

```bash
astro dev --background
# Visual: avatar renders, certificates open, project catalog in /yuyi loads
# Visual: links to screenshots in Yuyi responses load (no 404)
astro dev stop
```

---

## Phase 6 — Clean `scripts/` and update documentation

**Objective**: `scripts/` moves from 14 loose files to a minimal set named by purpose. Update README and AGENTS.

### Operations

```bash
# Remove duplicates and obsolete files
rm scripts/baseline.mjs
rm scripts/after.mjs
rm scripts/verify.mjs
rm scripts/verify2.mjs
rm scripts/verify-menu.mjs
rm scripts/verify-yuyi-menu.mjs
rm scripts/final-verify.mjs
rm scripts/overflow-check.mjs
rm scripts/overflow-drawer.mjs
rm scripts/touch-check.mjs
rm scripts/touch-check2.mjs
rm scripts/inspect.mjs
rm scripts/interact.mjs
rm scripts/compare.mjs

# Rename the surviving one to something descriptive
# (keep only the ones actually used; otherwise empty the folder)
```

Decision: if none are used regularly, **delete the entire `scripts/` folder**. If visual testing is desired, keep one file `scripts/smoke.mjs` with a minimal smoke test (loads `/`, `/cv`, `/yuyi` via Playwright and verifies no 500 errors in console).

### Update Documentation

- `README.md` — update the project structure section with the new organization.
- `AGENTS.md` — add a note about the new structure and prompt paths.
- `astro.config.mjs` — no functional changes.
- `package.json` — verify scripts (`dev`, `build`, `server`, `dev:server`) point to correct paths.

### Final Verification

```bash
# Production build
pnpm build

# Dev server (background, per AGENTS.md)
astro dev --background
pnpm server      # in a separate terminal

# Manual checks:
# 1. /cv loads, hero renders, scroll works
# 2. /yuyi loads, chat works, sidebar persists
# 3. /contact loads
# 4. Floating bubble appears on /cv and /contact
# 5. Ask Yuyi "pasame la imagen de la lluvia" — she responds with a valid screenshot
# 6. Ask Yuyi "que IA eres?" — she reveals Gemma 4 + OpenRouter
# 7. CORS OK, dev server proxy OK

astro dev stop
```

---

## Phase Summary

| # | Phase | Files Touched | Risk |
|---|---|---|---|
| 1 | `server/` → `api/`, `server.mjs` → `app.mjs` | 1 folder, 1 file, 3 configs | Low (paths only) |
| 2 | Prompts to `api/prompts/` with names | 5 files + 1 path in `app.mjs` | Low |
| 3 | Flatten components, rename `AIAssistant` and `YuyiPage` | ~50 files (moves), several imports | Medium (many imports) |
| 4 | `yuyiStore.ts` → `stores/yuyi.ts` | 1 file + imports | Low |
| 5 | `public/` grouped, kebab-case, fix typos | ~30 files + 1 prompt file | Medium (paths in prompts) |
| 6 | Clean `scripts/`, update docs | ~14 deletions, 2 docs | Low |

## Expected Final Structure

```
/
  api/                        # Yuyi AI backend
    app.mjs                   # entry point (renamed from server.mjs)
    prompts/
      01-persona.md           # Yuyi's persona
      02-mission.md           # persuasion and delivery rules
      03-examples.md          # few-shot examples
      04-knowledge.md         # Luis's knowledge + catalog
      05-context.md           # technical context of the site
  public/                     # static assets (Astro)
    assets/
      avatar-bot.png
      favicon.svg
      favicon.ico
    certs/
      cv.pdf
      ml-python.{pdf,png}
      dl-pytorch.pdf
      nn-pytorch.pdf
    projects/
      <kebab-case images>
      catalog.md              # human-readable description of each image
  src/                        # Astro source
    components/
      atoms/                  # flat file pair, no folder
      molecules/              # flat file pair, no folder
      organisms/              # only multi-file in folder
        ChatBubble/           # renamed from AIAssistant
          index.tsx
          bubble.module.css
          message.tsx
          use-animate-last.ts
          use-delayed-reveal.ts
          rich-text.tsx
        Footer/
        HamburgerMenu/
        Hero/
      sections/               # page sections
        YuyiFullChat/         # renamed from YuyiPage
        Contact/
        Deck/
        Tailwind/
        TextReveal/
      providers/              # Astro providers only
        SmoothScroll.astro
        TwindInit.astro
    stores/                   # application state
      yuyi.ts                 # moved from components/providers/
    hooks/                    # React hooks
    lib/                      # utilities
    constants/
    layouts/
    pages/
    styles/
    middleware.ts
  scripts/                    # visual testing (reduced)
  config files (root):        # astro.config.mjs, tsconfig.json, etc
  deploy files (root):        # Dockerfile.api, Dockerfile.web, docker-compose.yml, nginx.conf
  docs (root):                # README.md, AGENTS.md, plan.md
```

## New Conventions

- **Folders**: kebab-case for multi-word (`YuyiFullChat`, not `YuyiFullchat`).
- **Files inside folders**: `index.tsx` is the entry point; sibling files use a descriptive suffix (`bubble.module.css`, `message.tsx`, `use-animate-last.ts`).
- **Prompts**: numbered with `NN-` prefix to enforce reading order alphabetically.
- **Public assets**: kebab-case always (`cv.pdf`, `ml-python.png`).
- **Imports**: `@/stores/yuyi` (no extension); `@/api/...` is not used (Astro requires extra config for path aliases).
- **No abbreviations**: `knowledge.md` over `about.md`; `full-chat.module.css` over `main.module.css`.

## Abort Strategy

If any phase breaks something, the previous state can be restored with inverse `git mv`. Each phase should be one atomic commit to enable clean reverts.
