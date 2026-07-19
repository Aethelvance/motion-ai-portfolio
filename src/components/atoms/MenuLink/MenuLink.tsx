import type { ReactNode } from 'react';
import styles from './MenuLink.module.css';

export interface MenuLinkProps {
  href: string;
  children: ReactNode;
  isActive?: boolean;
  onClick?: (href: string) => void;
}

// Single-responsibility anchor atom for the fullscreen menu.
// Keeps the real href for SEO/a11y but lets the parent handle client-side navigation.
export const MenuLink = ({ href, children, isActive, onClick }: MenuLinkProps) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onClick) return;
    event.preventDefault();
    onClick(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={[styles.menuLink, isActive ? styles.active : ''].filter(Boolean).join(' ')}
    >
      {children}
    </a>
  );
};

export default MenuLink;
