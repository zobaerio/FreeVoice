import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const motionLauncher = {
  name: 'freevoice-motion-launcher',
  transformIndexHtml(html) {
    return html.replace('</body>', '  <script type="module" src="/src/motion/launcher.js"></script>\n  </body>');
  }
};

export default defineConfig({
  plugins: [react(), motionLauncher],
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: 'index.html',
        motion: 'motion.html'
      }
    }
  }
});
