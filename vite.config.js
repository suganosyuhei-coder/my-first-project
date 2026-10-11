import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Relative asset URLs also work under GitHub Pages' /my-first-project/ path.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        existing: fileURLToPath(new URL('./index.html', import.meta.url)),
        prototype: fileURLToPath(new URL('./prototype.html', import.meta.url)),
      },
    },
  },
});
