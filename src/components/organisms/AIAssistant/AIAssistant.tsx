// Floating AI assistant: functional chat with a Node.js backend (see /server). Sends user messages to the Yuyi API and renders the assistant reply with markdown-link support: [text](url) becomes a clickable underlined link, image URLs render inline, and PDF URLs render as a card with a preview iframe and download button.
import { Fragment, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Download } from 'lucide-react';
import styles from './AIAssistant.module.css';

const YUYI_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><g transform="translate(-25.414562,-111.28127)"><path fill-rule="evenodd" d="m 35.412312,115.5918 c -1.442046,0 -2.880739,0.49168 -4.052401,1.4748 -0.705182,0.59173 -1.2502,1.31171 -1.628713,2.10012 -0.05253,-0.005 -0.103652,-0.0164 -0.157588,-0.0164 -0.941869,0 -1.70024,0.75836 -1.70024,1.70021 v 2.10134 c 0,0.94184 0.758371,1.70021 1.70024,1.70021 0.05394,0 0.105059,-0.0117 0.157588,-0.0164 0.06777,0.14047 0.137889,0.27991 0.216918,0.41689 0.308938,0.55139 1.134304,0.0793 0.815588,-0.46655 -1.304955,-2.26029 -0.799571,-5.12447 1.199708,-6.80208 1.999326,-1.67765 4.903352,-1.67765 6.902655,0 1.999326,1.67761 2.50471,4.54174 1.199732,6.80208 l -0.01407,0.0234 -0.0094,0.0234 c 0,0 -0.633799,1.40211 -1.878344,1.40211 l -1.575387,-0.0141 c -0.147739,-0.21575 -0.384191,-0.366 -0.666512,-0.366 h -1.015533 c -0.45534,0 -0.821638,0.36752 -0.821638,0.82286 0,0.28087 0.178225,0.49415 0.586056,0.49415 l 3.493009,2.8e-4 c 1.867604,0 2.675336,-1.8335 2.712107,-1.91835 v -0.005 c 0.07832,-0.13578 0.147269,-0.27521 0.214572,-0.41444 0.05488,0.005 0.108342,0.0164 0.164858,0.0164 0.941869,0 1.700237,-0.75836 1.700237,-1.70021 v -2.10134 c 0,-0.94184 -0.75837,-1.70021 -1.700237,-1.70021 -0.05441,0 -0.105762,0.009 -0.158761,0.0164 -0.377627,-0.78846 -0.921023,-1.50837 -1.6263,-2.10014 -1.171614,-0.98312 -2.616355,-1.47481 -4.058451,-1.47481 z m -2.049205,2.98718 c -0.366019,-0.0239 -0.700354,0.0535 -0.992502,0.36114 -0.779049,0.82018 -1.260325,1.9365 -1.260325,3.12533 0,0.98061 0.327722,2.07941 0.879793,2.11951 0.786511,0.0572 2.027657,-0.45928 3.424676,-0.45928 1.480437,0 2.786843,0.57951 3.561606,0.44232 0.469528,-0.083 0.744064,-1.20536 0.744064,-2.10255 0,-1.18883 -0.482452,-2.30515 -1.261524,-3.12533 -0.779054,-0.82021 -1.855342,0 -3.044146,0 -0.743006,0 -1.441646,-0.32109 -2.051642,-0.36114 z m -0.174473,2.02134 c 0.434305,1.7e-4 0.786345,0.35219 0.786486,0.78651 -1.41e-4,0.43431 -0.352181,0.78633 -0.786486,0.78649 -0.434304,-1.6e-4 -0.786345,-0.35218 -0.786485,-0.78649 1.4e-4,-0.43432 0.352181,-0.78634 0.786485,-0.78651 z m 4.452304,0 c 0.434329,1.7e-4 0.786345,0.35219 0.786509,0.78651 -1.66e-4,0.43431 -0.35218,0.78633 -0.786509,0.78649 -0.434304,-1.6e-4 -0.786321,-0.35218 -0.786485,-0.78649 1.64e-4,-0.43432 0.352181,-0.78634 0.786485,-0.78651 z"/></g></svg>';

const YuyiIcon = () => (
  <img
    src="/avatar-bot.png"
    alt="Yuyi AI"
    className="h-6 w-6 rounded-full border border-primary/40 object-cover"
  />
);

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;
const PDF_EXT = /\.pdf(\?.*)?$/i;

const isImageUrl = (url: string) => {
  try {
    return IMAGE_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const isPdfUrl = (url: string) => {
  try {
    return PDF_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const filenameFromUrl = (url: string) => {
  try {
    const path = new URL(url).pathname;
    return path.split('/').pop() || 'documento.pdf';
  } catch {
    return 'documento.pdf';
  }
};

// Renders inline markdown (**bold**, *italic*, `code`) inside a plain text segment. Returns React nodes (strings, <strong>, <em>, <code>).
const renderInlineMarkdown = (text: string, keyOffset: number): ReactNode[] => {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyOffset;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-bold text-text-primary">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-base/80 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={key++} className="italic text-text-primary">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

// Renders the assistant text with markdown link/image/inline support: [label](url), ![alt](url), **bold**, *italic*, `code`.
// Regular links become underlined anchors that open in a new tab; image URLs (by extension) render inline and open in a new tab on click.
const renderRichText = (text: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  const regex = /!?\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(...renderInlineMarkdown(segment, key));
      key += 10;
    }
    const isImage = match[0].startsWith('!');
    const label = match[1];
    const url = match[2];

    if (isImage || isImageUrl(url)) {
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block rounded-lg border border-border transition-opacity hover:opacity-90"
        >
          <img
            src={url}
            alt={label}
            loading="lazy"
            className="block max-w-full cursor-zoom-in rounded-lg"
          />
        </a>,
      );
    } else if (isPdfUrl(url)) {
      const filename = filenameFromUrl(url);
      parts.push(
        <div
          key={key++}
          className="mt-2 overflow-hidden rounded-lg border border-border bg-surface-elevated transition-colors hover:border-primary"
        >
          <a
            href={url}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error/15">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-5 w-5 text-error"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-medium text-text-primary">{label}</p>
              <p className="truncate font-mono text-xs text-text-secondary">PDF · {filename}</p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-text-secondary" />
          </a>
          <iframe
            src={url}
            title={label}
            className="block h-48 w-full border-0 border-t border-border bg-white"
          />
        </div>,
      );
    } else {
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan"
        >
          {label}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(...renderInlineMarkdown(text.slice(lastIndex), key));
  }
  return parts;
};

type Role = 'user' | 'assistant';

interface Message {
  role: Role;
  text: string;
}

const API_URL = 'http://localhost:3001/api/chat';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hola, soy Yuyi AI, el asistente de Luis Verastegui. ¿En qué puedo ayudarte?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const reply: string = data.message ?? 'Sin respuesta del servidor.';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'No pude conectar con el servidor. Asegúrate de que esté corriendo (`pnpm server`).',
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
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
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto p-4 ${styles.messages}`}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? `bg-primary text-base ${styles.bubbleUser}`
                        : `bg-surface-elevated text-text-primary ${styles.bubbleAssistant}`
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <Fragment>{renderRichText(msg.text)}</Fragment>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
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
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregúntame sobre Luis…"
                  disabled={isLoading}
                  className="flex-1 bg-transparent font-mono text-xs text-text-primary placeholder:text-text-secondary focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={send}
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

      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-20 left-40 z-40 flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-3 text-text-primary transition-all hover:scale-105 hover:border-primary ${styles.bubble}`}
        aria-label={isOpen ? 'Cerrar Yuyi AI' : 'Abrir Yuyi AI'}
      >
        <YuyiIcon />
        <span className="font-mono text-sm font-medium">Yuyi AI</span>
      </button>
    </>
  );
}

export default AIAssistant;
