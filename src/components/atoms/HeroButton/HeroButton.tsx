// Outlined button atom with a primary (filled) and secondary variant for hero CTAs.
import type { ReactNode } from 'react';
import styles from './HeroButton.module.css';

export type HeroButtonVariant = 'primary' | 'secondary';

export interface HeroButtonProps {
  children: ReactNode;
  variant?: HeroButtonVariant;
  onClick?: () => void;
}

export const HeroButton = ({ children, variant = 'secondary', onClick }: HeroButtonProps) => {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary;
  return (
    <button
      type="button"
      className={`${styles.btn} ${variantClass}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default HeroButton;
