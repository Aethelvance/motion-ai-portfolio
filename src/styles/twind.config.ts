import { defineConfig } from '@twind/core';
import presetTailwind from '@twind/preset-tailwind';

// New dark-mode palette.
// Unused colors are kept in variables.css with usage comments.
export const colors = {
  base: '#111315',
  surface: '#171a1f',
  'surface-elevated': '#22272f',
  border: '#343a45',
  'text-primary': '#f5f7fa',
  'text-secondary': '#aeb7c2',
  primary: '#1d5bff',
  cyan: '#20c8f5',
  'accent-blue': '#6ea8ff',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ff5c5c',
  info: '#38bdf9',
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
