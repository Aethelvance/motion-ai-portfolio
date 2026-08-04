// Full-viewport ChatGPT-like chat interface for Yuyi AI. Sidebar with chat history on the
// left, main area on the right with a top bar, centered messages column, and a
// bottom-pinned input. Shares state with the floating AIAssistant bubble via yuyiStore
// (the bubble is suppressed on this page; it only appears on /cv and /contact).
// Suggested prompt cards appear on a fresh chat to bootstrap the conversation.
import { useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Sparkles, Check, CheckCheck, Paperclip, X } from 'lucide-react';
import { useYuyiStore, yuyiStore, getMessageText, getMessageImage, type ChatSession } from '@/components/providers/yuyiStore';
import { AssistantMessage } from '@/components/organisms/AIAssistant/AssistantMessage';
import { useAnimateLastMessage } from '@/components/organisms/AIAssistant/useAnimateLastMessage';
import { useChatMessagesScroll } from '@/hooks/useChatMessagesScroll';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const SUGGESTED_PROMPTS = [
  '¿Qué tecnologías maneja Luis?',
  '¿Tiene experiencia con IA y LLMs?',
  '¿Cómo puedo contactarlo?',
];

export default function YuyiPage() {
  const { messages, isLoading, input, chats, currentChatId } = useYuyiStore();
  const messagesRef = useChatMessagesScroll<HTMLDivElement>(currentChatId);
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

  const readFile = (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
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
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        isOpen={sidebarOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface/40 px-4 py-6 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
            aria-label={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
            title={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <img
            src="/avatar-bot.png"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border hover:text-text-primary disabled:opacity-30"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base transition-colors hover:bg-primary/80 disabled:opacity-30"
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
}: {
  chats: ChatSession[];
  currentChatId: string | null;
  isOpen: boolean;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-[width,opacity] duration-300 ease-out ${
        isOpen ? 'w-56 opacity-100' : 'w-0 opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full w-56 flex-col gap-2 p-3">
        <button
          onClick={() => yuyiStore.newChat()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2.5 font-mono text-sm text-text-primary transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>

        <div className="flex-1 overflow-y-auto">
          <p className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-text-secondary/60">
            Historial
          </p>
          <ul className="flex flex-col gap-1">
            {chats.map((chat) => (
              <li key={chat.id} className="group relative">
                <button
                  onClick={() => yuyiStore.selectChat(chat.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 pr-8 text-left font-mono text-xs transition-colors ${
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-border hover:text-error group-hover:opacity-100"
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
