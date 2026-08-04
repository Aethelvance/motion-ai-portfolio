// Floating AI assistant: a bubble in the bottom-left corner that opens a small chat window. State and conversation are shared with the full YuyiChatSection via the global yuyiStore. The floating UI auto-hides when the full Yuyi AI section is in the viewport, and reappears when the user scrolls away from it.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Plus } from 'lucide-react';
import { useYuyiStore, yuyiStore } from '@/components/providers/yuyiStore';
import { AssistantMessage } from './AssistantMessage';
import { useAnimateLastMessage } from './useAnimateLastMessage';
import { useNestedScroll } from '@/hooks/useNestedScroll';
import styles from './AIAssistant.module.css';

const YuyiIcon = () => (
  <img
    src="/avatar-bot.png"
    alt="Yuyi AI"
    className="h-6 w-6 rounded-full border border-primary/40 object-cover"
  />
);

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSectionVisible, setIsSectionVisible] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, input, currentChatId } = useYuyiStore();
  const shouldAnimate = useAnimateLastMessage(messages, currentChatId);
  useNestedScroll(messagesContainerRef);

  // Hide the floating UI when the full YuyiChatSection is in the viewport; show it again when the user scrolls away.
  useEffect(() => {
    const section = document.getElementById('yuyi');
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSectionVisible(entry.isIntersecting);
        if (entry.isIntersecting) setIsOpen(false);
      },
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const showFloating = !isSectionVisible;

  return (
    <>
      <AnimatePresence>
        {showFloating && isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed bottom-40 left-40 z-40 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-surface ${styles.window}`}
          >
            <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <YuyiIcon />
                <span className="font-mono text-sm font-semibold text-text-primary">Yuyi AI</span>
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

            <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-4 ${styles.messages}`}>
              {messages.map((msg, i) => {
                const key = `${currentChatId}_${i}`;
                const isConsecutive = i > 0 && messages[i - 1].role === msg.role;
                const marginClass = isConsecutive ? 'mt-1' : 'mt-3';
                if (msg.role === 'user') {
                  return (
                    <div key={key} className={`flex justify-end ${marginClass}`}>
                      <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-base ${styles.bubbleUser}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                }
                return (
                  <AssistantMessage
                    key={key}
                    text={msg.text}
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
        {showFloating && (
          <motion.button
            onClick={() => setIsOpen((v) => !v)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed bottom-20 left-40 z-40 flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-3 text-text-primary transition-all hover:scale-105 hover:border-primary ${styles.bubble}`}
            aria-label={isOpen ? 'Cerrar Yuyi AI' : 'Abrir Yuyi AI'}
          >
            <YuyiIcon />
            <span className="font-mono text-sm font-medium">Yuyi AI</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
