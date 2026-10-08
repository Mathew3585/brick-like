// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
    // Three.js (Socle 3D) part dans un morceau chargé à part, ~140 Ko compressé : attendu.
    build: { chunkSizeWarningLimit: 600 },
  },
});
