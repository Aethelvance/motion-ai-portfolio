// Chat messages container scroll manager. Composes useNestedScroll (Lenis capture) and
// adds auto-scroll-to-bottom: unconditional on element attach or when `resetKey` changes
// (new conversation / switched chat), and follow-on-mutation when the user is already
// near the bottom (within BOTTOM_THRESHOLD_PX). Uses a MutationObserver on the container
// to follow new bubbles as they are appended (chunk reveals, user messages, typing
// indicator). Returns a callback ref so it works with conditionally rendered containers.
import { useCallback, useEffect, useState, type RefCallback } from 'react';
import { useNestedScroll } from './useNestedScroll';

const BOTTOM_THRESHOLD_PX = 100;

export function useChatMessagesScroll<T extends HTMLElement>(
  resetKey: string | null,
): RefCallback<T> {
  const captureRef = useNestedScroll<T>();
  const [el, setEl] = useState<T | null>(null);

  const setRef = useCallback(
    (node: T | null) => {
      setEl(node);
      captureRef(node);
    },
    [captureRef],
  );

  useEffect(() => {
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [el, resetKey]);

  useEffect(() => {
    if (!el) return;
    const mo = new MutationObserver(() => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist < BOTTOM_THRESHOLD_PX) {
        el.scrollTop = el.scrollHeight;
      }
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [el]);

  return setRef;
}
