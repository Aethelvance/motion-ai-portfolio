// Decorative corner bracket atom positioned absolutely in one of the four viewport corners.
import styles from './HeroCorner.module.css';

export type HeroCornerPosition = 'tl' | 'tr' | 'bl' | 'br';

export interface HeroCornerProps {
  position: HeroCornerPosition;
}

export const HeroCorner = ({ position }: HeroCornerProps) => {
  return <div className={`${styles.corner} ${styles[position]}`} aria-hidden="true" />;
};

export default HeroCorner;
