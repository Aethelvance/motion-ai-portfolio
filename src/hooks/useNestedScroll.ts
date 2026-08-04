// Captures wheel/touch scroll intent over a nested scrollable container so the page-level
// Lenis smooth scroller does not steal it. Returns a callback ref so it works with
// conditionally rendered containers: the element is tracked via state and the effect
// re-runs when the callback fires on mount/unmount, so a container that appears later
// (e.g. inside AnimatePresence) still gets listeners attached. Uses a capture-phase
// listener to run before Lenis's window-level listener.
import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';
import { getLenis } from '@/lib/lenis';

const GESTURE_IDLE_MS = 180;
const TOUCH_HOLD_MS = 2000;

export function useNestedScroll<T extends HTMLElement>(): RefCallback<T> {
  const [el, setEl] = useState<T | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!el) return;

    const opts: AddEventListenerOptions = { capture: true, passive: true };

    const canScroll = (deltaY: number): boolean => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if (deltaY < 0 && atTop) return false;
      if (deltaY > 0 && atBottom) return false;
      return true;
    };

    const release = (): void => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      getLenis()?.start();
    };

    const hold = (resetMs: number): void => {
      getLenis()?.stop();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(release, resetMs);
    };

    const onWheel = (e: WheelEvent): void => {
      if (!canScroll(e.deltaY)) {
        release();
        return;
      }
      e.stopPropagation();
      hold(GESTURE_IDLE_MS);
    };

    const onTouchStart = (e: TouchEvent): void => {
      e.stopPropagation();
      hold(TOUCH_HOLD_MS);
    };

    const onTouchMove = (e: TouchEvent): void => {
      e.stopPropagation();
      hold(TOUCH_HOLD_MS);
    };

    const scheduleRelease = (): void => {
      if (timerRef.current === null) return;
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(release, GESTURE_IDLE_MS);
    };

    el.addEventListener('wheel', onWheel, opts);
    el.addEventListener('touchstart', onTouchStart, opts);
    el.addEventListener('touchmove', onTouchMove, opts);
    el.addEventListener('touchend', scheduleRelease, opts);
    el.addEventListener('touchcancel', scheduleRelease, opts);
    document.addEventListener('touchend', scheduleRelease, opts);

    return () => {
      el.removeEventListener('wheel', onWheel, opts);
      el.removeEventListener('touchstart', onTouchStart, opts);
      el.removeEventListener('touchmove', onTouchMove, opts);
      el.removeEventListener('touchend', scheduleRelease, opts);
      el.removeEventListener('touchcancel', scheduleRelease, opts);
      document.removeEventListener('touchend', scheduleRelease, opts);
      release();
    };
  }, [el]);

  return useCallback((node: T | null) => {
    setEl(node);
  }, []);
}
