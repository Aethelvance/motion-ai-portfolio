import { defineConfig } from '@twind/core';
import presetTailwind from '@twind/preset-tailwind';

// Official palette — derived from HERO_COLORS (src/constants/hero.ts) and the Hero background.
export const colors = {
  // Neutrals — dark with a slight cool/blue tint to make the neon accents pop.
  base: '#0a0a0a',
  surface: '#14141c',
  'surface-elevated': '#1f1f2a',
  border: '#2e2e3c',
  'text-primary': '#f5f7fa',
  'text-secondary': '#a0a4b4',

  // Accents — 6 colors from HERO_COLORS mapped to semantic tokens.
  // Plus a soft blue kept as a complement.
  primary: '#9D4EDD',
  cyan: '#00F5FF',
  'accent-blue': '#6EA8FF',
  success: '#00FF88',
  warning: '#FFD700',
  error: '#FF2D95',
  info: '#FF6B35',
} as const;

export default defineConfig({
  presets: [presetTailwind()],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ["'Noto Sans'", 'sans-serif'],
      },
    },
  },
  darkMode: 'media',
  hash: false,
});
