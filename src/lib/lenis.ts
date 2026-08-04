// Typed accessor for the Lenis instance exposed by SmoothScroll.astro on window.__lenis. Returns undefined during SSR and before hydration so callers can no-op safely.
interface LenisScrollOptions {
  duration?: number;
  offset?: number;
  easing?: (t: number) => number;
}

interface LenisInstance {
  scrollTo: (target: string | HTMLElement | number, options?: LenisScrollOptions) => void;
  stop?: () => void;
  start?: () => void;
}

declare global {
  interface Window {
    __lenis?: LenisInstance;
  }
}

export const getLenis = (): LenisInstance | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.__lenis;
};

export type { LenisInstance, LenisScrollOptions };
