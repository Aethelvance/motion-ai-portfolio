// Title molecule that orchestrates the staggered letter reveal and exposes transform variants to each letter atom.
import { motion, type Variants } from 'framer-motion';
import HeroLetter, { type HeroLetterVariant } from '@/components/atoms/HeroLetter';
import { HERO_COLORS, HERO_LETTERS } from '@/constants/hero';
import styles from './HeroTitle.module.css';

// Parent variant only carries the stagger timing; letter transforms are defined per-state below.
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const letterVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotate: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  hovered: {
    scale: 1.25,
    y: -12,
    rotate: 12,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  anim0: {
    scale: 1.1,
    y: -8,
    rotate: 6,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  anim1: {
    scale: 1.25,
    y: -16,
    rotate: -12,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  anim2: {
    scale: 1.5,
    y: -4,
    rotate: 3,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

export const HeroTitle = () => {
  let globalIndex = 0;
  return (
    <motion.div
      className={styles.title}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {HERO_LETTERS.flatMap((line, lineIndex) => [
        ...(lineIndex > 0
          ? [<div key={`break-${lineIndex}`} className={styles.lineBreak} aria-hidden="true" />]
          : []),
        ...line.map((char) => {
          const color = HERO_COLORS[globalIndex % HERO_COLORS.length];
          const variant = (globalIndex % 3) as HeroLetterVariant;
          const currentIndex = globalIndex++;
          return (
            <HeroLetter
              key={`${char}-${currentIndex}`}
              char={char}
              color={color}
              variant={variant}
              variants={letterVariants}
            />
          );
        }),
      ])}
    </motion.div>
  );
};

export default HeroTitle;
