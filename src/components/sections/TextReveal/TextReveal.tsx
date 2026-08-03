// Scroll-driven text reveal: words transition hidden -> active (cyan with glow) -> revealed (white) as the section scrolls through the viewport.
import { useCallback } from 'react';
import { useSectionProgress } from '@/hooks/useSectionProgress';
import styles from './TextReveal.module.css';

const TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

const COLOR_HIDDEN = '#343a45';
const COLOR_ACTIVE = '#20c8f5';
const COLOR_REVEALED = '#f5f7fa';
const REVEAL_GAP = 1.6;
const SCROLL_BUFFER = 3;
const TRANSITION_STYLE = 'color 0.25s, text-shadow 0.25s';

export interface TextRevealProps {
  sectionLabel?: string;
}

export const TextReveal = ({ sectionLabel }: TextRevealProps) => {
  const words = TEXT.split(' ');
  const wordRefs: (HTMLSpanElement | null)[] = [];

  const wrapRef = useSectionProgress(
    useCallback((p: number) => {
      const n = words.length;
      const act = p * (n + SCROLL_BUFFER);

      for (let i = 0; i < n; i++) {
        const el = wordRefs[i];
        if (!el) continue;
        if (i <= act - REVEAL_GAP) {
          el.style.color = COLOR_REVEALED;
          el.style.textShadow = 'none';
        } else if (i <= act) {
          el.style.color = COLOR_ACTIVE;
          el.style.textShadow = '0 0 28px rgba(32, 200, 245, 0.55)';
        } else {
          el.style.color = COLOR_HIDDEN;
          el.style.textShadow = 'none';
        }
      }
    }, []),
  );

  return (
    <section
      id="texto"
      ref={wrapRef}
      className={styles.section}
      data-side-nav={sectionLabel ? '' : undefined}
      data-side-nav-label={sectionLabel}
    >
      <div className={styles.sticky}>
        <p className={styles.label}>// 05 — {sectionLabel?.toLowerCase() ?? 'texto'}</p>
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
