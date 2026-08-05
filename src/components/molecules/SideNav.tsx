// Vertical scroll-spy molecule: auto-discovers sections with [data-side-nav] and tracks the one currently in view via IntersectionObserver. Hidden while the hero is on screen.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import SideNavItem from '@/components/atoms/SideNavItem/SideNavItem';
import styles from './SideNav.module.css';

interface DiscoveredSection {
  id: string;
  label: string;
}

interface LenisInstance {
  scrollTo: (target: string | HTMLElement | number) => void;
}

declare global {
  interface window {
    __lenis?: LenisInstance;
  }
}

const VISIBILITY_BUFFER_PX = 100;

export const SideNav = () => {
  const [sections, setSections] = useState<DiscoveredSection[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Discovery: any element with [data-side-nav] is a tracked section.
    const elements = document.querySelectorAll<HTMLElement>('[data-side-nav]');
    const discovered: DiscoveredSection[] = Array.from(elements).map((el) => ({
      id: el.id,
      label: el.dataset.sideNavLabel || el.id,
    }));

    if (discovered.length === 0) return;

    setSections(discovered);
    setActiveId(discovered[0].id);

    // Active-section tracking: a section is "active" when its midpoint crosses the viewport center.
    const activeObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    for (const section of discovered) {
      const el = document.getElementById(section.id);
      if (el) activeObserver.observe(el);
    }

    // Visibility tracking: hide the nav until the user has scrolled past the hero viewport.
    const handleScroll = () => {
      setIsVisible(window.scrollY >= window.innerHeight - VISIBILITY_BUFFER_PX);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      activeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClick = (id: string) => {
    window.__lenis?.scrollTo(`#${id}`);
  };

  if (sections.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          className={styles.nav}
          aria-label="Section navigation"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {sections.map((section) => (
            <SideNavItem
              key={section.id}
              label={section.label}
              isActive={section.id === activeId}
              onClick={() => handleClick(section.id)}
            />
          ))}
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default SideNav;
