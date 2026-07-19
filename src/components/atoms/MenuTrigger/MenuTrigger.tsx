import { motion } from 'framer-motion';
import styles from './MenuTrigger.module.css';
import type { MenuStatus } from '@/hooks/useMenuAnimation';

export interface MenuTriggerProps {
  status: MenuStatus;
  onClick: () => void;
}

const power4EaseIn = [0.7, 0, 0.84, 0];
const power4EaseOut = [0.16, 1, 0.3, 1];

const variants = {
  closed: { x: 0, y: 0, opacity: 1, rotate: -45 },
  opening: { x: 80, y: -80, opacity: 0, rotate: -45 },
  open: { x: 80, y: -80, opacity: 0, rotate: -45 },
  closing: { x: 0, y: 0, opacity: 1, rotate: -45 },
};

// Hamburger icon atom. Uses CSS Modules for structure/hover and Framer Motion for transforms.
export const MenuTrigger = ({ status, onClick }: MenuTriggerProps) => {
  const isVisible = status === 'closed' || status === 'closing';

  return (
    <motion.button
      type="button"
      aria-label="Open menu"
      aria-expanded={status === 'opening' || status === 'open'}
      onClick={onClick}
      className={styles.menuTrigger}
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      initial="closed"
      animate={status}
    >
      <motion.span
        className={`${styles.menuTriggerBar} ${styles.top}`}
        variants={variants}
        transition={{
          duration: status === 'closing' ? 0.6 : 0.4,
          delay: status === 'opening' ? 0.1 : status === 'closing' ? 0.2 : 0,
          ease: status === 'closing' ? power4EaseOut : power4EaseIn,
        }}
      />
      <motion.span
        className={`${styles.menuTriggerBar} ${styles.middle}`}
        variants={variants}
        transition={{
          duration: status === 'closing' ? 0.6 : 0.4,
          delay: 0,
          ease: status === 'closing' ? power4EaseOut : power4EaseIn,
        }}
      />
      <motion.span
        className={`${styles.menuTriggerBar} ${styles.bottom}`}
        variants={variants}
        transition={{
          duration: status === 'closing' ? 0.6 : 0.4,
          delay: status === 'opening' ? 0.2 : status === 'closing' ? 0.1 : 0,
          ease: status === 'closing' ? power4EaseOut : power4EaseIn,
        }}
      />
    </motion.button>
  );
};

export default MenuTrigger;
