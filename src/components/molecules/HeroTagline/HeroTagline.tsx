// Tagline molecule: a monospaced subtitle flanked by gradient lines.
import styles from './HeroTagline.module.css';

export const HeroTagline = () => {
  return (
    <div className={styles.tagline}>
      <div className={styles.sub}>
        <div className={styles.line} />
        <span>EXPERIENCE THE EXTRAORDINARY</span>
        <div className={styles.line} />
      </div>
    </div>
  );
};

export default HeroTagline;
