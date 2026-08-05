// Horizontal infinite marquee: renders enough row copies to keep the viewport covered, then animates by exactly one row width so the loop seam is always continuous.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './Marquee.module.css';

const ITEMS = [
  'GOLANG',
  'ARCH LINUX',
  'DEVSECOPS',
  'LLM INTEGRATION',
  'DOCKER',
  'ASTRO',
  'TOOL CALLING',
  'NFTABLES',
  'BASH',
  'RESTIC',
  'OPENWA',
  'WEBHOOKS',
  'RPA AUTOMATION',
  'TAILWIND CSS',
  'UBUNTU SERVER',
] as const;

const SECONDS_PER_ROW = 15;
const RESIZE_DEBOUNCE_MS = 100;
const MIN_ROW_COUNT = 2;

export interface MarqueeProps {
  reverse?: boolean;
}

export const Marquee = ({ reverse = false }: MarqueeProps) => {
  const [rowWidth, setRowWidth] = useState(0);
  const [rowCount, setRowCount] = useState(MIN_ROW_COUNT);
  const [isReady, setIsReady] = useState(false);
  const firstRowRef = useRef<HTMLDivElement | null>(null);

  // Measure the first row's width and compute how many copies are needed so the track always covers the viewport at every animation frame.
  useEffect(() => {
    let timeoutId: number;
    const measure = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (!firstRowRef.current) return;
        const width = firstRowRef.current.offsetWidth;
        if (width === 0) return;
        setRowWidth(width);
        const viewportWidth = window.innerWidth;
        const copies = Math.max(MIN_ROW_COUNT, Math.ceil(viewportWidth / width) + 2);
        setRowCount(copies);
        setIsReady(true);
      }, RESIZE_DEBOUNCE_MS);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Translate by exactly one row width: with N copies where N*rowWidth >= viewportWidth + rowWidth, the track stays full at every frame and the loop seam is visually identical to the start.
  const translateValue = rowWidth > 0 ? `-${rowWidth}px` : '0px';
  const duration = SECONDS_PER_ROW;

  return (
    <div className={styles.marquee}>
      <div
        className={reverse ? styles.trackReverse : styles.track}
        style={
          {
            '--translate': translateValue,
            animationDuration: `${duration}s`,
            animationPlayState: isReady ? 'running' : 'paused',
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          } as CSSProperties
        }
      >
        {Array.from({ length: rowCount }).map((_, i) => {
          const isFirst = i === 0;
          return (
            <div
              key={i}
              ref={isFirst ? firstRowRef : undefined}
              aria-hidden={!isFirst}
              className={styles.row}
            >
              {ITEMS.map((t) => (
                <span key={t} className={styles.item}>
                  <span className={styles.text}>{t}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" className={styles.icon}>
                    <path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z" fill="currentColor" />
                  </svg>
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Marquee;
