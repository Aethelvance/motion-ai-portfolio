// Single floating particle atom. Position and timing are derived from a deterministic index.
import type { CSSProperties } from 'react';
import styles from './HeroParticle.module.css';

export interface HeroParticleProps {
  index: number;
}

export const HeroParticle = ({ index }: HeroParticleProps) => {
  const style: CSSProperties = {
    left: `${(index * 8.3) % 100}%`,
    top: `${(index * 13.7) % 100}%`,
    animationDuration: `${3 + (index % 3)}s`,
    animationDelay: `${-(index * 0.5)}s`,
  };

  return <div className={styles.particle} style={style} />;
};

export default HeroParticle;
