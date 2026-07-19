import { useState, useCallback, useRef } from 'react';

export type MenuStatus = 'closed' | 'opening' | 'open' | 'closing';

export interface UseMenuAnimationReturn {
  status: MenuStatus;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// Orchestrates the four states of the menu animation.
// Open matches the original GSAP timeline (1.4s). Close is shortened to 0.8s
// so the navigation after clicking a link feels responsive.
export const useMenuAnimation = (): UseMenuAnimationReturn => {
  const [status, setStatus] = useState<MenuStatus>('closed');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const open = useCallback(() => {
    clearTimers();
    setStatus('opening');
    timers.current.push(setTimeout(() => setStatus('open'), 1400));
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setStatus('closing');
    timers.current.push(setTimeout(() => setStatus('closed'), 800));
  }, []);

  return {
    status,
    isOpen: status === 'opening' || status === 'open',
    open,
    close,
  };
};

export default useMenuAnimation;
