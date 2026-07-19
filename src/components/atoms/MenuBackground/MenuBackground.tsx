import { motion } from 'framer-motion';
import styles from './MenuBackground.module.css';
import type { MenuStatus } from '@/hooks/useMenuAnimation';

export interface MenuBackgroundProps {
  status: MenuStatus;
}

const power4EaseInOut = [0.77, 0, 0.175, 1];

const variants = {
  closed: {
    backgroundColor: 'var(--surface-elevated)',
  },
  opening: {
    backgroundColor: 'var(--surface-elevated)',
  },
  open: {
    backgroundColor: 'var(--surface-elevated)',
  },
  closing: {
    backgroundColor: 'var(--accent-blue)',
  },
};

// Three diagonal strips that sweep across the viewport when the menu opens.
// Uses the elevated surface color for the open state and the accent blue for
// the close flash, matching the new dark-mode palette.
export const MenuBackground = ({ status }: MenuBackgroundProps) => {
  return (
    <div className={styles.menuBgWrapper} aria-hidden="true">
      <div className={styles.menuBgStage}>
        <motion.span
          className={`${styles.menuBg} ${styles.top}`}
          variants={variants}
          initial={{ y: '-152%', rotate: -45, backgroundColor: 'var(--surface-elevated)' }}
          animate={
            status === 'closed'
              ? { y: '-152%', rotate: -45, backgroundColor: 'var(--surface-elevated)' }
              : status === 'opening' || status === 'open'
                ? { y: '30%', rotate: -45, backgroundColor: 'var(--surface-elevated)' }
                : { y: '-113%', rotate: -45, backgroundColor: 'var(--accent-blue)' }
          }
          transition={{ duration: 0.8, ease: power4EaseInOut }}
        />
        <motion.span
          className={`${styles.menuBg} ${styles.middle}`}
          variants={variants}
          initial={{ scaleY: 0, rotate: -45, backgroundColor: 'var(--surface-elevated)' }}
          animate={
            status === 'closed'
              ? { scaleY: 0, rotate: -45, backgroundColor: 'var(--surface-elevated)' }
              : status === 'opening' || status === 'open'
                ? { scaleY: 1, rotate: -45, backgroundColor: 'var(--surface-elevated)' }
                : { scaleY: 0, rotate: -45, backgroundColor: 'var(--accent-blue)' }
          }
          transition={{ duration: 0.8, ease: power4EaseInOut }}
        />
        <motion.span
          className={`${styles.menuBg} ${styles.bottom}`}
          variants={variants}
          initial={{ y: '25%', rotate: -45, backgroundColor: 'var(--surface-elevated)' }}
          animate={
            status === 'closed'
              ? { y: '25%', rotate: -45, backgroundColor: 'var(--surface-elevated)' }
                : status === 'opening' || status === 'open'
                ? { y: '-140%', rotate: -45, backgroundColor: 'var(--surface-elevated)' }
                : { y: '23%', rotate: -45, backgroundColor: 'var(--accent-blue)' }
          }
          transition={{ duration: 0.8, ease: power4EaseInOut }}
        />
      </div>
    </div>
  );
};

export default MenuBackground;
