
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Fix: Configure esbuild to drop console and debugger in production.
  // This replaces the previous terser configuration which was causing a 'No overload matches this call' error.
  esbuild: {
    drop: ['console', 'debugger'],
    pure: ['console.debug', 'console.info']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['lucide-react', 'recharts', 'xlsx']
        }
      }
    }
  }
});
