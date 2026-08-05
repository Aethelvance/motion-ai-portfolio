// Interactive letter atom: state-driven hover and random activation, with Framer Motion for smooth transform transitions.
import { motion, type Variants } from 'framer-motion';
import { useEffect, useState } from 'react';
import styles from './HeroLetter.module.css';

export type HeroLetterVariant = 0 | 1 | 2;

export interface HeroLetterProps {
  char: string;
  color: string;
  variant: HeroLetterVariant;
  variants: Variants;
}

const ACTIVE_DURATION_MS = 800;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 6000;

export const HeroLetter = ({ char, color, variant, variants }: HeroLetterProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRandomAnimating, setIsRandomAnimating] = useState(false);

  // Recursive scheduler that flashes the active state on a randomized cadence.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (cancelled) return;
      setIsRandomAnimating(true);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setIsRandomAnimating(false);
      }, ACTIVE_DURATION_MS);
    };

    const schedule = () => {
      const delay = Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS) + MIN_DELAY_MS;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        trigger();
        schedule();
      }, delay);
    };
    schedule();

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  const isActive = isHovered || isRandomAnimating;
  const animateState = isHovered
    ? 'hovered'
    : isRandomAnimating
      ? `anim${variant}`
      : 'visible';

  return (
    <motion.span
      className={isActive ? `${styles.letter} ${styles.active}` : styles.letter}
      style={{ color: isActive ? color : '#fff' }}
      variants={variants}
      animate={animateState}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {char}
    </motion.span>
  );
};

export default HeroLetter;
