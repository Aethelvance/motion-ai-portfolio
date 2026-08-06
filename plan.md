# Production Hardening & Scalability Plan

Status: proposed
Scope: `api/`, `src/`, `nginx.conf`, `docker-compose.yml`, `Dockerfile.*`
Goal: eliminate the technical debt that causes intermittent "no hay servidor" failures, harden the deploy/operational surface, and prepare the system to scale beyond a single VPS.

---

## Phase 1 — Reliability Foundation

### Objective
Replace the catch-all error sink in the chat pipeline with typed, recoverable failures. The user must see the actual reason a message failed (rate limit, timeout, network blip, LLM error) and the system must self-heal on transient errors.

### Tasks

#### 1.1 — Typed error model in `src/stores/yuyi.ts`
- Replace `} catch {` (lines 253, 99) with `} catch (err) {` and classify the error into a `ChatError` union: `{ kind: 'network' | 'http' | 'timeout' | 'parse' | 'storage' }`.
- Add `AbortController` to every `fetch` so we can enforce a client-side timeout (default 25s, under nginx's 60s ceiling).
- Surface the error in the message bubble UI: instead of the single "No pude conectar con el servidor" string, render a short, specific reason ("se acabo el rate limit", "el servidor tardo demasiado", "sin conexion"). The user can retry from the same message.

#### 1.2 — Retry with exponential backoff
- On `kind: 'network' | 'http' (status >= 500) | 'timeout'`, retry up to 2 times with backoff `400ms, 1200ms`.
- Do NOT retry on `kind: 'http' (status 4xx)` (those are terminal, retrying wastes quota).
- Persist the in-flight user message in `this.chats` **before** the first attempt (currently it is mutated in place; ensure rollback on final failure so the input is restored).

#### 1.3 — Input preservation
- Move `this.input = ''` and the chat mutation to **after** a successful response, or inside the retry loop. If all retries fail, restore the original `this.input` so the user does not retype.

#### 1.4 — `api/app.mjs` timeout & error classification
- Wrap the upstream `fetch(`${BASE_URL}/chat/completions`, ...)` (line 159) with `AbortController` and a 45s timeout. Map upstream errors to HTTP status:
  - upstream 429 → respond 429 (not generic 500) so the client can back off intelligently.
  - upstream 5xx → respond 502 (Bad Gateway), not 500.
  - upstream timeout → respond 504 (Gateway Timeout).
  - `ENOTFOUND` / `ECONNREFUSED` → respond 503.
- Add `request-id` header round-trip: generate a `crypto.randomUUID()` per request, echo it in the response header `X-Request-Id`, and include it in all log lines for that request.

#### 1.5 — Rate limiting at the edge
- Add `limit_req_zone $binary_remote_addr zone=chat:10m rate=10r/m;` to `nginx.conf`.
- Apply `limit_req zone=chat burst=5 nodelay;` inside `location /api/`.
- Reject overflow with `429 Too Many Requests` and `Retry-After: 30`.

#### 1.6 — Real healthcheck
- In `docker-compose.yml`, change the api healthcheck from `wget .../health` (line 79) to a two-step probe: `/health` must return 200 **and** a cached `lastOpenRouterCheck` timestamp must be < 5min old. Implement `lastOpenRouterCheck` in `api/app.mjs` as a background timer that pings OpenRouter with a 1-token `max_tokens` request every 60s.

### Verification (Phase 1)
- `npm run build` exits 0. `docker compose up -d --build` brings both containers to `healthy` within 30s.
- From terminal: `curl -i -X POST https://ingenierodeia.com/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"ping"}]}'` returns 200 with a Yuyi reply and an `X-Request-Id` header.
- Force a failure: stop the api container with `docker compose stop api`, then send a message in the browser. UI must show a typed error within 25s (not "no hay servidor"). Restart api with `docker compose start api`; the next message must succeed without a hard refresh.
- Force a rate limit: send 20 messages in 10s from `curl` in a loop. The 11th-15th must be served from `burst=5`; the 16th onward must return 429 with `Retry-After`.
- Force an OpenRouter failure: temporarily set `LLM_BASE_URL=https://httpbin.org/status/500` in `.env`, restart api. Healthcheck must flip to `unhealthy` within 60s. Revert `.env`, restart, healthcheck returns to `healthy`.

### Rollback (Phase 1)
- Each task is gated by feature flag in `api/app.mjs` (e.g. `ENABLE_TIMEOUT=1`, `ENABLE_RATE_LIMIT=1`). Setting the flag to `0` reverts the behavior without code changes.
- The retry logic is contained in `src/stores/yuyi.ts`; `git revert` of that file alone restores the old behavior.

---

## Phase 2 — Request / Response Hardening

### Objective
Make the chat payload pipeline robust to large images, long histories, and verbose LLM outputs. Eliminate the silent 413s from base64 image uploads and the silent context loss in long conversations.

### Tasks

#### 2.1 — Image upload via multipart, not base64
- In `src/components/sections/YuyiFullChat/index.tsx` (line 54, `readFile`), switch from `FileReader.readAsDataURL` to `FormData` + `Blob`.
- New endpoint: `POST /api/chat/upload` in `api/app.mjs`. Accepts `multipart/form-data` with one image file. Validates: mime `image/*`, size `<= 8 MiB`, dimensions auto-detected via `sharp` (already a dep, see `Dockerfile.api:13`).
- Response: `{ url: "https://ingenierodeia.com/api/chat/upload/<uuid>.<ext>" }`. The browser stores the URL (not the bytes) in the chat history. The api serves the file from an in-memory map or `nginx` static path.
- Mark the old base64 path as deprecated but keep it functional for one release behind `?legacy=1` query param.

#### 2.2 — `MAX_BODY_BYTES` alignment
- The api enforces `MAX_BODY_BYTES=1048576` (1 MiB) at `api/app.mjs:19`. With the new image upload endpoint, raise this to `8 * 1024 * 1024` (8 MiB) **only for `/api/chat/upload`**, and keep 1 MiB for `/api/chat`. Implement per-route limit by branching in `readBody` or by using a separate handler.

#### 2.3 — Server-side chat history
- Today, every chat turn sends the full client-side history in the request body (reserialized every time). At ~20 messages of average length, this is wasteful and grows linearly.
- Add `POST /api/chat/thread` to upsert a thread on the server. The browser sends only the **new** user message + `threadId`. The api loads the full history from storage, appends, and forwards to OpenRouter.
- Storage: start with `node:fs` write to a JSON file under `/data/threads/<threadId>.json` (mounted as a volume in compose). Migrate to Redis/Postgres later — the interface should be abstracted behind `ThreadStore`.

#### 2.4 — `max_tokens` per persona
- Move `max_tokens: 500` (line 170) to a per-message override. The system prompt signals when a response should be short ("si", "una palabra", "5 bullets") and the api parses that signal to set a tighter `max_tokens`. Default stays 500 for unsignalled messages.

#### 2.5 — Preflight cache
- Add `Access-Control-Max-Age: 600` to the CORS response in `api/app.mjs:48-51` (`BASE_CORS_HEADERS`). This cuts one round-trip per chat turn.

#### 2.6 — Response compression
- Add `application/json` to `gzip_types` in `nginx.conf:48`. Responses from `/api/chat` are 200-500 bytes uncompressed; the bandwidth saving is small but the latency win is real on slow links (the user is in Peru, mobile networks dominate).

### Verification (Phase 2)
- Upload a 6 MiB image from the `/yuyi` page. The chat message renders the image and the request completes in < 5s.
- Start a 30-turn conversation. The 30th turn request body must be < 4 KiB (just the new message + threadId). The 30th turn response must still have full context (test by asking "what was the first thing I asked you?").
- Open DevTools Network → confirm `Access-Control-Max-Age: 600` is present on the preflight response.
- `curl -H "Accept-Encoding: gzip" ... | wc -c` must be smaller than the same request without `Accept-Encoding`.

### Rollback (Phase 2)
- 2.1 + 2.2 introduce a new endpoint, not a change to the old one. Remove the route + revert `MAX_BODY_BYTES` to 1 MiB.
- 2.3 introduces `ThreadStore` behind a single interface. The old "send full history" path can be re-enabled with `USE_SERVER_THREADS=0`.
- 2.4-2.6 are additive and can be removed one at a time.

---

## Phase 3 — Operational Hardening

### Objective
Make the deploy, runtime, and failure modes predictable. Eliminate silent crash loops, decouple the runtime network from Dokploy's specific naming, and ship a known-good image digest.

### Tasks

#### 3.1 — Crash-loop containment
- Replace `restart: unless-stopped` (compose lines 23, 53) with `restart: on-failure:5`. After 5 failed starts in 60s, the container stays down. Dokploy (or any orchestrator) must then escalate.
- Add a startup probe: the api must bind to its port within 10s of container start, or exit non-zero.

#### 3.2 — Decouple the external network
- Move `dokploy-network: external: true` to a named profile:
  ```yaml
  networks:
    dokploy:
      external: true
      name: ${DOKPLOY_NETWORK:-dokploy-network}
  ```
- Add a `prod` profile that includes `dokploy`, and a `dev` profile that does not. Local `docker compose up` works out of the box; production opt-in via `docker compose --profile prod up`.

#### 3.3 — Pin base image digests
- `Dockerfile.api:1` → `FROM node:22.13.0-alpine@sha256:<digest>`.
- `Dockerfile.web:48` → `FROM nginx:1.27.4-alpine@sha256:<digest>`.
- A CI step on first build of the month validates the digest; subsequent builds fail if upstream changed without review.

#### 3.4 — Remove the temporary diagnostic
- Delete `Dockerfile.web:27-36` (the `RUN echo "=== pnpm build output ==="` block) and its comment. Move the diagnostic to a separate `scripts/diagnose-build.sh` invoked only by `make diagnose-build`, never in the default `docker build`.

#### 3.5 — `HEALTHCHECK` in Dockerfiles
- Add `HEALTHCHECK` directives directly to `Dockerfile.api` and `Dockerfile.web`, mirroring the compose-level healthchecks but using `HEALTHCHECK` syntax so `docker run` and `docker compose` produce identical behavior.

#### 3.6 — Secrets management
- `LLM_API_KEY` is currently passed via env in compose. Dokploy may store this in plaintext. Document a path to mount it from a file (Docker `secrets:` or `env_file: .env.production` chmod `600`, owned by `root:node`).

#### 3.7 — `pnpm` cache layer
- `Dockerfile.api:12` and `Dockerfile.web:16` reinstall node_modules on every build. Add `RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm fetch` to populate the pnpm content-addressable store, then `pnpm install --offline` for the actual install. Drops build time by ~60% on cache hits.

### Verification (Phase 3)
- `docker compose --profile dev up` (no `prod`) starts the stack with only `cv-net`. Dokploy stays optional.
- `docker compose --profile prod up` (with `DOKPLOY_NETWORK=...` set) starts the full stack with the dokploy network attached.
- Force a crash loop: `docker compose up api` then `docker exec <id> pkill -9 node`. The container restarts 5 times, then stops. `docker compose ps` shows `Exit 1`, not the prior `Restarting` state.
- Build a fresh image with no `pnpm` cache (`docker builder prune -af && docker build .`). Time it. Build a second time. Confirm the second build is < 40% of the first.
- `docker inspect <api-image> | jq '.[0].Config.Healthcheck'` returns a valid `HEALTHCHECK` block.

### Rollback (Phase 3)
- `restart: on-failure:5` is a single line; revert to `unless-stopped`.
- Network profile is additive. Old single-network config is preserved under the `dev` profile.
- Pinned digests are pinned, not removed. The CI step that validates them is the only thing that can fail-fast; removal of that step is a no-op.

---

## Phase 4 — Observability & Debugging

### Objective
Make every chat request traceable end-to-end. The user (and the operator) must be able to answer: "what failed, for whom, when, and why?" without grepping container logs blind.

### Tasks

#### 4.1 — Structured logging in `api/app.mjs`
- Replace `console.log` / `console.error` (lines 202, 207, 24, 28, 32, 178, 192) with a tiny `log` helper that emits one-line JSON: `{ ts, level, requestId, route, status, latencyMs, model, promptTokens, completionTokens, err }`.
- Pipe to stdout (current) but keep the format parseable so a future `fluent-bit` or `loki` agent can ship to a central store.

#### 4.2 — Client-side error telemetry
- When the chat fails, the UI now shows the typed reason (Phase 1.1). Also: if the user clicks the failure bubble, send a `POST /api/telemetry/error` with `{ requestId, errorKind, userAgent, viewport, chatLength }`. This is opt-in via a setting in `localStorage` (default off to respect privacy).
- The endpoint validates against a shared `TELEMETRY_TOKEN` env var; if unset, the endpoint 404s (so production deploys without it incur zero cost).

#### 4.3 — Frontend request-id propagation
- The browser's `fetch` (Phase 1.1) reads the `X-Request-Id` header from the response. The next retry sends `X-Client-Request-Id` so the operator can correlate one logical "user click" to all retry attempts in the api log.

#### 4.4 — LLM-call breakdown logging
- At the api level, log the time spent in (a) prompt assembly, (b) upstream fetch, (c) response parsing, (d) post-processing. The breakdown is what tells you whether a slow turn is OpenRouter being slow, or the api spending too long serializing the history.

#### 4.5 — Frontend performance marks
- Add `performance.mark('chat-send')` and `performance.measure('chat-turn', 'chat-send', 'chat-reply')` in the yuyi store. The browser DevTools Performance tab will show per-turn latency, and a future `web-vitals`-style reporter can ship p50/p95 to the operator.

#### 4.6 — `/api/chat/healthz` returns telemetry
- Today's `healthz` (line 106) returns `{ ok: true, status: 'active' }`. Augment with `{ uptimeSec, totalRequests, errorRate5min, avgLatencyMs5min, openRouterStatus }`. This lets the operator probe a single endpoint to know the system health without log access.

### Verification (Phase 4)
- Tail `docker compose logs api -f`. Send 5 messages. Verify each one emits exactly one JSON log line with all expected fields.
- Force a 429 from the rate limiter. The log line must include `status: 429` and `err.kind: 'rate_limited'`.
- In the browser DevTools → Network → click a chat POST → confirm `X-Request-Id` is present in the response and matches the value in the api log.
- `curl https://ingenierodeia.com/api/chat/healthz` returns the augmented payload with non-zero `totalRequests` after a few chats have happened.

### Rollback (Phase 4)
- 4.1: revert to `console.log`. JSON parsing is a strict superset of free-text.
- 4.2: client-side opt-in; default off; delete the call site.
- 4.3-4.6: additive, no behavior change on rollback.

---

## Phase 5 — Scalability & Production Readiness

### Objective
Move the api from a single-process Node server (current) to a horizontally-scalable, streaming, edge-friendly architecture. The web tier already scales via `nginx` + Cloudflare; the bottleneck is the api.

### Tasks

#### 5.1 — Streaming responses (SSE)
- The current api returns the full Yuyi reply as one JSON blob. The user sees a loading spinner for the entire LLM round-trip (often 3-15s for Gemma 4 26B). Switch to `text/event-stream`:
  - `api/app.mjs` returns `Content-Type: text/event-stream`.
  - Each token from OpenRouter is forwarded to the browser as an SSE event.
  - `src/stores/yuyi.ts` reads the stream with `ReadableStream` + `TextDecoder` and reveals the reply incrementally (the chunked-reveal logic in `src/components/organisms/ChatBubble/use-delayed-reveal.ts:1` is already a head start — generalize it).
- The browser aborts the stream on tab close via `AbortController`. The api aborts the upstream `fetch` on client disconnect.

#### 5.2 — Stateless api + external session store
- The current api is stateless (good), but per Phase 2.3 the thread store will be a file on disk (bad for horizontal scaling). Replace the file-backed `ThreadStore` with a Redis-backed one (or a Postgres one if you want analytics later). The interface is the same; only the implementation changes.
- The api container becomes truly stateless: `docker compose up --scale api=3` works without coordination.

#### 5.3 — Connection pooling to OpenRouter
- Today's `fetch` opens a new TLS connection per request. `node:https` keeps a default agent; explicitly set `keepAlive: true` and a small `maxSockets` (e.g., 50) to reuse connections. On a hot path with `concurrency=3` apis, this is the difference between 100ms and 800ms TTFB.

#### 5.4 — Edge caching for static assets
- `nginx.conf` currently sends no `Cache-Control` headers for the built Astro assets. Add:
  - `_astro/*` (hashed) → `Cache-Control: public, max-age=31536000, immutable`.
  - `index.html`, `yuyi/`, `contact/` → `Cache-Control: no-cache, must-revalidate` (revalidate each visit; the HTML references hashed assets so the user always gets the latest bundle).
  - `/api/chat*` → `Cache-Control: no-store`.

#### 5.5 — Multi-region readiness
- The current VPS is in Contabo (Germany). A user in Peru hits it with ~180ms RTT baseline. Phase 5 enables, but does not require, multi-region:
  - Move static assets to Cloudflare R2 (or use the existing Cloudflare proxy on the DNS). Set the `SITE_URL` env var to the bucket URL.
  - Run the api in two regions, fronted by a Cloudflare Load Balancer with health checks on `/api/chat/healthz` (Phase 4.6). Geo-steering by client country.
  - This is a stretch goal. Skip if traffic does not warrant.

#### 5.6 — Cost guardrails
- Add a per-IP daily token budget in the api: count `prompt_tokens + completion_tokens` from the OpenRouter response; reject with 429 if a single IP exceeds (e.g.) 100k tokens/day. Configurable via `DAILY_TOKEN_BUDGET` env var. The free tier of OpenRouter has hard limits; a runaway client (or scraper) can blow the quota in minutes.

### Verification (Phase 5)
- Open the chat in the browser. The first token of Yuyi's reply must appear within 1.5s of pressing Send (with a 200ms warm cache). Verify in DevTools Network that the response is `Content-Type: text/event-stream` and the events stream incrementally.
- `wrk -t4 -c20 -d30s https://ingenierodeia.com/api/chat/healthz` reports p99 < 100ms for the healthcheck.
- `docker compose up --scale api=3`. Three api containers behind one nginx. Send 10 concurrent messages from `curl`; all 10 must succeed and the responses must reflect traffic split roughly evenly across the 3 containers (verify via the per-request `X-Request-Id` in the api logs).
- `curl -I https://ingenierodeia.com/_astro/<some-hashed-file>.js` returns `Cache-Control: public, max-age=31536000, immutable`.
- `curl -I https://ingenierodeia.com/` returns `Cache-Control: no-cache, must-revalidate`.
- With a fake `DAILY_TOKEN_BUDGET=1000`, send enough messages to exceed 1000 tokens. The api must start returning 429 with `Retry-After: <seconds-until-midnight-utc>`.

### Rollback (Phase 5)
- 5.1: SSE is a separate response path. Revert by reading the OpenRouter response fully and returning JSON. The browser code falls back to "all at once" reveal.
- 5.2: `ThreadStore` interface is the only coupling. Swap the Redis impl for the file impl; no other code changes.
- 5.3-5.6: additive, no behavior change on rollback.

---

## Cross-phase Verification

After all 5 phases are merged, run the full regression suite:

1. **Build**: `pnpm build` exits 0; docker build for both services exits 0.
2. **Local stack**: `docker compose --profile dev up -d --build` brings both services healthy in < 30s.
3. **Functional smoke**:
   - `curl -fsS -X POST http://127.0.0.1:8080/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hola"}]}'` returns 200 with a Yuyi reply.
   - Browser: open `http://127.0.0.1:8080/`, click the Yuyi bubble, send "hola". The reply streams in. Upload a 5 MiB image. The image renders. Send a 30-turn conversation; the 30th turn has full context.
   - Force the api to crash; the UI shows a typed error within 25s; the user can retry; recovery is automatic on api restart.
4. **Production smoke** (after deploy): repeat 3 with `https://ingenierodeia.com`. Confirm `X-Request-Id` is round-tripped. Confirm `Cache-Control` headers on the right paths.
5. **Load test**: `wrk` against `/api/chat/healthz` for 30s reports p99 < 100ms. 10 concurrent chat requests succeed.
6. **Failure modes**: kill the api, the web, the OpenRouter side, the network. In each case, the system either recovers or surfaces a clear, specific error.

---

## Out of Scope (for this plan)

- Migrating the chat to a different LLM provider.
- Adding real-time voice input.
- Adding a "Yuyi memory" feature across sessions.
- A proper admin dashboard for thread inspection.
- i18n of the prompts beyond the current Spanish.

These are separate initiatives and would each be a plan of their own.
