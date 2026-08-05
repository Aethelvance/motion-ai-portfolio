// Hero organism: composes background, content stack, and corner brackets. Orchestrates the entry sequence.
import { motion } from 'framer-motion';
import HeroBackground from '@/components/molecules/HeroBackground';
import HeroCTA from '@/components/molecules/HeroCTA';
import HeroTagline from '@/components/molecules/HeroTagline';
import HeroTitle from '@/components/molecules/HeroTitle';
import HeroCorner from '@/components/atoms/HeroCorner';
import styles from './Hero.module.css';

const CORNER_POSITIONS = ['tl', 'tr', 'bl', 'br'] as const;
const ENTRY_EASE = [0.16, 1, 0.3, 1] as const;
const ENTRY_DURATION = 0.6;

// Each entry target keeps its own delay so the cascade reads as: letters → tagline → CTAs.
const entryItem = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: ENTRY_DURATION, delay, ease: ENTRY_EASE },
});

export const Hero = () => {
  return (
    <section className={styles.hero}>
      <HeroBackground particleCount={12} />

      <div className={styles.content}>
        <HeroTitle />
        <motion.div {...entryItem(0.85)}>
          <HeroTagline />
        </motion.div>
        <motion.div {...entryItem(1.05)}>
          <HeroCTA />
        </motion.div>
      </div>

      {CORNER_POSITIONS.map((position) => (
        <HeroCorner key={position} position={position} />
      ))}
    </section>
  );
};

export default Hero;
