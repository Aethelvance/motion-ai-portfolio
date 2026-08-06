// Full-viewport ChatGPT-like chat interface for Yuyi AI. Sidebar with chat history on the
// left, main area on the right with a top bar, centered messages column, and a
// bottom-pinned input. Shares state with the floating AIAssistant bubble via yuyiStore
// (the bubble is suppressed on this page; it only appears on / and /contact).
// Suggested prompt cards appear on a fresh chat to bootstrap the conversation.
import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Sparkles, Check, CheckCheck, Paperclip, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useYuyiStore, yuyiStore, getMessageText, getMessageImage, type ChatSession } from '@/stores/yuyi';
import { AssistantMessage } from '@/components/organisms/ChatBubble/message';
import { useAnimateLastMessage } from '@/components/organisms/ChatBubble/use-animate-last';
import { useChatMessagesScroll } from '@/hooks/useChatMessagesScroll';
import { MENU_ITEMS } from '@/constants/menu';
import styles from './full-chat.module.css';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MOBILE_BREAKPOINT_PX = 768;

const SUGGESTED_PROMPTS = [
  '¿Qué tecnologías maneja Luis?',
  '¿Tiene experiencia con IA y LLMs?',
  '¿Cómo puedo contactarlo?',
];

export default function YuyiPage() {
  const { messages, isLoading, input, chats, currentChatId, lastError } = useYuyiStore();
  const messagesRef = useChatMessagesScroll<HTMLDivElement>(currentChatId);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldAnimate = useAnimateLastMessage(messages, currentChatId);
  const currentChat = chats.find((c) => c.id === currentChatId) ?? null;
  const isFreshChat = messages.length <= 1;
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches);
    };
    setIsMobile(mq.matches);
    setSidebarOpen(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const readFile = async (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) return;
    // New upload flow (plan 2.1): POST the file to /api/chat/upload, get back
    // a URL, and store the URL in the chat history. Replaces the old base64
    // inlining which inflated every chat turn with the full image bytes.
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error('Upload response missing url');
      setPendingImage(data.url);
    } catch (err) {
      // Image upload failed; leave pendingImage unset and log for the operator.
      // The user can retry by re-attaching the file.
      console.warn('yuyi: image upload failed', err);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = '';
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          readFile(file);
          return;
        }
      }
    }
  };

  const handleSend = () => {
    yuyiStore.send(pendingImage ?? undefined);
    setPendingImage(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-base text-text-primary">
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.button
            type="button"
            aria-label="Cerrar sidebar"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-base/70 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex shrink-0 items-center gap-3 border-b border-border bg-surface/40 px-4 py-6 backdrop-blur-sm ${styles.headerPad}`}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border hover:text-text-primary ${styles.headerToggle}`}
            aria-label={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
            title={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <img
            src="/assets/avatar-bot.png"
            alt="Yuyi AI"
            className="h-10 w-10 shrink-0 rounded-full border border-primary/40 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-semibold text-text-primary">
              {currentChat?.title ?? 'Yuyi AI'}
            </p>
            <p className="font-mono text-xs font-medium text-text-secondary">
              {isLoading ? 'Yuyi está escribiendo…' : 'Asistente de Luis · En línea'}
            </p>
          </div>
          <span
            className={`flex h-2 w-2 shrink-0 rounded-full animate-pulse ${isLoading ? 'bg-cyan' : 'bg-success'}`}
            title={isLoading ? 'Escribiendo' : 'En línea'}
          />
        </header>

        <div ref={messagesRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.map((msg, i) => {
              const key = `${currentChatId}_${i}`;
              const isConsecutive = i > 0 && messages[i - 1].role === msg.role;
              const marginClass = isConsecutive ? 'mt-1' : 'mt-4';
              if (msg.role === 'user') {
                const isSeen = i < lastAssistantIdx;
                const imageUrl = getMessageImage(msg);
                const text = getMessageText(msg);
                return (
                  <div key={key} className={`flex justify-end ${marginClass}`}>
                    <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-base">
                      {imageUrl && (
                        <img src={imageUrl} alt="" className="mb-1.5 max-h-64 max-w-full rounded-lg object-contain" />
                      )}
                      {text && <div className="whitespace-pre-wrap">{text}</div>}
                      <div className="mt-0.5 flex justify-end">
                        {isSeen ? (
                          <CheckCheck className="h-3.5 w-3.5 text-cyan" aria-label="Visto" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-text-primary/40" aria-label="Enviado" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <AssistantMessage
                  key={key}
                  text={getMessageText(msg)}
                  animate={shouldAnimate(i)}
                  variant="fullpage"
                  isConsecutive={isConsecutive}
                />
              );
            })}
            {isLoading && <TypingIndicator />}
            {isFreshChat && !isLoading && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      yuyiStore.setInput(prompt);
                      yuyiStore.send();
                    }}
                    className="group flex items-start gap-2 rounded-xl border border-border bg-surface/40 p-3 text-left text-sm text-text-secondary transition-all hover:border-primary hover:bg-surface-elevated hover:text-text-primary"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-colors group-hover:text-cyan" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-surface/40 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <AnimatePresence>
              {lastError && (
                <motion.div
                  key={lastError.requestId ?? `${lastError.kind}_${lastError.status ?? ''}`}
                  role="alert"
                  aria-live="polite"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="mb-2 flex items-start gap-2 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-text-primary"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono leading-snug">No pude enviar tu mensaje: {lastError.message}.</p>
                    {lastError.status !== undefined && (
                      <p className="mt-0.5 font-mono text-[10px] text-text-secondary">HTTP {lastError.status}</p>
                    )}
                  </div>
                  <button
                    onClick={yuyiStore.retry}
                    disabled={isLoading}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-text-primary transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    aria-label="Reintentar"
                    title="Reintentar"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reintentar
                  </button>
                  <button
                    onClick={yuyiStore.clearError}
                    className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                    aria-label="Cerrar error"
                    title="Cerrar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {pendingImage && (
              <div className="mb-2 flex">
                <div className="relative">
                  <img src={pendingImage} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-base text-text-secondary hover:text-text-primary"
                    aria-label="Quitar imagen"
                    title="Quitar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border hover:text-text-primary disabled:opacity-30 ${styles.inputBtn}`}
                aria-label="Adjuntar imagen"
                title="Adjuntar imagen"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => yuyiStore.setInput(e.target.value)}
                onPaste={onPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pregúntale a Yuyi…"
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none bg-transparent px-1 font-mono text-sm text-text-primary placeholder:text-text-secondary focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '160px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !pendingImage)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base transition-colors hover:bg-primary/80 disabled:opacity-30 ${styles.inputBtn}`}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center font-mono text-[10px] text-text-secondary">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatSidebar({
  chats,
  currentChatId,
  isOpen,
  isMobile,
  onClose,
}: {
  chats: ChatSession[];
  currentChatId: string | null;
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  // On mobile the sidebar is a fixed drawer sliding in from the left with z above the chat.
  // On desktop (md+) the original inline flex behavior is preserved.
  const baseClasses = isMobile
    ? `fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] border-r border-border bg-surface transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : `flex shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-[width,opacity] duration-300 ease-out ${
        isOpen ? 'w-56 opacity-100' : 'w-0 opacity-0'
      }`;
  const innerClasses = isMobile
    ? 'flex h-full w-72 max-w-[85vw] flex-col gap-2 p-3'
    : 'flex h-full w-56 flex-col gap-2 p-3';
  const hidden = isMobile ? false : !isOpen;
  const handleSelect = (id: string) => {
    yuyiStore.selectChat(id);
    if (isMobile) onClose();
  };
  const handleNewChat = () => {
    yuyiStore.newChat();
    if (isMobile) onClose();
  };

  return (
    <aside className={baseClasses} aria-hidden={hidden}>
      <div className={innerClasses}>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleNewChat}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2.5 font-mono text-sm text-text-primary transition-colors hover:border-primary hover:text-primary ${styles.newChatBtn}`}
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          {isMobile && (
            <button
              onClick={onClose}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-border hover:text-text-primary ${styles.drawerCloseBtn}`}
              aria-label="Cerrar sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-text-secondary/60">
            Historial
          </p>
          <ul className="flex flex-col gap-1">
            {chats.map((chat) => (
              <li key={chat.id} className="group relative">
                <button
                  onClick={() => handleSelect(chat.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 pr-8 text-left font-mono text-xs transition-colors ${styles.chatItem} ${
                    chat.id === currentChatId
                      ? 'border border-primary/40 bg-primary/10 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  }`}
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>
                {chats.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      yuyiStore.deleteChat(chat.id);
                    }}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary transition-all hover:bg-border hover:text-error ${styles.deleteBtn}`}
                    aria-label="Eliminar conversación"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Site navigation" className={`shrink-0 border-t border-border pt-2 ${styles.sidebarMenu}`}>
          <p className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-text-secondary/60">
            Menu
          </p>
          <ul className="flex flex-col gap-1">
            {MENU_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={item.href === '/yuyi' ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs transition-colors ${styles.menuLink} ${
                    item.href === '/yuyi'
                      ? 'text-text-secondary/50 cursor-default'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  }`}
                  onClick={(e) => {
                    if (item.href === '/yuyi') e.preventDefault();
                  }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

function TypingIndicator() {
  return (
    <div className="mt-4 flex justify-start">
      <div className="flex gap-1.5 rounded-2xl rounded-bl-[4px] border border-border bg-surface-elevated px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-text-secondary"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}
