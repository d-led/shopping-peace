import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths keep the built site working from any location,
  // including a GitHub Pages project URL such as /avoid-running-out-of/.
  base: './',
  plugins: [tailwindcss()],
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { pretendToBeVisual: true } },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
