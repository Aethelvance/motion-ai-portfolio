import { useEffect } from 'react';
import { motion } from 'framer-motion';
import MenuTrigger from '@/components/atoms/MenuTrigger';
import CloseTrigger from '@/components/atoms/CloseTrigger';
import MenuBackground from '@/components/atoms/MenuBackground';
import MenuList from '@/components/molecules/MenuList';
import { MENU_ITEMS } from '@/constants/menu';
import useMenuAnimation from '@/hooks/useMenuAnimation';
import styles from './HamburgerMenu.module.css';

export interface HamburgerMenuProps {
  currentPath?: string;
}

// Locks body scroll while the overlay is open.
const useLockBodyScroll = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
};

const power4EaseOut = [0.16, 1, 0.3, 1];

// Fullscreen hamburger menu organism.
// Orchestrates the four animation states to match the original GSAP timeline.
export const HamburgerMenu = ({ currentPath }: HamburgerMenuProps) => {
  const { status, isOpen, open, close } = useMenuAnimation();

  useLockBodyScroll(isOpen);

  // Closes the menu and navigates after the shortened close animation finishes.
  const handleItemClick = (href: string) => {
    close();
    window.setTimeout(() => {
      window.location.href = href;
    }, 800);
  };

  return (
    <div className={styles.menuWrapper}>
      <MenuTrigger status={status} onClick={open} />
      <CloseTrigger status={status} onClick={close} />
      <MenuBackground status={status} />

      <motion.div
        className={styles.menuPanel}
        initial={{ opacity: 0, y: 30, visibility: 'hidden' }}
        animate={
          isOpen
            ? { opacity: 1, y: 0, visibility: 'visible' }
            : { opacity: 0, y: 20, visibility: 'hidden' }
        }
        transition={{ duration: 0.6, delay: isOpen ? 0.4 : 0, ease: power4EaseOut }}
      >
        <MenuList
          items={MENU_ITEMS}
          currentPath={currentPath}
          onItemClick={handleItemClick}
        />
      </motion.div>
    </div>
  );
};

export default HamburgerMenu;
