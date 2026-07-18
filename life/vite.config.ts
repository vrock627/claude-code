import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Built output is committed at the repo's top-level `play/` folder and served
// by GitHub Pages via relative paths, hence base './' and emptyOutDir.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../play',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
