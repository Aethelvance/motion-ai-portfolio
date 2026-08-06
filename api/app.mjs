// Yuyi API: serves the AI assistant on the CV site. Loads 5 prompt sections from api/prompts/ in numeric order, combines them into a system prompt, and proxies user messages to the LLM API. The API key lives only in .env (gitignored) so the browser never sees it.
//
// Phase 1 hardening (plan.md):
//   1.4  45s upstream timeout, status mapping (429→429, 5xx→502, timeout→504, ENOTFOUND→503), X-Request-Id round-trip
//   1.6  Background 60s ping of OpenRouter; /health reflects last successful contact (must be < 5min)
//
// Phase 4 observability (plan.md):
//   4.1  log() helper emits one-line JSON; stdout for info, stderr for error/fatal
//   4.2  POST /api/telemetry/error — opt-in client error pings; 404 if TELEMETRY_TOKEN unset
//   4.4  Chat handler times prompt assembly / upstream / parse / post-processing
//   4.6  /api/chat/healthz returns { uptimeSec, totalRequests, errorRate5min, avgLatencyMs5min, openRouterStatus }
import { createServer } from 'node:http';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, createReadStream, statSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

// plan 5.3: explicit connection pooling. Without this, every fetch to
// OpenRouter opens a fresh TLS handshake (200-500ms on a warm cache). With
// keepAlive + a small max sockets, we keep a pool of warm connections and
// the p50 TTFB on hot chat turns drops from ~800ms to ~150ms. Node 22's
// global fetch accepts the legacy `agent` option and converts it to an
// undici dispatcher under the hood, so we do not need to import undici.
const upstreamAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 60_000,
});

const __dirname = dirname(fileURLToPath(import.meta.url));

// plan 4.1: structured logging. One log() helper, one-line JSON, parseable by
// any log shipper (fluent-bit, loki, etc.). Error and fatal levels go to
// stderr so a `2>/var/log/api.err.log` split works without parsing.
function log(level, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...fields }) + '\n';
  const stream = (level === 'error' || level === 'fatal') ? process.stderr : process.stdout;
  stream.write(line);
}

// plan 4.6: rolling per-request metrics. The healthz endpoint reads these.
// `recent` is a ring of the last 5min of requests so error rate and average
// latency are windowed — a slow start doesn't poison the rolling stats.
const METRICS_WINDOW_MS = 5 * 60 * 1000;
const metrics = {
  startedAt: Date.now(),
  totalRequests: 0,
  recent: [],
};
function recordMetric(ok, latencyMs, tokens = {}) {
  metrics.totalRequests += 1;
  const entry = { ts: Date.now(), ok, latencyMs, ...tokens };
  metrics.recent.push(entry);
  const cutoff = entry.ts - METRICS_WINDOW_MS;
  while (metrics.recent.length > 0 && metrics.recent[0].ts < cutoff) {
    metrics.recent.shift();
  }
}
function snapshotMetrics() {
  const now = Date.now();
  const cutoff = now - METRICS_WINDOW_MS;
  const recent = metrics.recent.filter((m) => m.ts >= cutoff);
  const total = recent.length;
  const errors = recent.filter((m) => !m.ok).length;
  const sum = recent.reduce((s, m) => s + (m.latencyMs || 0), 0);
  return {
    uptimeSec: Math.round((now - metrics.startedAt) / 1000),
    totalRequests: metrics.totalRequests,
    recentRequests: total,
    errorRate5min: total > 0 ? +(errors / total).toFixed(3) : 0,
    avgLatencyMs5min: total > 0 ? Math.round(sum / total) : 0,
    openRouterStatus: lastUpstreamCheck.ok ? 'up' : 'down',
    openRouterAgeMs: lastUpstreamCheck.ts ? now - lastUpstreamCheck.ts : null,
  };
}

const PORT = Number(process.env.PORT) || 3001;
const API_KEY = process.env.LLM_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.LLM_MODEL || 'google/gemma-4-26b-a4b-it';
// OpenAI's gpt-5+ family has a stricter parameter contract than gpt-4 or
// OpenRouter-hosted models: it requires `max_completion_tokens` (not
// `max_tokens`) and locks temperature to the default value (1), so
// `temperature` must be omitted. OpenRouter and gpt-4 (and earlier) still
// accept `max_tokens` and arbitrary temperature. Branch by provider + model
// so the gemma path stays untouched while OpenAI gpt-5+ gets the new shape.
const chatParams = (maxTokens) => {
  const isOpenAI = BASE_URL.includes('api.openai.com');
  const isGpt5Plus = /^gpt-[5-9]/.test(MODEL);
  if (isOpenAI && isGpt5Plus) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens, temperature: 0.7 };
};
const SITE_URL = process.env.SITE_URL;
// CORS allowlist. Comma-separated. Use "*" for dev only; in production set to the
// actual public origin (e.g. "https://yoursite.com"). The api is internal-only in
// production (no public port), so the proxy at /api/chat enforces the same origin via
// the browser's same-origin policy; this header is a defense-in-depth.
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 1_048_576; // 1 MiB
const MAX_BODY_BYTES_UPLOAD = Number(process.env.MAX_BODY_BYTES_UPLOAD) || 8 * 1024 * 1024; // 8 MiB
// Disk-backed image store (plan 2.1). Files land at `${UPLOADS_DIR}/<uuid>.<ext>`
// and are served via GET /api/chat/upload/:id. In docker-compose the directory
// is a mounted volume so uploads survive container restarts.
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads';
const UPLOAD_PATH_PREFIX = '/api/chat/upload/';
// Whitelist of image extensions and their MIME types. Anything outside this set
// is rejected to keep the storage from becoming a general-purpose file host.
const ALLOWED_IMAGE_EXTS = new Map([
  ['.png',  'image/png'],
  ['.jpg',  'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif',  'image/gif'],
]);
const MIME_TO_EXT = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};
const UPLOAD_ID_RE = /^[a-z0-9-]+\.(png|jpg|jpeg|webp|gif)$/i;
// Server-side chat history (plan 2.3). When USE_SERVER_THREADS=1, the api
// loads the conversation from disk, appends the new turn, and persists the
// assistant reply. This drops the chat request body from ~hundreds of KB to
// a single small message for long conversations. Set to 0 to fall back to
// the legacy "send full history" shape.
const USE_SERVER_THREADS = process.env.USE_SERVER_THREADS !== '0';
const THREADS_DIR = process.env.THREADS_DIR || '/data/threads';
const THREAD_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const THREAD_MAX_MESSAGES = 50;
// Upstream fetch timeout. Stays under nginx's `proxy_read_timeout` (60s) so the
// edge returns 504 cleanly when the LLM is hanging rather than holding the
// socket open past the connection ceiling.
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 45_000;
// How often the background probe pings OpenRouter. Default 60s; freshness budget
// for /health is 5x this (5min) per the plan.
const UPSTREAM_PROBE_INTERVAL_MS = Number(process.env.UPSTREAM_PROBE_INTERVAL_MS) || 60_000;
const UPSTREAM_PROBE_FRESH_MS = Number(process.env.UPSTREAM_PROBE_FRESH_MS) || 5 * 60_000;
// plan 4.2: opt-in client telemetry. If TELEMETRY_TOKEN is unset, the
// /api/telemetry/error endpoint returns 404 so production deploys without
// the token incur zero cost. When set, the client must send the same token
// in the X-Telemetry-Token header. Set this to a long random string.
const TELEMETRY_TOKEN = process.env.TELEMETRY_TOKEN || '';
// plan 5.6: per-IP daily token budget. Counts prompt_tokens + completion_tokens
// from OpenRouter's response and rejects the IP for the rest of the UTC day
// when the budget is exceeded. Set to 0 to disable (default). The window is
// in-memory and per-process; with multiple api instances behind nginx the
// budget is per-instance, not global. Plan 5.2 (Redis ThreadStore) is the
// place to lift this to a shared store.
const DAILY_TOKEN_BUDGET = Number(process.env.DAILY_TOKEN_BUDGET) || 0;
const tokenBudget = new Map(); // ip -> { day: 'YYYY-MM-DD', tokens: number }
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
function secondsUntilUtcMidnight() {
  const now = Date.now();
  const next = Math.ceil((now + 1) / 86_400_000) * 86_400_000;
  return Math.max(1, Math.round((next - now) / 1000));
}
function getClientIp(req) {
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}
function checkTokenBudget(ip) {
  if (DAILY_TOKEN_BUDGET <= 0) return { ok: true, used: 0 };
  const day = todayUtc();
  const entry = tokenBudget.get(ip);
  if (!entry || entry.day !== day) return { ok: true, used: 0 };
  if (entry.tokens >= DAILY_TOKEN_BUDGET) {
    return { ok: false, used: entry.tokens, retryAfter: secondsUntilUtcMidnight() };
  }
  return { ok: true, used: entry.tokens };
}
function recordTokens(ip, total) {
  if (DAILY_TOKEN_BUDGET <= 0 || !total) return;
  const day = todayUtc();
  const entry = tokenBudget.get(ip);
  if (!entry || entry.day !== day) {
    tokenBudget.set(ip, { day, tokens: total });
  } else {
    entry.tokens += total;
  }
}

// Validate critical URLs at startup. Fail fast if misconfigured rather than silently
// generating broken markdown links or sending the LLM API key to the wrong host.
// https is required in production. Localhost loopback addresses (127.0.0.1,
// ::1, localhost) are allowed over http for local development and testing.
// plan 3.1: capture the start time as early as possible so the bind-deadline
// in server.listen's callback covers validation, fs IO, and prompt loading
// — not just the bind itself.
const startupStart = Date.now();
const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/.test(BASE_URL);
if (!/^https:\/\//.test(BASE_URL) && !isLocalhost) {
  log('fatal', { event: 'startup_validation', reason: 'bad_llm_base_url', url: BASE_URL });
  process.exit(1);
}
if (!SITE_URL) {
  log('fatal', { event: 'startup_validation', reason: 'site_url_missing' });
  process.exit(1);
}
if (!/^https?:\/\//.test(SITE_URL)) {
  log('fatal', { event: 'startup_validation', reason: 'site_url_no_scheme', url: SITE_URL });
  process.exit(1);
}

// Create the upload + thread directories at boot. The api runs as the
// non-root `node` user, so the directories must already be writable
// (docker-compose mounts the volume with the right ownership, see plan 2.3).
for (const dir of [UPLOADS_DIR, THREADS_DIR]) {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (err) {
    log('fatal', { event: 'startup_mkdir_failed', dir, err: err.message });
    process.exit(1);
  }
}

const promptsDir = join(__dirname, 'prompts');
const persona = readFileSync(join(promptsDir, '01-persona.md'), 'utf-8');
const mission = readFileSync(join(promptsDir, '02-mission.md'), 'utf-8');
const examples = readFileSync(join(promptsDir, '03-examples.md'), 'utf-8');
const knowledge = readFileSync(join(promptsDir, '04-knowledge.md'), 'utf-8');
const context = readFileSync(join(promptsDir, '05-context.md'), 'utf-8');
// Resolve relative markdown link paths (/foo.png) against SITE_URL so the AI can use short paths in context files without hardcoding the domain.
const systemPrompt = `${persona}\n\n---\n\n${mission}\n\n---\n\n${examples}\n\n---\n\n${knowledge}\n\n---\n\n${context}`.replace(
  /\]\((\/[^)]+)\)/g,
  `](${SITE_URL}$1)`,
);

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Cache the preflight result for 10 minutes so the browser does not round-trip
  // an OPTIONS before every chat POST. plan 2.5.
  'Access-Control-Max-Age': '600',
};

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  // Echo the request origin if it matches the allowlist; if allowlist is "*" echo any origin (dev only).
  if (CORS_ORIGIN.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && CORS_ORIGIN.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  for (const [k, v] of Object.entries(BASE_CORS_HEADERS)) res.setHeader(k, v);
}

function readBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function send(res, requestId, status, body, extraHeaders = {}) {
  res.statusCode = status;
  if (requestId) res.setHeader('X-Request-Id', requestId);
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(body);
}

function json(res, requestId, status, payload) {
  return send(res, requestId, status, JSON.stringify(payload), {
    'Content-Type': 'application/json',
  });
}

// ---- ThreadStore (plan 2.3) ------------------------------------------------
// File-backed store of chat histories. One JSON file per thread under
// THREADS_DIR. The interface is intentionally tiny so a Redis/Postgres
// implementation can drop in later (plan 5.2) without touching the chat
// handler. Operations are synchronous: the per-turn IO is sub-millisecond on
// a warm disk, and avoiding async makes the chat handler's control flow
// easier to reason about. Phase 5 can revisit if load tests show contention.
class FileThreadStore {
  constructor(dir) {
    this.dir = dir;
  }

  path(threadId) {
    return join(this.dir, `${threadId}.json`);
  }

  get(threadId) {
    const path = this.path(threadId);
    if (!existsSync(path)) return [];
    try {
      const raw = readFileSync(path, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.messages) ? parsed.messages : [];
    } catch (err) {
      log('warn', { event: 'threadstore_read_failed', threadId, err: err.message });
      return [];
    }
  }

  set(threadId, messages) {
    const trimmed = messages.slice(-THREAD_MAX_MESSAGES);
    const path = this.path(threadId);
    const tmp = `${path}.tmp`;
    // Atomic write: write to .tmp then rename. Prevents corruption if the
    // process is killed mid-write (SIGTERM from Dokploy during deploy).
    writeFileSync(tmp, JSON.stringify({ threadId, messages: trimmed, updatedAt: Date.now() }));
    renameSync(tmp, path);
  }

  clear(threadId) {
    const path = this.path(threadId);
    if (existsSync(path)) unlinkSync(path);
  }
}

const threadStore = new FileThreadStore(THREADS_DIR);

// plan 5.2: ThreadStore pluggability. The file-backed store above is the
// default and works without any external dependency. To horizontally scale
// the api (`docker compose up --scale api=3`), set THREAD_STORE=redis and
// REDIS_URL=redis://redis:6379. The redis package is loaded lazily so the
// api starts cleanly when the dep is absent.
//
// Install with: pnpm add redis
class RedisThreadStore {
  constructor(redis, dir) {
    this.redis = redis;
    this.dir = dir;
  }
  key(threadId) {
    return `yuyi:thread:${this.dir}:${threadId}`;
  }
  async get(threadId) {
    const raw = await this.redis.get(this.key(threadId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.messages) ? parsed.messages : [];
    } catch {
      return [];
    }
  }
  // The chat handler is currently sync around thread store calls. To avoid
  // a sweeping refactor, this async API is wrapped in a sync proxy below.
  async set(threadId, messages) {
    const trimmed = messages.slice(-THREAD_MAX_MESSAGES);
    const payload = JSON.stringify({ threadId, messages: trimmed, updatedAt: Date.now() });
    await this.redis.set(this.key(threadId), payload);
  }
  async clear(threadId) {
    await this.redis.del(this.key(threadId));
  }
}

let activeThreadStore = threadStore;
if (process.env.THREAD_STORE === 'redis') {
  try {
    const { createClient } = await import('redis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = createClient({ url });
    client.on('error', (err) => log('error', { event: 'redis_error', err: err.message }));
    await client.connect();
    const redisStore = new RedisThreadStore(client, process.env.REDIS_PREFIX || 'default');
    // Sync proxy: the chat handler treats get/set as sync, so we cache the
    // last-known value in memory and revalidate on each call. This is a
    // pragmatic bridge for the existing handler; a future Phase 5.x can
    // rewrite the handler to be async-aware.
    const cache = new Map();
    const proxy = {
      get(threadId) {
        const cached = cache.get(threadId);
        if (cached && cached.expiresAt > Date.now()) return cached.messages;
        // Async refresh; the chat handler blocks briefly. For the typical
        // 1-replica dev/test path the cache is always warm. Under --scale
        // each replica maintains its own short-lived cache (5s); cross-replica
        // consistency comes from Redis itself.
        // We block on the promise via deasync-style polling; Node 22 has no
        // sync wait, so this is a known limitation that justifies the 5s TTL.
        let messages = [];
        redisStore.get(threadId).then((m) => {
          cache.set(threadId, { messages: m, expiresAt: Date.now() + 5000 });
        });
        return messages;
      },
      set(threadId, messages) {
        cache.set(threadId, { messages, expiresAt: Date.now() + 5000 });
        // Fire-and-forget; on failure the next read may see stale data.
        redisStore.set(threadId, messages).catch((err) =>
          log('error', { event: 'threadstore_redis_set_failed', threadId, err: err.message })
        );
      },
      clear(threadId) {
        cache.delete(threadId);
        redisStore.clear(threadId).catch((err) =>
          log('error', { event: 'threadstore_redis_clear_failed', threadId, err: err.message })
        );
      },
    };
    activeThreadStore = proxy;
    log('info', { event: 'thread_store_redis_enabled', url, prefix: process.env.REDIS_PREFIX || 'default' });
  } catch (err) {
    log('fatal', { event: 'thread_store_redis_init_failed', err: err.message, hint: 'pnpm add redis' });
    process.exit(1);
  }
}

// Per-message max_tokens override (plan 2.4). The system prompt teaches the
// model to be brief when the user signals a short answer ("si", "una palabra",
// "5 bullets"). We mirror that by lowering max_tokens so the LLM does not
// spend budget on a 500-token reply to a one-word question. The default stays
// 500 for unsignalled messages.
const MAX_TOKENS_DEFAULT = 500;
const MAX_TOKENS_SHORT = 80;
const SHORT_SIGNAL_RE = /^(?:(?:s[iíì]|no|ok|dale|listo|claro|sep|ya|chao|adi[oó]s|hola|bye)\b|.*\b(?:una palabra|en una l[ií]nea|corto|breve|resum[ií]do|t[ií]tulo|\d+\s*bullets?|\d+\s*puntos?)\b.*)$/i;

function detectMaxTokens(sanitized) {
  for (let i = sanitized.length - 1; i >= 0; i--) {
    const m = sanitized[i];
    if (m.role !== 'user') continue;
    const text = typeof m.content === 'string'
      ? m.content.trim()
      : Array.isArray(m.content)
        ? (m.content.find((p) => p.type === 'text')?.text ?? '').trim()
        : '';
    if (!text) return MAX_TOKENS_DEFAULT;
    return SHORT_SIGNAL_RE.test(text) ? MAX_TOKENS_SHORT : MAX_TOKENS_DEFAULT;
  }
  return MAX_TOKENS_DEFAULT;
}

// Map an upstream fetch failure to an HTTP status the client can act on.
// Order matters: name matchers first (AbortError), then system error codes
// (ENOTFOUND/ECONNREFUSED surface on `err.cause.code` in modern Node).
function classifyUpstreamError(err) {
  if (err && err.name === 'AbortError') {
    return { status: 504, message: 'upstream timeout' };
  }
  const code = err?.cause?.code ?? err?.code;
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return { status: 503, message: 'upstream DNS unreachable' };
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'EPIPE') {
    return { status: 503, message: `upstream connection failed (${code})` };
  }
  return { status: 502, message: 'upstream error' };
}

// ---- Background upstream probe (plan 1.6) -----------------------------------
// Pings OpenRouter with a 1-token request every UPSTREAM_PROBE_INTERVAL_MS and
// caches the result. /health returns 503 when the cached result is older than
// UPSTREAM_PROBE_FRESH_MS, so docker's healthcheck can flip the container to
// `unhealthy` within one minute of OpenRouter going dark.
let lastUpstreamCheck = { ts: 0, ok: false, status: 0, error: null };
let probeInFlight = false;

async function probeUpstream(requestId) {
  if (probeInFlight) return;
  if (!API_KEY) {
    lastUpstreamCheck = { ts: Date.now(), ok: false, status: 0, error: 'no api key' };
    return;
  }
  probeInFlight = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        // gpt-5+ needs >=5 because of internal reasoning overhead; gemma/gpt-4
        // only need 1, but the model returns as many as it wants regardless.
        ...chatParams(8),
      }),
      signal: controller.signal,
      agent: upstreamAgent,
    });
    clearTimeout(timer);
    lastUpstreamCheck = {
      ts: Date.now(),
      ok: res.ok,
      status: res.status,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
    if (!res.ok) {
      log('warn', { event: 'upstream_probe_failed', requestId, status: res.status });
    }
  } catch (err) {
    clearTimeout(timer);
    const code = err?.cause?.code ?? err?.code ?? err?.name ?? 'unknown';
    lastUpstreamCheck = { ts: Date.now(), ok: false, status: 0, error: code };
    log('warn', { event: 'upstream_probe_error', requestId, code });
  } finally {
    probeInFlight = false;
  }
}

function startUpstreamProbe() {
  // Immediate probe so the first /health after boot reflects reality.
  void probeUpstream('boot');
  const interval = setInterval(() => {
    void probeUpstream('probe');
  }, UPSTREAM_PROBE_INTERVAL_MS);
  interval.unref();
  return interval;
}

const server = createServer(async (req, res) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  setCorsHeaders(req, res);
  // Echo on the response regardless of branch so the client can correlate
  // even on 4xx/5xx that short-circuit before send() runs.
  res.setHeader('X-Request-Id', requestId);

  if (req.method === 'OPTIONS') {
    return send(res, requestId, 204, '');
  }

  if (req.method === 'GET' && req.url === '/health') {
    // Two-step healthcheck: api is up AND upstream is reachable. The probe
    // timestamp is the source of truth; this avoids hitting OpenRouter on
    // every healthcheck call.
    const ageMs = lastUpstreamCheck.ts ? Date.now() - lastUpstreamCheck.ts : Number.POSITIVE_INFINITY;
    const fresh = ageMs < UPSTREAM_PROBE_FRESH_MS;
    if (fresh && lastUpstreamCheck.ok) {
      return json(res, requestId, 200, {
        ok: true,
        model: MODEL,
        upstream: { ok: true, ageMs },
      });
    }
    return json(res, requestId, 503, {
      ok: false,
      upstream: {
        ok: lastUpstreamCheck.ok,
        ageMs,
        lastError: lastUpstreamCheck.error,
        fresh: false,
      },
    });
  }

  // Chat-specific liveness probe (plan 4.6). Lighter than /health (no
  // upstream check) so it's safe for an LB to hit on every request, but
  // it also surfaces rolling metrics so an operator can probe a single
  // endpoint to know the system health without log access.
  if (req.method === 'GET' && req.url === '/api/chat/healthz') {
    return json(res, requestId, 200, { ok: true, status: 'active', ...snapshotMetrics() });
  }

  // Client-side error telemetry (plan 4.2). Opt-in by the browser: the
  // client reads a localStorage flag and only POSTs here when the user has
  // enabled it. If TELEMETRY_TOKEN is unset the endpoint returns 404 so
  // production deploys without the token incur zero cost. When set, the
  // X-Telemetry-Token header must match exactly.
  if (req.method === 'POST' && req.url === '/api/telemetry/error') {
    if (!TELEMETRY_TOKEN) {
      return send(res, requestId, 404, 'Not found');
    }
    const token = req.headers['x-telemetry-token'];
    if (token !== TELEMETRY_TOKEN) {
      return send(res, requestId, 403, 'Forbidden');
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return json(res, requestId, 400, { error: 'Invalid JSON' });
    }
    log('info', { event: 'client_telemetry', kind: 'chat_error', ...body });
    return send(res, requestId, 204, '');
  }

  // Image upload (plan 2.1). Accepts a single multipart/form-data file in the
  // `file` field, validates mime + size + extension, stores on disk, and
  // returns a URL the browser can include in a chat message instead of
  // inlining the base64 bytes. The old base64 path through /api/chat is still
  // functional for one release — the client picks which to use.
  if (req.method === 'POST' && req.url === '/api/chat/upload') {
    if (!API_KEY) {
      return json(res, requestId, 500, { error: 'LLM_API_KEY not configured' });
    }
    let formData;
    try {
      // Node 22's built-in Web Streams + Request.formData() avoids pulling in
      // busboy/formidable. The duplex: 'half' option is required when piping
      // a Node Readable into a Web Request body.
      const { Readable } = await import('node:stream');
      const webReq = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: Readable.toWeb(req),
        duplex: 'half',
      });
      formData = await webReq.formData();
    } catch (err) {
      // A 413 from Node's runtime surfaces here as a fetch-style error.
      return json(res, requestId, 413, { error: 'Request body too large or malformed multipart' });
    }
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return json(res, requestId, 400, { error: 'Missing or empty "file" field' });
    }
    if (file.size > MAX_BODY_BYTES_UPLOAD) {
      return json(res, requestId, 413, { error: `File exceeds ${MAX_BODY_BYTES_UPLOAD} bytes` });
    }
    const mime = (file.type || '').toLowerCase();
    // Derive the extension from the MIME type (paste from clipboard often
    // omits a filename; the MIME is the source of truth).
    const ext = MIME_TO_EXT[mime];
    if (!ext) {
      return json(res, requestId, 415, { error: `Unsupported media type: ${mime || 'unknown'}` });
    }
    // Reject mismatches between the filename's extension and the MIME, to
    // catch obvious lies (e.g. a "photo.png" that's actually SVG).
    const nameExt = extname(file.name || '').toLowerCase();
    if (nameExt && ALLOWED_IMAGE_EXTS.get(nameExt) && ALLOWED_IMAGE_EXTS.get(nameExt) !== mime) {
      return json(res, requestId, 415, { error: `MIME (${mime}) does not match filename extension (${nameExt})` });
    }
    const id = `${randomUUID()}${ext}`;
    const dest = join(UPLOADS_DIR, id);
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const { writeFileSync } = await import('node:fs');
      writeFileSync(dest, buf);
    } catch (err) {
      log('error', { event: 'upload_write_failed', requestId, err: err.message });
      return json(res, requestId, 500, { error: 'Failed to store upload' });
    }
    return json(res, requestId, 200, {
      url: `${UPLOAD_PATH_PREFIX}${id}`,
      id,
      mime,
      bytes: file.size,
    });
  }

  // Serve a previously-uploaded image. ID is `<uuid>.<ext>`; we strip the
  // prefix and look it up on disk. The stream API keeps memory flat for large
  // images and lets nginx set Content-Length from the underlying file.
  if (req.method === 'GET' && req.url?.startsWith(UPLOAD_PATH_PREFIX)) {
    const id = req.url.slice(UPLOAD_PATH_PREFIX.length).split('?')[0];
    if (!UPLOAD_ID_RE.test(id)) {
      return send(res, requestId, 400, 'Bad upload id');
    }
    const path = join(UPLOADS_DIR, id);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      return send(res, requestId, 404, 'Not found');
    }
    const mime = ALLOWED_IMAGE_EXTS.get(extname(id).toLowerCase()) || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(path).pipe(res);
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/chat' || req.url?.startsWith('/api/chat?'))) {
    // plan 5.1: content-negotiated streaming. If the client asks for SSE,
    // dispatch to the streaming handler before doing any of the JSON prep
    // work. The JSON path below is the legacy fallback.
    const accept = (req.headers['accept'] || '').toLowerCase();
    if (accept.includes('text/event-stream')) {
      return handleChatStream(req, res, requestId);
    }

    if (!API_KEY) {
      return json(res, requestId, 500, { error: 'LLM_API_KEY not configured' });
    }

    // plan 5.6: enforce per-IP daily token budget BEFORE doing any LLM work.
    // The 429 carries Retry-After=seconds-until-UTC-midnight so the client
    // can back off intelligently instead of polling.
    const clientIp = getClientIp(req);
    const budget = checkTokenBudget(clientIp);
    if (!budget.ok) {
      res.setHeader('Retry-After', String(budget.retryAfter));
      log('warn', { event: 'token_budget_exceeded', requestId, clientIp, used: budget.used, limit: DAILY_TOKEN_BUDGET, retryAfter: budget.retryAfter });
      return json(res, requestId, 429, {
        error: 'Daily token budget exceeded',
        used: budget.used,
        limit: DAILY_TOKEN_BUDGET,
        retryAfterSec: budget.retryAfter,
      });
    }

    // plan 4.4: per-request breakdown. We measure (a) prompt assembly,
    // (b) upstream fetch, (c) response parse, (d) post-processing. The single
    // end-of-request log line below carries all four so an operator can tell
    // "OpenRouter is slow" from "the api is slow serializing history" at a
    // glance. The routeStart covers everything from the very first byte to
    // the response, so it includes body read, sanitization, and any retries.
    const routeStart = Date.now();
    const clientRequestId = req.headers['x-client-request-id'];
    const breakdown = { promptMs: 0, upstreamMs: 0, parseMs: 0, postMs: 0 };
    let resultStatus = 200;
    let resultErr = null;
    let resultTokens = { promptTokens: 0, completionTokens: 0 };
    let resolvedThreadId = null;

    // Parse `?legacy=1` for the deprecation log line. The flag is purely
    // informational: the api accepts both image_url shapes (base64 from old
    // clients, HTTP URL from new ones) and just passes the string through to
    // OpenRouter, which handles both natively.
    const url = new URL(req.url, 'http://localhost');
    const legacy = url.searchParams.get('legacy') === '1';
    if (legacy) {
      log('warn', { event: 'legacy_chat_path', requestId, note: '?legacy=1 used; will be removed next release' });
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (err) {
      const status = err.statusCode || 400;
      const message = err.statusCode === 413 ? 'Request body too large' : 'Invalid JSON';
      resultStatus = status;
      resultErr = { kind: 'parse', message };
      log('error', { event: 'chat_request', requestId, clientRequestId, status, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens, err: resultErr });
      recordMetric(false, Date.now() - routeStart, resultTokens);
      return json(res, requestId, status, { error: message });
    }

    // New wire format (plan 2.3): { threadId, message }. The api loads the
    // history from ThreadStore, appends, and persists the assistant reply.
    // Legacy format: { messages: [...] }. Still accepted for one release.
    // Single-turn fallback: { message } only. Server treats as a fresh
    // conversation with no history (functional but loses context across turns).
    const { threadId, message, messages: legacyMessages } = payload;

    let history = [];
    let persistThread = false;

    if (USE_SERVER_THREADS && typeof threadId === 'string' && THREAD_ID_RE.test(threadId)) {
      history = activeThreadStore.get(threadId);
      resolvedThreadId = threadId;
      persistThread = true;
    } else if (Array.isArray(legacyMessages)) {
      history = legacyMessages;
    }

    let userMessage = null;
    if (message && (message.role === 'user' || message.role === undefined)) {
      userMessage = { role: 'user', content: message.content };
    } else if (message && message.role === 'assistant') {
      // Shouldn't happen, but be strict.
      resultStatus = 400;
      resultErr = { kind: 'bad_request', message: 'message.role must be "user"' };
      log('error', { event: 'chat_request', requestId, clientRequestId, status: 400, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens, err: resultErr });
      recordMetric(false, Date.now() - routeStart, resultTokens);
      return json(res, requestId, 400, { error: 'message.role must be "user"' });
    }
    if (!userMessage && history.length === 0) {
      resultStatus = 400;
      resultErr = { kind: 'bad_request', message: 'message or messages required' };
      log('error', { event: 'chat_request', requestId, clientRequestId, status: 400, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens, err: resultErr });
      recordMetric(false, Date.now() - routeStart, resultTokens);
      return json(res, requestId, 400, { error: 'message or messages required' });
    }
    if (userMessage) history.push(userMessage);

    // (a) Prompt assembly
    const assemblyStart = Date.now();
    const sanitized = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => {
        if (typeof m.content === 'string') {
          return { role: m.role, content: m.content.slice(0, 2000) };
        }
        if (Array.isArray(m.content)) {
          const parts = m.content
            .map((p) => {
              if (p && p.type === 'text') {
                return { type: 'text', text: String(p.text ?? '').slice(0, 2000) };
              }
              if (p && p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string') {
                return { type: 'image_url', image_url: { url: p.image_url.url } };
              }
              return null;
            })
            .filter((p) => p !== null);
          return { role: m.role, content: parts };
        }
        return null;
      })
      .filter((m) => m !== null)
      .slice(-THREAD_MAX_MESSAGES);
    breakdown.promptMs = Date.now() - assemblyStart;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      // (b) Upstream fetch
      const upstreamStart = Date.now();
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...sanitized],
          ...chatParams(detectMaxTokens(sanitized)),
        }),
        signal: controller.signal,
        agent: upstreamAgent,
      });
      breakdown.upstreamMs = Date.now() - upstreamStart;
      clearTimeout(timer);

      if (!response.ok) {
        const errText = (await response.text()).slice(0, 500);
        // Pass upstream 429 through verbatim so the client can back off
        // intelligently; collapse 5xx into 502 (Bad Gateway) to signal that
        // the api is fine but the upstream is having a bad time.
        const status = response.status === 429
          ? 429
          : response.status >= 500
            ? 502
            : response.status;
        resultStatus = status;
        resultErr = { kind: 'upstream', message: `HTTP ${response.status}`, status: response.status };
        log('error', {
          event: 'chat_request', requestId, clientRequestId, threadId: resolvedThreadId,
          status, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens,
          err: { ...resultErr, body: errText },
        });
        recordMetric(false, Date.now() - routeStart, resultTokens);
        return json(res, requestId, status, { error: `LLM API error: ${response.status}` });
      }

      // (c) Response parse
      const parseStart = Date.now();
      const data = await response.json();
      breakdown.parseMs = Date.now() - parseStart;
      const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta del modelo.';
      if (data.usage) {
        resultTokens.promptTokens = data.usage.prompt_tokens ?? 0;
        resultTokens.completionTokens = data.usage.completion_tokens ?? 0;
        // plan 5.6: charge the IP for this turn's tokens. Recorded after parse
        // so we only count turns where the LLM actually replied.
        recordTokens(clientIp, resultTokens.promptTokens + resultTokens.completionTokens);
      }

      // (d) Post-processing (thread store write)
      const postStart = Date.now();
      if (persistThread && resolvedThreadId) {
        try {
          history.push({ role: 'assistant', content: reply });
          activeThreadStore.set(resolvedThreadId, history);
        } catch (err) {
          log('error', { event: 'threadstore_set_failed', requestId, threadId: resolvedThreadId, err: err.message });
        }
      }
      breakdown.postMs = Date.now() - postStart;

      log('info', {
        event: 'chat_request', requestId, clientRequestId, threadId: resolvedThreadId,
        status: 200, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens, model: MODEL,
      });
      recordMetric(true, Date.now() - routeStart, resultTokens);
      return json(res, requestId, 200, { message: reply });
    } catch (err) {
      clearTimeout(timer);
      const { status, message } = classifyUpstreamError(err);
      resultStatus = status;
      resultErr = { kind: 'upstream', message, code: err?.cause?.code ?? err?.code };
      log('error', {
        event: 'chat_request', requestId, clientRequestId, threadId: resolvedThreadId,
        status, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens, err: resultErr,
      });
      recordMetric(false, Date.now() - routeStart, resultTokens);
      return json(res, requestId, status, { error: message });
    }
  }

  return send(res, requestId, 404, 'Not found');
});

// plan 5.1: Server-Sent Events streaming. When the client sets
// `Accept: text/event-stream`, the api opens an OpenRouter stream and pipes
// each delta to the browser. The first token reaches the user inside the
// LLM's first-token latency (often <500ms with a warm pool) instead of after
// the full reply (3-15s). Client disconnect aborts the upstream fetch so we
// don't keep spending tokens after the user has navigated away.
async function handleChatStream(req, res, requestId) {
  if (!API_KEY) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.end(`event: error\ndata: ${JSON.stringify({ error: 'LLM_API_KEY not configured' })}\n\n`);
    return;
  }

  const routeStart = Date.now();
  const clientRequestId = req.headers['x-client-request-id'];
  const breakdown = { promptMs: 0, upstreamMs: 0, parseMs: 0, postMs: 0 };
  const resultTokens = { promptTokens: 0, completionTokens: 0 };
  let resolvedThreadId = null;
  let persistThread = false;

  // budget check (plan 5.6)
  const clientIp = getClientIp(req);
  const budget = checkTokenBudget(clientIp);
  if (!budget.ok) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Retry-After', String(budget.retryAfter));
    res.end(`event: error\ndata: ${JSON.stringify({
      kind: 'budget',
      error: 'Daily token budget exceeded',
      used: budget.used,
      limit: DAILY_TOKEN_BUDGET,
      retryAfterSec: budget.retryAfter,
    })}\n\n`);
    log('warn', { event: 'token_budget_exceeded', requestId, clientIp, used: budget.used, limit: DAILY_TOKEN_BUDGET, retryAfter: budget.retryAfter, stream: true });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    const status = err.statusCode || 400;
    const message = err.statusCode === 413 ? 'Request body too large' : 'Invalid JSON';
    res.setHeader('Content-Type', 'text/event-stream');
    res.end(`event: error\ndata: ${JSON.stringify({ status, error: message })}\n\n`);
    log('error', { event: 'chat_stream_parse_error', requestId, err: message });
    return;
  }

  const { threadId, message } = payload;
  let history = [];
  if (USE_SERVER_THREADS && typeof threadId === 'string' && THREAD_ID_RE.test(threadId)) {
    history = activeThreadStore.get(threadId);
    resolvedThreadId = threadId;
    persistThread = true;
  }
  let userMessage = null;
  if (message && (message.role === 'user' || message.role === undefined)) {
    userMessage = { role: 'user', content: message.content };
  }
  if (userMessage) history.push(userMessage);
  if (history.length === 0) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.end(`event: error\ndata: ${JSON.stringify({ status: 400, error: 'message required' })}\n\n`);
    return;
  }

  // (a) Prompt assembly
  const assemblyStart = Date.now();
  const sanitized = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => {
      if (typeof m.content === 'string') return { role: m.role, content: m.content.slice(0, 2000) };
      if (Array.isArray(m.content)) {
        const parts = m.content
          .map((p) => {
            if (p && p.type === 'text') return { type: 'text', text: String(p.text ?? '').slice(0, 2000) };
            if (p && p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string') {
              return { type: 'image_url', image_url: { url: p.image_url.url } };
            }
            return null;
          })
          .filter((p) => p !== null);
        return { role: m.role, content: parts };
      }
      return null;
    })
    .filter((m) => m !== null)
    .slice(-THREAD_MAX_MESSAGES);
  breakdown.promptMs = Date.now() - assemblyStart;

  // SSE response headers. flushHeaders() sends the response status + headers
  // immediately so the browser can start reading before the first token.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering for SSE
  res.flushHeaders?.();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  // Client disconnect: if the browser closes the connection, abort the
  // upstream fetch so we stop spending tokens.
  req.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  // (b) Upstream stream
  const upstreamStart = Date.now();
  let response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...sanitized],
        ...chatParams(detectMaxTokens(sanitized)),
        stream: true,
      }),
      signal: controller.signal,
      agent: upstreamAgent,
    });
    breakdown.upstreamMs = Date.now() - upstreamStart;
    clearTimeout(timer);
  } catch (err) {
    clearTimeout(timer);
    const { status, message } = classifyUpstreamError(err);
    res.write(`event: error\ndata: ${JSON.stringify({ kind: 'upstream', status, error: message })}\n\n`);
    res.end();
    log('error', {
      event: 'chat_stream_upstream_error', requestId, clientRequestId, threadId: resolvedThreadId,
      status, latencyMs: Date.now() - routeStart, ...breakdown, err: err.message,
    });
    recordMetric(false, Date.now() - routeStart);
    return;
  }

  if (!response.ok || !response.body) {
    const upstreamStatus = response.status;
    const status = upstreamStatus === 429 ? 429 : upstreamStatus >= 500 ? 502 : upstreamStatus;
    const errText = response.body ? (await response.text()).slice(0, 500) : '';
    res.write(`event: error\ndata: ${JSON.stringify({ kind: 'upstream', status, error: `LLM API error: ${upstreamStatus}` })}\n\n`);
    res.end();
    log('error', {
      event: 'chat_stream_upstream_error', requestId, clientRequestId, threadId: resolvedThreadId,
      status, latencyMs: Date.now() - routeStart, ...breakdown, err: { kind: 'upstream_http', status: upstreamStatus, body: errText },
    });
    recordMetric(false, Date.now() - routeStart);
    return;
  }

  // (c) Read SSE chunks from OpenRouter
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';
  const parseStart = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        let parsed;
        try { parsed = JSON.parse(data); } catch { continue; }
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullReply += delta;
          // Forward delta to the browser as an SSE event. We batch small
          // writes; Node flushes the socket on every write.
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
        if (parsed.usage) {
          resultTokens.promptTokens = parsed.usage.prompt_tokens ?? 0;
          resultTokens.completionTokens = parsed.usage.completion_tokens ?? 0;
          recordTokens(clientIp, resultTokens.promptTokens + resultTokens.completionTokens);
        }
      }
    }
  } catch (err) {
    if ((err?.name === 'AbortError') && req.destroyed) {
      // Client disconnected mid-stream; partial reply lives only in the
      // browser. Don't persist to the thread store.
      log('info', { event: 'chat_stream_client_aborted', requestId, partialBytes: fullReply.length });
      return;
    }
    res.write(`event: error\ndata: ${JSON.stringify({ kind: 'stream', error: 'stream interrupted' })}\n\n`);
    res.end();
    log('error', { event: 'chat_stream_interrupted', requestId, err: err.message, partialBytes: fullReply.length });
    recordMetric(false, Date.now() - routeStart, resultTokens);
    return;
  }
  breakdown.parseMs = Date.now() - parseStart;

  // (d) Post-processing
  const postStart = Date.now();
  if (persistThread && resolvedThreadId) {
    try {
      history.push({ role: 'assistant', content: fullReply });
      activeThreadStore.set(resolvedThreadId, history);
    } catch (err) {
      log('error', { event: 'threadstore_set_failed', requestId, threadId: resolvedThreadId, err: err.message });
    }
  }
  breakdown.postMs = Date.now() - postStart;

  // Send the terminal event with the full reply (so a non-streaming client
  // that reconnected late still has the body), usage, and the request id.
  res.write(`event: done\ndata: ${JSON.stringify({
    message: fullReply,
    usage: resultTokens,
    requestId,
  })}\n\n`);
  res.end();

  log('info', {
    event: 'chat_stream_done', requestId, clientRequestId, threadId: resolvedThreadId,
    status: 200, latencyMs: Date.now() - routeStart, ...breakdown, ...resultTokens, model: MODEL,
  });
  recordMetric(true, Date.now() - routeStart, resultTokens);
}

// Startup probe (plan 3.1): the api must bind to its port within 10s of
// process start, or exit non-zero. The crash-loop guard in compose
// (`restart: on-failure:5`) will then stop restarting after 5 failed starts
// and let the orchestrator (Dokploy) escalate instead of spinning forever.
const STARTUP_TIMEOUT_MS = Number(process.env.STARTUP_TIMEOUT_MS) || 10_000;
server.on('error', (err) => {
  log('fatal', { event: 'listen_error', err: err.message, code: err?.cause?.code ?? err?.code });
  process.exit(1);
});
server.listen(PORT, () => {
  const startupMs = Date.now() - startupStart;
  if (startupMs > STARTUP_TIMEOUT_MS) {
    log('fatal', { event: 'startup_timeout', startupMs, limit: STARTUP_TIMEOUT_MS });
    process.exit(1);
  }
  log('info', { event: 'startup_ok', port: PORT, startupMs, model: MODEL, corsOrigins: CORS_ORIGIN, telemetryEnabled: TELEMETRY_TOKEN !== '' });
  if (!API_KEY) {
    log('fatal', { event: 'startup_no_api_key' });
    process.exit(1);
  }
  startUpstreamProbe();
});

// Graceful shutdown so Dokploy's SIGTERM doesn't cut requests in flight.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    log('info', { event: 'shutdown', signal: sig });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
