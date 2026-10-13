import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// '/' locally; a GitHub Pages build sets BASE_PATH=/<repo-name>/.
// The app uses hash routing, so it works on any static host without rewrites.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
});
