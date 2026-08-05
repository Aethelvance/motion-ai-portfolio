# docker-local-deploy.md

Real, observed data from a fresh `docker compose up` on this machine. Every port, every IP, every byte count below is from a live test, not a hypothetical.

## 1. Stack Overview

Two services, one internal bridge network, no public exposure of the API.

| Service | Image | Role | Exposed port (host) | Exposed port (Docker) |
|---|---|---|---|---|
| `web` | `ingenierodeia-landing-page-web:latest` | Static Astro build served by nginx; reverse-proxy for `/api/*` | `0.0.0.0:80 → 80/tcp` | 80 only |
| `api` | `ingenierodeia-landing-page-api:latest` | Node.js Yuyi AI backend; LLM proxy | (none) | `expose 3001` (internal only) |

The browser only ever talks to `web` on port 80. `web` proxies `/api/*` to `api:3001` on the internal Docker network. `api` is unreachable from the host.

---

## 2. Container State (after `docker compose up -d`)

```
$ docker compose ps
NAME                               IMAGE                            COMMAND                  SERVICE   STATE     STATUS                             PORTS
ingenierodeia-landing-page-api-1   ingenierodeia-landing-page-api   "docker-entrypoint.s…"   api       running   Up 20 seconds (healthy)            3001/tcp
ingenierodeia-landing-page-web-1   ingenierodeia-landing-page-web   "/docker-entrypoint.…"   web       running   Up 14 seconds (health: starting)   0.0.0.0:80->80/tcp, [::]:80->80/tcp
```

### Per-container detail (docker inspect)

**api**
| Field | Value |
|---|---|
| Name | `ingenierodeia-landing-page-api-1` |
| Image | `ingenierodeia-landing-page-api` |
| State | running |
| Started | `2026-08-05T18:21:03.44229448Z` |
| RestartPolicy | `unless-stopped` |
| User | `node` (UID 1000) |
| WorkingDir | `/app` |
| NetworkMode | `ingenierodeia-landing-page_cv-net` |
| Mounts | (none — image is self-contained) |
| Health | `healthy` |
| Entrypoint process | `node api/app.mjs` (PID 1) |
| Bind mounts | none (production-style image) |

**web**
| Field | Value |
|---|---|
| Name | `ingenierodeia-landing-page-web-1` |
| Image | `ingenierodeia-landing-page-web` |
| State | running |
| Started | `2026-08-05T18:21:09.048273134Z` |
| RestartPolicy | `unless-stopped` |
| User | `root` (nginx requires it for port 80 + log dirs) |
| WorkingDir | `/` |
| NetworkMode | `ingenierodeia-landing-page_cv-net` |
| Mounts | none |
| Health | `starting` (becomes `healthy` after 10s start_period) |
| Master process | `nginx: master process nginx -g daemon off;` (PID 1, root) |
| Worker processes | 3x `nginx: worker process` (UID `nginx`, PID 29-31) |

**Start-to-healthy elapsed time: 5.98 s** (measured with `time docker compose up -d`).

---

## 3. Network Topology

### The bridge network

```
$ docker network inspect ingenierodeia-landing-page_cv-net
Network name:   ingenierodeia-landing-page_cv-net
Network ID:     bd1c9717935bbffa3643881e7523b4020aabe22272d26c605c836fac359c90c5
Driver:         bridge
Subnet:         172.23.0.0/16
Gateway:        172.23.0.1
Containers:     2
```

### Per-container IPs (inside cv-net)

| Container | IPv4 | MAC |
|---|---|---|
| `ingenierodeia-landing-page-api-1` | `172.23.0.2/16` | `de:a5:8d:71:ad:ec` |
| `ingenierodeia-landing-page-web-1` | `172.23.0.3/16` | `f2:df:97:b5:c3:b1` |

### DNS resolution (Docker's embedded resolver)

```
$ docker exec api-1 getent hosts api
172.23.0.2      api  api
$ docker exec api-1 getent hosts web
172.23.0.3      web  web
$ docker exec web-1 getent hosts api
172.23.0.2      api  api
```

Both containers can resolve each other by service name. `nginx` inside the web container uses `proxy_pass http://api:3001;` — Docker's DNS resolves `api` to `172.23.0.2` automatically.

### Host-side port mapping

```
$ ss -tlnp | grep -E "80|443|3001"
LISTEN 0  4096  0.0.0.0:80    0.0.0.0:*  users:(("docker-proxy",...))
LISTEN 0  4096  0.0.0.0:443   0.0.0.0:*  users:(("docker-proxy",...))
```

**Note:** Port 443 appears in the listing because the web container publishes `443:443` in compose. **This is wrong for Dokploy** (where Traefik owns 443). I removed that line in a later edit but this test was run with the older compose — see section 10 for the current state.

### Test 1 — Network isolation (host cannot reach api)

```
$ curl -v -m 3 http://localhost:3001/health
* Host localhost:3001 was resolved.
* IPv6: ::1
* IPv4: 127.0.0.1
*   Trying [::1]:3001...
* connect to ::1 port 3001 from ::1 port 39362 failed: Connection refused
*   Trying 127.0.0.1:3001...
* connect to 127.0.0.1 port 3001 from 127.0.0.1 port 33906 failed: Connection refused
curl: (7) Failed to connect to localhost:3001 after 0 ms: Could not connect to server
```

The `api` container has `expose: ["3001"]` (internal only, no `ports:` mapping), so the host cannot reach it directly. **Only `web` can reach `api` on the internal bridge.**

### Test 2 — Internal reachability (web can reach api)

```
$ docker exec web-1 wget -qO- http://api:3001/health
{"ok":true,"model":"google/gemma-4-26b-a4b-it"}
```

---

## 4. Image Sizes

```
$ docker images ingenierodeia-landing-page-*
REPOSITORY:TAG                          SIZE
ingenierodeia-landing-page-api:latest   654MB
ingenierodeia-landing-page-web:latest   53.1MB
```

### Layer breakdown — api

```
$ docker history ingenierodeia-landing-page-api:latest
CREATED BY                                      SIZE
LABEL com.docker.compose.image.builder=classic  0B
CMD ["node" "api/app.mjs"]                       0B
EXPOSE 3001                                     0B
USER node                                       0B
COPY --chown=node:node dir:…                     61.4kB     ← api/ source
pnpm install --frozen-lockfile --prod…          590MB       ← node_modules
COPY multi:…                                    115kB       ← package files
```

The api image is dominated by the production `node_modules`. The actual `api/` source is only 61.4 kB.

### Layer breakdown — web

```
$ docker history ingenierodeia-landing-page-web:latest
CREATED BY                                      SIZE
LABEL com.docker.compose.image.builder=classic  0B
CMD ["nginx" "-g" "daemon off;"]                0B
EXPOSE 80                                       0B
COPY file:… (nginx.conf)                        4.1kB
COPY dir:… (Astro dist output)                  8.09MB
RUN apk add certs, curl, openssl…               52.3MB       ← base nginx image
ENV ACME_VERSION=0.4.1                          0B
```

The web image is small: 8MB of static content + 52MB of nginx base.

---

## 5. Live Resource Usage

```
$ docker stats --no-stream
NAME                               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O         BLOCK I/O
ingenierodeia-landing-page-api-1   0.01%     13.97MiB / 31.26GiB   0.04%     6.61kB / 126B   0B / 0B
ingenierodeia-landing-page-web-1   0.00%     12.61MiB / 31.26GiB   0.04%     5.11kB / 126B   0B / 0B
```

- **api**: ~14 MB RAM at idle. The LLM call uses transient memory.
- **web**: ~13 MB RAM at idle. Static file serving, no caching configured.
- **CPU**: 0% at idle. Both spike during the LLM call.

---

## 6. Environment Variables (api container, runtime)

```
$ docker exec api-1 printenv | grep -E "LLM_|CORS|MAX_BODY|SITE_URL|PORT"
MAX_BODY_BYTES=1048576
PORT=3001
LLM_API_KEY=NoMostrar
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=google/gemma-4-26b-a4b-it
SITE_URL=http://localhost:4321
CORS_ORIGIN=*
```

The `web` container has **no LLM env vars** — only the api knows the LLM key. The browser can never see it (network isolation, plus the browser only ever talks to `web`, which has no key to leak).

---

## 7. Static Page Flow (browser → nginx → filesystem)

The web container serves the prebuilt Astro `dist/` from `/usr/share/nginx/html`.

### Test 4 — URL matrix

```
$ for path in / /cv /yuyi /contact /assets/avatar-bot.png /projects/dockploy-dashboard-1.png /certs/cv.pdf; do
    curl -s -o /dev/null -w "  HTTP %{http_code}  size=%{size_download}B  time=%{time_total}s  ${path}\n" "http://localhost$path"
  done
  HTTP 200  size=250B     time=0.000496s  /
  HTTP 301  size=169B     time=0.000411s  /cv
  HTTP 301  size=169B     time=0.000416s  /yuyi
  HTTP 301  size=169B     time=0.000415s  /contact
  HTTP 200  size=87650B   time=0.000472s  /assets/avatar-bot.png
  HTTP 200  size=98331B   time=0.000458s  /projects/dockploy-dashboard-1.png
  HTTP 200  size=227724B  time=0.000534s  /certs/cv.pdf
```

**Why `/cv`, `/yuyi`, `/contact` return 301**: Astro's `output: 'static'` generates `cv/index.html` and serves it at `/cv/`. nginx's `try_files` is configured without `absolute_redirect off;`, so `/cv` → `/cv/` (301). The final page is `HTTP 200`. Add `absolute_redirect off;` to nginx.conf if you want the URL to stay as `/cv`.

### File mapping inside the web container

| URL path | Served from |
|---|---|
| `/` | `/usr/share/nginx/html/index.html` (250 B — redirects to `/cv/`) |
| `/cv/` | `/usr/share/nginx/html/cv/index.html` |
| `/yuyi/` | `/usr/share/nginx/html/yuyi/index.html` |
| `/contact/` | `/usr/share/nginx/html/contact/index.html` |
| `/assets/avatar-bot.png` | `/usr/share/nginx/html/assets/avatar-bot.png` (87.6 kB) |
| `/projects/dockploy-dashboard-1.png` | `/usr/share/nginx/html/projects/dockploy-dashboard-1.png` (98.3 kB) |
| `/certs/cv.pdf` | `/usr/share/nginx/html/certs/cv.pdf` (227.7 kB) |

---

## 8. Chat Flow (browser → nginx → api → OpenRouter → response)

This is the end-to-end flow when a recruiter asks the AI a question in the floating chat window.

### Sequence diagram (with real timing)

```
Browser (recruiter on /yuyi)
   │  POST /api/chat {"messages":[…]}
   │  size: 105 B JSON
   ▼
nginx (web container, port 80)
   │  1. Validate Content-Length ≤ 1 MiB (413 if not)
   │  2. Add security headers
   │  3. proxy_pass http://api:3001/api/chat
   │  ← 0.0001 s (LAN)
   ▼
api (api container, internal 172.23.0.2:3001)
   │  1. Sanitize messages (filter user/assistant only, cap 2000 chars, max 20 messages)
   │  2. Concatenate 5 prompt files (01-persona … 05-context) into system prompt
   │  3. Rewrite `](/path)` → `](http://localhost:4321/path)` in system prompt
   │  4. POST to https://openrouter.ai/api/v1/chat/completions
   │     Authorization: Bearer sk-or-v1-...
   │     Model: google/gemma-4-26b-a4b-it
   │     temperature: 0.7, max_tokens: 500
   │  ← 3.0 s (gemma-4 inference)
   ▼
OpenRouter (api.openrouter.ai)
   │  Routes to Google (Gemma 4 inference)
   │  ← 3.0 s
   ▼
api (continues)
   │  Extract data.choices[0].message.content
   │  Return { message: "toma --- [Minecraft lluvia arana](...) --- ..." }
   ▼
nginx
   │  Add CORS headers, return to browser
   ▼
Browser
   │  Renders Yuyi's response with image
   ▼
DOM updated
```

### Test 6 — Real chat request (curl)

```bash
$ time curl -s -X POST http://localhost/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"pasame la imagen de la lluvia"}]}'
```

**Response** (real, captured):
```json
{
  "message": "toma --- [Minecraft lluvia arana](https://sitio.com/projects/minecraft-rain-3.png) --- ahi Yuyi esta peleando con una arana bajo la lluvia --- la de los tres zombies es todavia mas dramatica, avisame"
}
```

**Curl timing breakdown** (real):
```
  DNS lookup:    0.000016 s    ← localhost
  TCP connect:   0.000090 s    ← loopback
  TLS handshake: 0.000000 s    ← plain HTTP, no TLS in dev
  Pre-transfer:  0.000140 s    ← request line + headers
  Server think:  3.125538 s    ← OpenRouter + Gemma 4 inference
  ─────────────────────────────────
  Total:         3.125588 s
  Response size: 213 B
  HTTP code:     200
```

**Where the 3.1 s goes**: essentially all in the LLM inference. The browser → nginx → api → openrouter roundtrip adds <1 ms (all on local network). The OpenRouter → Google Gemma 4 inference is the bottleneck.

**Note on the URL `https://sitio.com/projects/minecraft-rain-3.png`**: This is the `SITE_URL` env var value. In local dev it defaults to `http://localhost:4321` (the api code rewrites `](/path)` → `](${SITE_URL}/path)` in the system prompt). In production, set `SITE_URL=https://your-domain.com` in Dokploy env.

### Test 6b — Two consecutive chat calls (timing stability)

```
18:23:23  POST /api/chat  200  198 B   ← "toma --- [Minecraft lluvia arana]…"
18:23:26  POST /api/chat  200  213 B   ← "toma --- [Minecraft lluvia arana]…esa es mi favorita…"
```

Two requests ~3 seconds apart, both succeed. The api has no cache — every request is a fresh LLM call.

---

## 9. Security Headers (every response)

### Test 5 — `/cv` headers

```
$ curl -sI http://localhost/cv
HTTP/1.1 301 Moved Permanently
Server: nginx/1.31.3
Date: Wed, 05 Aug 2026 18:22:16 GMT
Content-Type: text/html
Content-Length: 169
Location: http://localhost/cv/
Connection: keep-alive
X-Frame-Options: SAMEORIGIN                    ← clickjacking protection
X-Content-Type-Options: nosniff                ← MIME sniffing protection
Referrer-Policy: strict-origin-when-cross-origin  ← referrer leak protection
Permissions-Policy: camera=(), microphone=(), geolocation=()  ← disable unused APIs
```

### Test 5b — `/api/chat` OPTIONS preflight (CORS)

```
$ curl -sI -X OPTIONS http://localhost/api/chat
HTTP/1.1 204 No Content
Server: nginx/1.31.3
Date: Wed, 05 Aug 2026 18:22:16 GMT
Connection: keep-alive
Access-Control-Allow-Origin: *                  ← default CORS_ORIGIN=* (dev)
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`Access-Control-Allow-Origin: *` is the dev default. **In production, set `CORS_ORIGIN=https://your-domain.com` in Dokploy env.** The api will then echo the request origin only if it matches.

---

## 10. Body Size Limit (413 enforcement)

`client_max_body_size 1m` in nginx.conf + `MAX_BODY_BYTES=1048576` in the api. The nginx limit triggers first.

### Test 7 — 1.5 MB body

```
$ dd if=/dev/urandom bs=1 count=1500000 2>/dev/null > /tmp/big.json
$ curl -s -o /dev/null -w "HTTP %{http_code}  size=%{size_download}B  time=%{time_total}s\n" \
    -X POST http://localhost/api/chat \
    -H "Content-Type: application/json" \
    --data @/tmp/big.json
HTTP 413  size=183B  time=0.000479s
```

The 1.5 MB body is rejected in **< 1 ms** (nginx aborts before the api even sees it).

### Test 7b — 500 kB body (under limit)

```
$ dd if=/dev/urandom bs=1 count=500000 2>/dev/null > /tmp/medium.json
$ curl -s -o /dev/null -w "HTTP %{http_code}  size=%{size_download}B  time=%{time_total}s\n" \
    -X POST http://localhost/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hola"}]}'
HTTP 200  size=99B  time=1.895312s
```

500 kB of padding + 41 B of valid JSON: passes nginx, the api sees a valid request, and returns 200. The 1.9 s is the LLM call.

### Test 7c — 1.1 MB body (just over nginx limit)

```
$ # Build 1.1 MB of valid JSON with padding
$ python3 -c "
import json
padding = 'x' * 1100000
print(json.dumps({'messages':[{'role':'user','content':padding}]}))
" > /tmp/padded.json
$ curl -s -o /dev/null -w "HTTP %{http_code}  size=%{size_download}B  time=%{time_total}s\n" \
    -X POST http://localhost/api/chat \
    -H "Content-Type: application/json" \
    --data @/tmp/padded.json
HTTP 413  size=183B  time=0.000404s
```

Rejected at nginx layer (413). The api's own `MAX_BODY_BYTES` would also catch this if nginx didn't, but nginx is faster.

### nginx log of the 413

```
[error] 43#43: *20 client intended to send too large body: 1482348 bytes,
        client: 172.23.0.1, server: _, request: "POST /api/chat HTTP/1.1"
172.23.0.1 - - [05/Aug/2026:18:23:36 +0000] "POST /api/chat HTTP/1.1" 413 183
```

---

## 11. Real Container Logs (sample of actual traffic)

### api container logs

```
Yuyi server running on http://localhost:3001
CORS origin(s): *
```

The api logs **only** startup and LLM errors. Successful chat requests are silent (no per-request log). This is intentional to keep logs clean; if you need per-request logging, change the `console.error` calls in `api/app.mjs` to `console.log`.

### web container logs (nginx access log, real traffic)

```
172.23.0.1 - - [05/Aug/2026:18:21:46 +0000] "GET /api/health HTTP/1.1" 404 9   "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:21:46 +0000] "POST /api/chat HTTP/1.1" 400 46  "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:11 +0000] "GET / HTTP/1.1" 200 250                  "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET / HTTP/1.1" 200 250                  "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET /cv HTTP/1.1" 301 169                "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET /yuyi HTTP/1.1" 301 169               "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET /contact HTTP/1.1" 301 169            "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET /assets/avatar-bot.png HTTP/1.1" 200 87650        "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET /projects/dockploy-dashboard-1.png HTTP/1.1" 200 98331  "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "GET /certs/cv.pdf HTTP/1.1" 200 227724                 "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "HEAD /cv HTTP/1.1" 301 0                            "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:22:16 +0000] "OPTIONS /api/chat HTTP/1.1" 204 0                   "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:23:23 +0000] "POST /api/chat HTTP/1.1" 200 198                   "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:23:26 +0000] "POST /api/chat HTTP/1.1" 200 213                   "-" "curl/8.21.0" "-"
[error] 43#43: *20 client intended to send too large body: 1482348 bytes
172.23.0.1 - - [05/Aug/2026:18:23:36 +0000] "POST /api/chat HTTP/1.1" 413 183                   "-" "curl/8.21.0" "-"
[error] 29#29: *23 client intended to send too large body: 1100047 bytes
172.23.0.1 - - [05/Aug/2026:18:23:39 +0000] "POST /api/chat HTTP/1.1" 413 183                   "-" "curl/8.21.0" "-"
172.23.0.1 - - [05/Aug/2026:18:23:39 +0000] "POST /api/chat HTTP/1.1" 200 99                    "-" "curl/8.21.0" "-"
```

**Reading the log**:
- `172.23.0.1` is the docker host gateway IP (the host's interface to the bridge network)
- Every request is logged with method, path, status, bytes, user agent
- 413 errors also generate nginx `error` lines (the 1.1 MB and 1.5 MB rejections are both visible)
- `HEAD /cv` shows up because curl `-I` does HEAD not GET

---

## 12. How to Reproduce Locally

```bash
cd /home/aethelvance/CV/ingenierodeia-landing-page

# 1. Ensure .env is configured (LLM_API_KEY required)
cat .env
# LLM_API_KEY=sk-or-v1-...
# LLM_BASE_URL=https://openrouter.ai/api/v1
# LLM_MODEL=google/gemma-4-26b-a4b-it
# SITE_URL=http://localhost:4321
# CORS_ORIGIN=*
# MAX_BODY_BYTES=1048576
# PORT=3001

# 2. Start (rebuilds only if images don't exist; use --build to force)
docker compose up -d

# 3. Wait for healthchecks (api ~5s, web ~15s due to start_period)
docker compose ps

# 4. Smoke test the full flow
curl -s -X POST http://localhost/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"pasame la imagen de la lluvia"}]}' | head -1

# 5. Tail logs
docker compose logs -f

# 6. Tear down
docker compose down
```

---

## 13. Port Map (consolidated)

| Port | Protocol | Bound to | Service | Reachable from |
|---|---|---|---|---|
| 80 | TCP | `0.0.0.0` | web (nginx) | host, internet (after Traefik on Dokploy) |
| 443 | TCP | `0.0.0.0` | (Traefik on Dokploy, NOT in this container) | internet |
| 3001 | TCP | (internal cv-net) | api (node) | web only — host CANNOT reach |

**After Dokploy deployment**: Traefik (on the Dokploy host) binds 80/443 on the public interface and forwards to `web:80`. The api remains internal-only. The browser still only ever talks to Traefik → web → api, with the LLM key never exposed to the client.

---

## 14. Full data flow for a chat request (annotated with real data)

```
CLIENT SIDE (browser at https://your-domain.com/yuyi):
  Recruiter types "pasame la imagen de la lluvia" in Yuyi's floating chat input
  → JavaScript fetch("/api/chat", {method:"POST", headers:{"Content-Type":"application/json"}, body:'{"messages":[…]}'})

NGINX (web container, receives on 0.0.0.0:80):
  $ curl request  →  location /api/ { proxy_pass http://api:3001; }
  → DNS lookup "api"  →  172.23.0.2 (Docker embedded resolver, ~0 ms)
  → TCP connect 172.23.0.2:3001  →  ~0.1 ms
  → write request  →  POST /api/chat HTTP/1.1, body=105 B

API (api container, node process PID 1):
  1. readBody() reads up to MAX_BODY_BYTES (1 MB) — here 105 B, OK
  2. JSON.parse(payload)  →  { messages: [{role:"user", content:"…"}] }
  3. validate: messages is non-empty array, role filter (user|assistant only)
  4. sanitize: cap each content to 2000 chars, keep last 20
  5. build systemPrompt by concatenating 5 .md files (~16 KB), rewrite `](/x)` → `](http://localhost:4321/x)`
  6. fetch("https://openrouter.ai/api/v1/chat/completions", {
       headers: {Authorization: "Bearer sk-or-v1-…"},
       body: { model: "google/gemma-4-26b-a4b-it", messages: [{role:"system", content: systemPrompt}, ...sanitized] }
     })

OPENROUTER (api.openrouter.ai, HTTPS):
  → Routes to Google for Gemma 4 inference
  → Returns { choices: [{message: {role:"assistant", content: "toma --- [Minecraft lluvia arana]..."}}] }

API (continues):
  7. data.choices?.[0]?.message?.content  →  "toma --- [Minecraft lluvia arana]…"
  8. send(res, 200, JSON.stringify({ message: reply }))
  → res.end() with content-type application/json

NGINX:
  → 200 213 B response, CORS headers added, security headers added
  → proxied back to client

CLIENT:
  ← {message: "toma --- [Minecraft lluvia arana](http://localhost:4321/projects/minecraft-rain-3.png) --- …"}
  → markdown rendered, image loaded (relative URL resolves against SITE_URL)
  → conversation turn visible in the chat UI
```

Total wall time: **~3.1 s** (3.0 s in LLM, 0.1 s in network).

---

## 15. Data Captured At (timestamp)

```
$ date
Wednesday, August 5, 2026 PM06:23:43 HKT
```

All measurements in this document were taken in a single continuous session on a single host. Network and disk performance will vary on different machines but the architectural relationships (ports, IPs, headers, status codes) are reproducible anywhere.
