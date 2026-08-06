// Global store for the Yuyi AI chat with multi-session support and localStorage persistence. Uses a vanilla store + useSyncExternalStore so the conversation is shared between the floating bubble and the full chat section even though they are separate React islands.
import { useSyncExternalStore } from 'react';

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
  // plan 4.2: build-time opt-in token for client-side error telemetry. When
  // unset (or empty) the client never sends telemetry, even if the user has
  // flipped the localStorage flag. The api validates the same token server-side
  // via TELEMETRY_TOKEN env var.
  readonly PUBLIC_TELEMETRY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | MessageContentPart[];
}

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export function getMessageText(msg: ChatMessage): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.find((p) => p.type === 'text')?.text ?? '';
  }
  const legacy = (msg as unknown as { text?: string }).text;
  return legacy ?? '';
}

export function getMessageImage(msg: ChatMessage): string | null {
  if (typeof msg.content === 'string') return null;
  const p = msg.content.find((p) => p.type === 'image_url');
  return p?.image_url?.url ?? null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

// Typed error union surfaced to the UI. Each kind maps to a user-visible reason
// in Spanish; consumers render a banner with a Retry button when this is set.
export type ChatErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'storage' | 'aborted';

export interface ChatError {
  kind: ChatErrorKind;
  message: string;
  status?: number;
  requestId?: string;
}

export interface YuyiSnapshot {
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  chats: ChatSession[];
  currentChatId: string | null;
  lastError: ChatError | null;
}

const STORAGE_KEY = 'yuyi-chats-v1';
const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Hola, soy Yuyi AI, el asistente de Luis Verastegui. ¿En qué puedo ayudarte?',
};

const API_URL: string =
  (import.meta.env?.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

// Resolve the chat endpoint. In dev, PUBLIC_API_URL is unset and API_URL falls back
// to an absolute origin (http://localhost:3001), so the chat path is /api/chat. In
// production, PUBLIC_API_URL is the relative path nginx proxies (e.g. /api), so the
// chat path is just /chat. Detecting this with a regex avoids the historical bug
// where `/api` + literal `/api/chat` produced the doubled `/api/api/chat` URL.
const CHAT_URL = /^(https?:|\/\/)/.test(API_URL)
  ? `${API_URL}/api/chat`
  : `${API_URL}/chat`;

// Client-side fetch timeout. Must stay under nginx's `proxy_read_timeout` (60s)
// so the browser aborts first and the user sees a typed "timeout" reason instead
// of a generic 504 from the edge.
const CLIENT_TIMEOUT_MS = 25_000;

// Backoff schedule for transient failures (network, 5xx, timeout). The first
// retry fires after 400ms; the second after 1.2s. The 4xx family is excluded:
// rate limits and bad-request are terminal, retrying wastes quota.
const RETRY_DELAYS_MS: readonly number[] = [400, 1200];

// plan 4.2: localStorage key for the opt-in telemetry flag. Default off.
const TELEMETRY_OPT_IN_KEY = 'yuyi-telemetry-opt-in';
const TELEMETRY_TOKEN: string =
  (import.meta.env?.PUBLIC_TELEMETRY_TOKEN as string | undefined) ?? '';

function isTelemetryOptedIn(): boolean {
  if (!isBrowser) return false;
  try {
    return window.localStorage.getItem(TELEMETRY_OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

const isBrowser = typeof window !== 'undefined';

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// Map an HTTP status to a short, user-visible Spanish reason. Keep these stable:
// they are rendered verbatim in the chat error banner.
function classifyHttpStatus(status: number): string {
  switch (status) {
    case 429: return 'se acabó el rate limit, intenta en un minuto';
    case 502: return 'el servidor tuvo un problema';
    case 503: return 'el servidor no está disponible';
    case 504: return 'el servidor tardó demasiado';
    case 401:
    case 403: return 'no tengo permiso para responder ahora';
    case 413: return 'el mensaje es demasiado grande';
    case 400: return 'la petición no es válida';
    default:  return `el servidor respondió con error ${status}`;
  }
}

function loadFromStorage(): { chats: ChatSession[]; currentChatId: string | null } {
  if (!isBrowser) return { chats: [], currentChatId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { chats: [], currentChatId: null };
    const parsed = JSON.parse(raw) as { chats: ChatSession[]; currentChatId: string | null };
    if (!Array.isArray(parsed.chats)) return { chats: [], currentChatId: null };
    // Migrate legacy messages ({role, text}) to the new content-based schema ({role, content}).
    for (const chat of parsed.chats) {
      chat.messages = chat.messages.map((m) => {
        const legacy = m as unknown as { text?: string };
        if (typeof legacy.text === 'string' && (m as { content?: unknown }).content === undefined) {
          return { role: m.role, content: legacy.text };
        }
        return m;
      });
    }
    return { chats: parsed.chats, currentChatId: parsed.currentChatId };
  } catch {
    return { chats: [], currentChatId: null };
  }
}

function saveToStorage(chats: ChatSession[], currentChatId: string | null) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
  } catch (err) {
    // localStorage quota exceeded or serialization failure. Best-effort: the
    // chat itself still works in memory, but history won't survive a reload.
    // Logged at warn so an operator can spot a runaway session in the console.
    console.warn('yuyi: saveToStorage failed', err);
  }
}

function makeId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Nueva conversación';
  const trimmed = getMessageText(firstUser).trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Nueva conversación';
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

type Listener = () => void;

class YuyiStore {
  chats: ChatSession[] = [];
  currentChatId: string | null = null;
  isLoading = false;
  input = '';
  lastError: ChatError | null = null;
  // Captured state of the most recent failed send, used by retry() to re-fire
  // the same message without forcing the user to re-attach an image.
  lastFailedInput = '';
  lastFailedImage: string | null = null;
  // plan 4.3: one clientRequestId per logical user click. Generated at the
  // start of send() and reused across all retry attempts so the api can
  // correlate every attempt in its log under a single id.
  clientRequestId: string | null = null;
  private listeners = new Set<Listener>();

  private cachedSnapshot: YuyiSnapshot = {
    messages: [],
    isLoading: false,
    input: '',
    chats: [],
    currentChatId: null,
    lastError: null,
  };

  constructor() {
    const { chats, currentChatId } = loadFromStorage();
    if (chats.length > 0) {
      this.chats = chats;
      this.currentChatId = currentChatId && chats.some((c) => c.id === currentChatId)
        ? currentChatId
        : chats[0].id;
    } else {
      this.newChat(false);
    }
    this.refreshSnapshot();
  }

  private currentMessages(): ChatMessage[] {
    return this.chats.find((c) => c.id === this.currentChatId)?.messages ?? [];
  }

  private refreshSnapshot = () => {
    this.cachedSnapshot = {
      messages: this.currentMessages(),
      isLoading: this.isLoading,
      input: this.input,
      chats: this.chats,
      currentChatId: this.currentChatId,
      lastError: this.lastError,
    };
  };

  private notify = () => {
    this.refreshSnapshot();
    saveToStorage(this.chats, this.currentChatId);
    for (const l of this.listeners) l();
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.cachedSnapshot;
  getServerSnapshot = () => this.cachedSnapshot;

  setInput = (value: string) => {
    this.input = value;
    this.refreshSnapshot();
    for (const l of this.listeners) l();
  };

  newChat = (notify = true) => {
    const session: ChatSession = {
      id: makeId(),
      title: 'Nueva conversación',
      messages: [INITIAL_MESSAGE],
      createdAt: Date.now(),
    };
    this.chats = [session, ...this.chats];
    this.currentChatId = session.id;
    this.input = '';
    this.isLoading = false;
    this.lastError = null;
    if (notify) this.notify();
    else this.refreshSnapshot();
  };

  selectChat = (id: string) => {
    if (!this.chats.some((c) => c.id === id)) return;
    this.currentChatId = id;
    this.input = '';
    this.isLoading = false;
    this.lastError = null;
    this.notify();
  };

  deleteChat = (id: string) => {
    this.chats = this.chats.filter((c) => c.id !== id);
    if (this.currentChatId === id) {
      if (this.chats.length > 0) {
        this.currentChatId = this.chats[0].id;
      } else {
        this.newChat(false);
        return;
      }
    }
    this.notify();
  };

  clearError = () => {
    if (!this.lastError) return;
    this.lastError = null;
    this.refreshSnapshot();
    for (const l of this.listeners) l();
  };

  // plan 4.2: opt-in flag setter. Toggling this on while TELEMETRY_TOKEN is
  // unset is a no-op (fireTelemetry guards on the token).
  setTelemetryOptIn = (enabled: boolean) => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(TELEMETRY_OPT_IN_KEY, enabled ? '1' : '0');
    } catch {
      // localStorage unavailable (private mode quota, etc.) — silently ignore.
    }
  };

  // plan 4.2: fire-and-forget telemetry event. Token is required; if absent
  // (production deploy without TELEMETRY_TOKEN) we never reach this code path.
  // The body is small on purpose: no PII beyond the user agent and viewport,
  // both of which the user-agent already sends to the api via the same origin.
  private fireTelemetry = (err: ChatError) => {
    if (!TELEMETRY_TOKEN || !isTelemetryOptedIn()) return;
    if (!isBrowser) return;
    const body = {
      requestId: err.requestId ?? null,
      clientRequestId: this.clientRequestId,
      errorKind: err.kind,
      httpStatus: err.status ?? null,
      chatLength: this.currentMessages().length,
      userAgent: navigator.userAgent,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
    // Keepalive so the request survives a page navigation; the api treats it
    // as fire-and-forget anyway (logs and 204).
    try {
      void fetch('/api/telemetry/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telemetry-Token': TELEMETRY_TOKEN,
        },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // Telemetry must never break the chat flow.
    }
  };

  // Re-fire the most recent failed send. Restores the captured input and image
  // so the user does not have to retype or re-attach anything.
  retry = () => {
    if (this.isLoading) return;
    if (!this.lastFailedInput && !this.lastFailedImage) return;
    this.input = this.lastFailedInput;
    this.lastError = null;
    this.refreshSnapshot();
    for (const l of this.listeners) l();
    void this.send(this.lastFailedImage ?? undefined);
  };

  send = async (imageDataUrl?: string) => {
    const text = this.input.trim();
    if (this.isLoading) return;
    if (!text && !imageDataUrl) return;
    const current = this.chats.find((c) => c.id === this.currentChatId);
    if (!current) return;

    // plan 4.3: stamp one id per logical user click. Every retry attempt
    // carries the same value so the api can group attempts in its log.
    this.clientRequestId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `crid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // plan 4.5: performance mark at the start of the round trip. The api's
    // own breakdown is logged server-side; this mark is for the browser DevTools
    // Performance tab and any future web-vitals-style reporter.
    if (isBrowser && typeof performance !== 'undefined' && performance.mark) {
      try { performance.mark('chat-send'); } catch { /* noop */ }
    }

    // Capture for restore-on-failure (plan 1.3): the user message is added to
    // the chat optimistically, but the input is restored if all retries fail.
    const capturedText = text;
    const capturedImage = imageDataUrl ?? null;
    this.lastFailedInput = capturedText;
    this.lastFailedImage = capturedImage;

    const parts: MessageContentPart[] = [];
    if (capturedText) parts.push({ type: 'text', text: capturedText });
    if (capturedImage) parts.push({ type: 'image_url', image_url: { url: capturedImage } });
    const content: ChatMessage['content'] = capturedImage ? parts : capturedText;

    const userMsg: ChatMessage = { role: 'user', content };
    // plan 5.1: optimistic placeholder for the streaming reply. trySendStream
    // mutates this in place as tokens arrive. The user sees the reply grow
    // word-by-word instead of waiting for the full LLM round-trip.
    const placeholder: ChatMessage = { role: 'assistant', content: '' };
    const nextMessages = [...current.messages, userMsg, placeholder];
    current.messages = nextMessages;
    current.title = deriveTitle(nextMessages);
    this.input = '';
    this.isLoading = true;
    this.lastError = null;
    this.refreshSnapshot();
    saveToStorage(this.chats, this.currentChatId);
    for (const l of this.listeners) l();

    // plan 2.3: send only the new user message + the chat id (the server has
    // the rest of the history). Local messages[] is still maintained for
    // instant display; the server is the source of truth for LLM context.
    const result = await this.sendWithRetry({
      threadId: current.id,
      message: userMsg,
      placeholderIdx: nextMessages.length - 1,
      chat: current,
    });

    if (isBrowser && typeof performance !== 'undefined' && performance.mark) {
      try { performance.mark('chat-reply'); } catch { /* noop */ }
      try {
        performance.measure('chat-turn', { start: 'chat-send', end: 'chat-reply', detail: { threadId: current.id } });
      } catch { /* noop */ }
    }

    if (result.kind === 'ok') {
      this.lastError = null;
      this.lastFailedInput = '';
      this.lastFailedImage = null;
    } else {
      // Restore the input so the user can edit and retry. The user message
      // stays in the chat so the user can see exactly what was sent. Remove
      // the empty placeholder so the user does not see a ghost bubble.
      this.input = capturedText;
      current.messages = current.messages.filter((_, i) => i !== result.placeholderIdx);
      this.lastError = {
        kind: result.kind,
        message: result.message,
        status: result.status,
        requestId: result.requestId,
      };
      this.fireTelemetry(this.lastError);
    }

    this.isLoading = false;
    this.refreshSnapshot();
    saveToStorage(this.chats, this.currentChatId);
    for (const l of this.listeners) l();
  };

  // Streaming send (plan 5.1). Opens the SSE stream, mutates the chat's
  // placeholder message in place as deltas arrive, and returns the same
  // { ok } | ChatError union as the legacy JSON path so the retry loop in
  // sendWithRetry works unchanged. Only the PRE-FIRST-BYTE error path is
  // retriable; once we have any tokens, a mid-stream failure is terminal
  // (the partial reply is already in the chat).
  private trySendOnce = async (payload: {
    threadId: string;
    message: ChatMessage;
    placeholderIdx: number;
    chat: ChatSession;
  }): Promise<{ kind: 'ok'; reply: string } | ChatError> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(this.clientRequestId ? { 'X-Client-Request-Id': this.clientRequestId } : {}),
        },
        body: JSON.stringify({
          threadId: payload.threadId,
          message: { role: payload.message.role, content: payload.message.content },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { kind: 'timeout', message: 'el servidor tardó demasiado' };
      }
      if (err instanceof TypeError) {
        return { kind: 'network', message: 'sin conexión con el servidor' };
      }
      return { kind: 'parse', message: 'no se pudo procesar la respuesta' };
    }
    clearTimeout(timer);

    const requestId = res.headers.get('X-Request-Id') ?? res.headers.get('x-request-id') ?? undefined;

    if (!res.ok) {
      // Pre-first-byte error: the response was a non-2xx (e.g. 429, 500, 502).
      // The retry loop in sendWithRetry can try again; the placeholder stays.
      let bodyText = '';
      try { bodyText = (await res.text()).slice(0, 500); } catch { /* noop */ }
      return {
        kind: 'http',
        message: classifyHttpStatus(res.status),
        status: res.status,
        requestId: requestId ?? undefined,
      };
    }
    if (!res.body) {
      return { kind: 'parse', message: 'no se pudo leer el stream' };
    }

    // Read SSE events. We pass back-to-back chunks through a TextDecoder and
    // a line buffer because the network can split a single event across two
    // reads; without the buffer, a "data: hello\n\n" might arrive as
    // "data: hel" + "lo\n\n".
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reply = '';
    let lastNotify = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event: done')) continue;
          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            let parsed: { delta?: string; message?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };
            try { parsed = JSON.parse(data); } catch { continue; }
            const delta = parsed.delta ?? '';
            if (delta) {
              reply += delta;
              payload.chat.messages[payload.placeholderIdx] = { role: 'assistant', content: reply };
              // Throttle re-renders: notify every ~24 chars of accumulated
              // text instead of every delta (a 50-token reply can produce
              // hundreds of small deltas).
              const now = Date.now();
              if (now - lastNotify > 32 || reply.length % 24 === 0) {
                this.refreshSnapshot();
                for (const l of this.listeners) l();
                lastNotify = now;
              }
            }
          }
        }
      }
    } catch (err) {
      // Mid-stream error: partial reply is already in the chat. We do not
      // throw because the retry loop in sendWithRetry must NOT retry after
      // any data has been received (would cause the user to see the partial
      // reply twice). Return a terminal error so the error banner renders.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { kind: 'timeout', message: 'la conexión se interrumpió', requestId: requestId ?? undefined };
      }
      return { kind: 'parse', message: 'stream interrupted', requestId: requestId ?? undefined };
    }

    return { kind: 'ok', reply };
  };

  private sendWithRetry = async (
    payload: { threadId: string; message: ChatMessage; placeholderIdx: number; chat: ChatSession },
  ): Promise<{ kind: 'ok'; reply: string } | (ChatError & { placeholderIdx: number })> => {
    let last: ChatError & { placeholderIdx: number } = {
      kind: 'network',
      message: 'sin conexión con el servidor',
      placeholderIdx: payload.placeholderIdx,
    };
    const totalAttempts = RETRY_DELAYS_MS.length + 1;
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }
      const result = await this.trySendOnce(payload);
      if (result.kind === 'ok') return { kind: 'ok', reply: result.reply };
      last = { ...result, placeholderIdx: payload.placeholderIdx };
      // 4xx is terminal: the server is not going to change its mind, retrying
      // just burns the user's rate-limit budget.
      if (result.kind === 'http' && result.status !== undefined && result.status < 500) {
        return last;
      }
    }
    return last;
  };
}

export const yuyiStore = new YuyiStore();

export function useYuyiStore() {
  return useSyncExternalStore(yuyiStore.subscribe, yuyiStore.getSnapshot, yuyiStore.getServerSnapshot);
}
