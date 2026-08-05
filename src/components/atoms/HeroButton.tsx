// Outlined button atom with a primary (filled) and secondary variant for hero CTAs.
import type { ReactNode } from 'react';
import styles from './HeroButton.module.css';

export type HeroButtonVariant = 'primary' | 'secondary';

export interface HeroButtonProps {
  children: ReactNode;
  variant?: HeroButtonVariant;
  onClick?: () => void;
  href?: string;
  download?: boolean | string;
  target?: string;
  rel?: string;
}

export const HeroButton = ({
  children,
  variant = 'secondary',
  onClick,
  href,
  download,
  target,
  rel,
}: HeroButtonProps) => {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary;
  const className = `${styles.btn} ${variantClass}`;
  if (href) {
    return (
      <a href={href} download={download} target={target} rel={rel} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
};

export default HeroButton;
