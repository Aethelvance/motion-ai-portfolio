// Full-page Yuyi AI chat section. Collapsible history sidebar (within the section) + main chat card. Shares state with the floating bubble via the global yuyiStore — both show the same active chat.
import { useEffect, useRef, useState } from 'react';
import { Send, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useYuyiStore, yuyiStore, type ChatSession } from '@/components/providers/yuyiStore';
import { renderRichText } from '@/components/organisms/AIAssistant/renderRichText';

export default function YuyiChatSection() {
  const { messages, isLoading, input, chats, currentChatId } = useYuyiStore();
  const messagesRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const currentChat = chats.find((c) => c.id === currentChatId) ?? null;

  return (
    <section
      id="yuyi"
      data-side-nav
      data-side-nav-label="YUYI AI"
      className="relative border-t border-border bg-base"
    >
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative mx-auto flex min-h-[80vh] max-w-5xl gap-4 px-4 py-8 md:px-6 md:py-16">
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          isOpen={sidebarOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex w-full flex-col">
              <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                    aria-label={sidebarOpen ? 'Ocultar historial' : 'Mostrar historial'}
                    title={sidebarOpen ? 'Ocultar historial' : 'Mostrar historial'}
                  >
                    {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  </button>
                  <img
                    src="/avatar-bot.png"
                    alt="Yuyi AI"
                    className="h-8 w-8 shrink-0 rounded-full border border-primary/40 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-text-primary">
                      {currentChat?.title ?? 'Yuyi AI'}
                    </p>
                    <p className="font-mono text-[10px] text-text-secondary">Asistente de Luis · Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                  <button
                    onClick={yuyiStore.newChat}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] text-text-secondary transition-colors hover:bg-border hover:text-primary"
                    title="Nueva conversación"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Nuevo</span>
                  </button>
                </div>
              </div>

              <div
                ref={messagesRef}
                className="h-[60vh] space-y-4 overflow-y-auto p-6"
                style={{ scrollbarWidth: 'thin' }}
              >
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {isLoading && <TypingIndicator />}
              </div>

              <div className="border-t border-border bg-surface-elevated p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-border bg-base p-3">
                  <textarea
                    value={input}
                    onChange={(e) => yuyiStore.setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        yuyiStore.send();
                      }
                    }}
                    placeholder="Escribe tu mensaje…"
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 resize-none bg-transparent font-mono text-sm text-text-primary placeholder:text-text-secondary focus:outline-none disabled:opacity-50"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={yuyiStore.send}
                    disabled={isLoading || !input.trim()}
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
      </div>
    </section>
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
      className={`shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-out ${
        isOpen ? 'w-56 opacity-100' : 'w-0 opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full w-56 flex-col gap-2">
        <button
          onClick={() => yuyiStore.newChat()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2.5 font-mono text-sm text-text-primary transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
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

function MessageBubble({ msg }: { msg: { role: 'user' | 'assistant'; text: string } }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          msg.role === 'user'
            ? 'bg-primary text-base'
            : 'bg-surface-elevated text-text-primary border border-border'
        }`}
      >
        {msg.role === 'assistant' ? renderRichText(msg.text) : msg.text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
