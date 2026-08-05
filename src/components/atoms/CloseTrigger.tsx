import { motion } from 'framer-motion';
import styles from './CloseTrigger.module.css';
import type { MenuStatus } from '@/hooks/useMenuAnimation';

export interface CloseTriggerProps {
  status: MenuStatus;
  onClick: () => void;
}

const power4EaseIn = [0.7, 0, 0.84, 0];
const power4EaseOut = [0.16, 1, 0.3, 1];

const leftVariants = {
  closed: { x: 100, y: -100, opacity: 0, rotate: -45 },
  opening: { x: 0, y: 0, opacity: 1, rotate: -45 },
  open: { x: 0, y: 0, opacity: 1, rotate: -45 },
  closing: { x: 100, y: -100, opacity: 0, rotate: -45 },
};

const rightVariants = {
  closed: { x: -100, y: -100, opacity: 0, rotate: 45 },
  opening: { x: 0, y: 0, opacity: 1, rotate: 45 },
  open: { x: 0, y: 0, opacity: 1, rotate: 45 },
  closing: { x: -100, y: -100, opacity: 0, rotate: 45 },
};

// Close icon atom. Uses CSS Modules for structure/hover and Framer Motion for transforms.
export const CloseTrigger = ({ status, onClick }: CloseTriggerProps) => {
  const isVisible = status === 'opening' || status === 'open' || status === 'closing';

  return (
    <motion.button
      type="button"
      aria-label="Close menu"
      aria-expanded={status === 'opening' || status === 'open'}
      onClick={onClick}
      className={styles.closeTrigger}
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      initial="closed"
      animate={status}
    >
      <motion.span
        className={`${styles.closeTriggerBar} ${styles.left}`}
        variants={leftVariants}
        transition={{
          duration: status === 'opening' ? 0.8 : 0.2,
          delay: 0,
          ease: status === 'opening' ? power4EaseOut : power4EaseIn,
        }}
      />
      <motion.span
        className={`${styles.closeTriggerBar} ${styles.right}`}
        variants={rightVariants}
        transition={{
          duration: status === 'opening' ? 0.8 : 0.2,
          delay: status === 'opening' ? 0.2 : 0.1,
          ease: status === 'opening' ? power4EaseOut : power4EaseIn,
        }}
      />
    </motion.button>
  );
};

export default CloseTrigger;
