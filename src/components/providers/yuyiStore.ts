// Global store for the Yuyi AI chat with multi-session support and localStorage persistence. Uses a vanilla store + useSyncExternalStore so the conversation is shared between the floating bubble and the full chat section even though they are separate React islands.
import { useSyncExternalStore } from 'react';

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface YuyiSnapshot {
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  chats: ChatSession[];
  currentChatId: string | null;
}

const STORAGE_KEY = 'yuyi-chats-v1';
const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  text: 'Hola, soy Yuyi AI, el asistente de Luis Verastegui. ¿En qué puedo ayudarte?',
};

const API_URL: string =
  (import.meta.env?.PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

const isBrowser = typeof window !== 'undefined';

function loadFromStorage(): { chats: ChatSession[]; currentChatId: string | null } {
  if (!isBrowser) return { chats: [], currentChatId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { chats: [], currentChatId: null };
    const parsed = JSON.parse(raw) as { chats: ChatSession[]; currentChatId: string | null };
    if (!Array.isArray(parsed.chats)) return { chats: [], currentChatId: null };
    return { chats: parsed.chats, currentChatId: parsed.currentChatId };
  } catch {
    return { chats: [], currentChatId: null };
  }
}

function saveToStorage(chats: ChatSession[], currentChatId: string | null) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }));
  } catch {
    // ignore quota / serialization errors
  }
}

function makeId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Nueva conversación';
  const trimmed = firstUser.text.trim().replace(/\s+/g, ' ');
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

type Listener = () => void;

class YuyiStore {
  chats: ChatSession[] = [];
  currentChatId: string | null = null;
  isLoading = false;
  input = '';
  private listeners = new Set<Listener>();

  private cachedSnapshot: YuyiSnapshot = {
    messages: [],
    isLoading: false,
    input: '',
    chats: [],
    currentChatId: null,
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
    if (notify) this.notify();
    else this.refreshSnapshot();
  };

  selectChat = (id: string) => {
    if (!this.chats.some((c) => c.id === id)) return;
    this.currentChatId = id;
    this.input = '';
    this.isLoading = false;
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

  send = async () => {
    const text = this.input.trim();
    if (!text || this.isLoading) return;
    const current = this.chats.find((c) => c.id === this.currentChatId);
    if (!current) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const nextMessages = [...current.messages, userMsg];
    current.messages = nextMessages;
    current.title = deriveTitle(nextMessages);
    this.input = '';
    this.isLoading = true;
    this.refreshSnapshot();
    for (const l of this.listeners) l();

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const reply: string = data.message ?? 'Sin respuesta del servidor.';
      current.messages = [...nextMessages, { role: 'assistant', text: reply }];
    } catch {
      current.messages = [
        ...nextMessages,
        {
          role: 'assistant',
          text: 'No pude conectar con el servidor. Asegúrate de que esté corriendo (`pnpm server`).',
        },
      ];
    } finally {
      this.isLoading = false;
      this.refreshSnapshot();
      saveToStorage(this.chats, this.currentChatId);
      for (const l of this.listeners) l();
    }
  };
}

export const yuyiStore = new YuyiStore();

export function useYuyiStore() {
  return useSyncExternalStore(yuyiStore.subscribe, yuyiStore.getSnapshot, yuyiStore.getServerSnapshot);
}
