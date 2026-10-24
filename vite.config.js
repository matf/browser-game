import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the build works under any sub-path (GitHub Pages serves it at /browser-game/).
  base: './',
  // Phaser alone is ~1.4 MB minified; that's expected for a game bundle.
  build: { chunkSizeWarningLimit: 2000 },
});
