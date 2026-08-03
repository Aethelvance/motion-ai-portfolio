// Background molecule: grid overlay and floating particles behind the hero content.
import HeroParticle from '@/components/atoms/HeroParticle/HeroParticle';
import styles from './HeroBackground.module.css';

export interface HeroBackgroundProps {
  particleCount?: number;
}

export const HeroBackground = ({ particleCount = 12 }: HeroBackgroundProps) => {
  return (
    <>
      <div className={styles.bgGrid} />
      <div className={styles.particles}>
        {Array.from({ length: particleCount }).map((_, index) => (
          <HeroParticle key={index} index={index} />
        ))}
      </div>
    </>
  );
};

export default HeroBackground;
