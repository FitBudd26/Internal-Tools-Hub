import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' so the built tool can be hosted from any path (subfolder, CDN, Webflow embed, etc.)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
