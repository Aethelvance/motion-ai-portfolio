// Horizontal infinite marquee: renders two identical rows so the CSS animation can translate -50% for a seamless loop.
import styles from './Marquee.module.css';

const ITEMS = [
  'suavidad',
  'inercia',
  '60 fps',
  'easing',
  'compositor',
  'parallax',
  'lerp 0.09',
  'gpu',
] as const;

export interface MarqueeProps {
  reverse?: boolean;
}

export const Marquee = ({ reverse = false }: MarqueeProps) => {
  const renderRow = (hidden: boolean) => (
    <div aria-hidden={hidden} className={styles.row}>
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

  return (
    <div className={styles.marquee}>
      <div className={reverse ? `${styles.track} ${styles.reverse}` : styles.track}>
        {renderRow(false)}
        {renderRow(true)}
      </div>
    </div>
  );
};

export default Marquee;
