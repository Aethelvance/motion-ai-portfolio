// Floating chat bubble: a small chat window in the bottom-left corner. State and conversation are shared with the dedicated /yuyi page via the global yuyiStore. The floating UI is suppressed on /yuyi (the page IS the chat, so the bubble would be redundant); it only renders on the other pages.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Plus, Check, CheckCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useYuyiStore, yuyiStore, getMessageText, getMessageImage } from '@/stores/yuyi';
import { AssistantMessage } from './message';
import { useAnimateLastMessage } from './use-animate-last';
import { useChatMessagesScroll } from '@/hooks/useChatMessagesScroll';
import styles from './bubble.module.css';

const YuyiIcon = () => (
  <img
    src="/assets/avatar-bot.png"
    alt="Yuyi AI"
    className="h-6 w-6 rounded-full border border-primary/40 object-cover"
  />
);

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { messages, isLoading, input, currentChatId, lastError } = useYuyiStore();
  const shouldAnimate = useAnimateLastMessage(messages, currentChatId);
  const messagesRef = useChatMessagesScroll<HTMLDivElement>(currentChatId);
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  useEffect(() => {
    setShowFloating(!window.location.pathname.startsWith('/yuyi'));
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showFloating && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed inset-x-4 bottom-20 z-40 flex h-[min(500px,80dvh)] w-auto max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-surface sm:left-40 sm:right-auto sm:bottom-40 sm:h-[500px] sm:w-[380px] sm:max-w-none ${styles.window}`}
          >
            <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <YuyiIcon />
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {isLoading ? 'Yuyi AI · Escribiendo…' : 'Yuyi AI'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={yuyiStore.newChat}
                  className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-primary"
                  aria-label="Nueva conversación"
                  title="Nueva conversación"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={messagesRef} className={`flex-1 overflow-y-auto p-4 ${styles.messages}`}>
              {messages.map((msg, i) => {
                const key = `${currentChatId}_${i}`;
                const isConsecutive = i > 0 && messages[i - 1].role === msg.role;
                const marginClass = isConsecutive ? 'mt-1' : 'mt-3';
                if (msg.role === 'user') {
                  const isSeen = i < lastAssistantIdx;
                  const imageUrl = getMessageImage(msg);
                  const text = getMessageText(msg);
                  return (
                    <div key={key} className={`flex justify-end ${marginClass}`}>
                      <div className={`max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-base ${styles.bubbleUser}`}>
                        {imageUrl && (
                          <img src={imageUrl} alt="" className="mb-1.5 max-h-48 max-w-full rounded-lg object-contain" />
                        )}
                        {text && <div className="whitespace-pre-wrap">{text}</div>}
                        <div className="mt-0.5 flex justify-end">
                          {isSeen ? (
                            <CheckCheck className="h-3 w-3 text-cyan" aria-label="Visto" />
                          ) : (
                            <Check className="h-3 w-3 text-text-primary/40" aria-label="Enviado" />
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
                    variant="floating"
                    className={styles.bubbleAssistant}
                    isConsecutive={isConsecutive}
                  />
                );
              })}
              {isLoading && (
                <div className="mt-3 flex justify-start">
                  <div className={`rounded-2xl bg-surface-elevated px-4 py-3 ${styles.bubbleAssistant}`}>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-surface-elevated p-3">
              <AnimatePresence>
                {lastError && (
                  <motion.div
                    key={lastError.requestId ?? `${lastError.kind}_${lastError.status ?? ''}`}
                    role="alert"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="mb-2 flex items-start gap-2 rounded-lg border border-error/40 bg-error/10 px-2 py-1.5 text-[11px] text-text-primary"
                  >
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-error" aria-hidden="true" />
                    <span className="min-w-0 flex-1 font-mono leading-snug">{lastError.message}</span>
                    <button
                      onClick={yuyiStore.retry}
                      disabled={isLoading}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-primary transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                      aria-label="Reintentar"
                      title="Reintentar"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={yuyiStore.clearError}
                      className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                      aria-label="Cerrar error"
                      title="Cerrar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 rounded-full border border-border bg-base px-4 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => yuyiStore.setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      yuyiStore.send();
                    }
                  }}
                  placeholder="Pregúntame sobre Luis…"
                  disabled={isLoading}
                  className="flex-1 bg-transparent font-mono text-xs text-text-primary placeholder:text-text-secondary focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={yuyiStore.send}
                  disabled={isLoading || !input.trim()}
                  className="text-primary transition-colors hover:text-text-primary disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFloating && (!isOpen || !isMobile) && (
          <motion.button
            onClick={() => setIsOpen((v) => !v)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-3 text-text-primary transition-all hover:scale-105 hover:border-primary sm:bottom-20 sm:left-40 ${styles.bubble}`}
            aria-label="Abrir Yuyi AI"
          >
            <YuyiIcon />
            <span className="font-mono text-sm font-medium">Yuyi AI</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
