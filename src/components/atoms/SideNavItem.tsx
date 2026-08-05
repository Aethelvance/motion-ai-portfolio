// Vertical scroll-spy item atom: dot for inactive state, animated pill (via layoutId) for active state, with a sliding label.
import { AnimatePresence, motion } from 'framer-motion';
import styles from './SideNavItem.module.css';

export interface SideNavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const SideNavItem = ({ label, isActive, onClick }: SideNavItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.item}
      aria-label={`Ir a ${label}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <AnimatePresence>
        {isActive && (
          <motion.span
            className={styles.label}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      <span className={styles.indicator}>
        {isActive ? (
          <motion.span
            layoutId="side-nav-pill"
            className={styles.pill}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        ) : (
          <span className={styles.dot} />
        )}
      </span>
    </button>
  );
};

export default SideNavItem;
