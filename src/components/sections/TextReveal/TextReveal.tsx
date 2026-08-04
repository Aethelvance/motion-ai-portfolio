// Scroll-driven text reveal: words transition hidden -> active (cyan with glow) -> revealed (white) as the section scrolls through the viewport. Progress is remapped to the sticky phase so the reveal only happens while the text is pinned and the user can read it.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useSectionProgress } from '@/hooks/useSectionProgress';
import styles from './TextReveal.module.css';

const TEXT =
  'Desarrollador de Software especializado en Integración de IA, Infraestructura Cloud y Frontend moderno. Apasionado por Linux, automatización y sistemas de alto rendimiento, combinando potencia en backend con Golang y velocidad visual con Astro.';

const COLOR_HIDDEN = 'var(--border)';
const COLOR_ACTIVE = 'var(--cyan)';
const COLOR_REVEALED = 'var(--text-primary)';
const REVEAL_GAP = 1.6;
const SCROLL_BUFFER = 3;
const TRANSITION_STYLE = 'color 0.25s, text-shadow 0.25s';

export interface TextRevealProps {
  sectionLabel?: string;
}

export const TextReveal = ({ sectionLabel }: TextRevealProps) => {
  const words = TEXT.split(' ');
  const wordRefs: (HTMLSpanElement | null)[] = [];
  const stickyElRef = useRef<HTMLDivElement | null>(null);
  const [stickyRange, setStickyRange] = useState<{ start: number; span: number }>({ start: 0, span: 1 });

  const wrapRef = useSectionProgress(
    useCallback((p: number) => {
      const n = words.length;
      const { start, span } = stickyRange;
      // Remap raw scroll progress (0..1 across the full section) to the sticky phase only, so reveal happens while the text is pinned.
      const pSticky = span > 0 ? (p - start) / span : 0;
      const pClamped = Math.max(0, Math.min(1, pSticky));
      const act = pClamped * (n + SCROLL_BUFFER);

      for (let i = 0; i < n; i++) {
        const el = wordRefs[i];
        if (!el) continue;
        if (i <= act - REVEAL_GAP) {
          el.style.color = COLOR_REVEALED;
          el.style.textShadow = 'none';
        } else if (i <= act) {
          el.style.color = COLOR_ACTIVE;
          el.style.textShadow = '0 0 28px var(--cyan-55)';
        } else {
          el.style.color = COLOR_HIDDEN;
          el.style.textShadow = 'none';
        }
      }
    }, [stickyRange]),
  );

  // Measure section and sticky heights to derive the p range during which the sticky element is pinned. Recompute on resize.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    const stickyEl = stickyElRef.current;
    if (!el || !stickyEl) return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const stickyRect = stickyEl.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const total = windowHeight + rect.height;
      const start = windowHeight / total;
      const end = (windowHeight - stickyRect.height + rect.height) / total;
      setStickyRange({ start, span: Math.max(0.001, end - start) });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [wrapRef]);

  return (
    <section
      id="texto"
      ref={wrapRef}
      className={`${styles.section} grid-bg`}
      data-side-nav={sectionLabel ? '' : undefined}
      data-side-nav-label={sectionLabel}
    >
      <div ref={stickyElRef} className={styles.sticky}>
        <p className={styles.paragraph}>
          {words.map((w, i) => (
            <span
              key={i}
              ref={(el) => {
                wordRefs[i] = el;
              }}
              style={{ color: COLOR_HIDDEN, transition: TRANSITION_STYLE }}
            >
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
};

export default TextReveal;
