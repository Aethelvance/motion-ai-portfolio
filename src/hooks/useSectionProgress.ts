// Tracks scroll progress (0-1) of the attached element within the viewport. Progress is 0 when the element's top reaches the viewport bottom and 1 when its bottom reaches the viewport top.
import { useEffect, useRef, type RefObject } from 'react';

export type SectionProgressCallback = (progress: number) => void;

export const useSectionProgress = (
  onProgress: SectionProgressCallback,
): RefObject<HTMLElement | null> => {
  const ref = useRef<HTMLElement>(null);
  const callbackRef = useRef(onProgress);

  useEffect(() => {
    callbackRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const total = windowHeight + rect.height;
      const traveled = windowHeight - rect.top;
      const p = Math.max(0, Math.min(1, traveled / total));
      callbackRef.current(p);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    return () => cancelAnimationFrame(raf);
  }, []);

  return ref;
};

export default useSectionProgress;
