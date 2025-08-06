import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    base: './', // This ensures relative paths in the built files
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          // popup is an HTML entry
          popup: path.resolve(__dirname, 'src/popup/index.html'),
          // other JS entries (these will produce contentScript.js and background.js)
          contentScript: path.resolve(__dirname, 'src/entries/contentScript.js'),
          background: path.resolve(__dirname, 'src/entries/background.js')
        },
        output: {
          // Make filenames deterministic and without hashes so manifest can point to them
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
      emptyOutDir: true
    },
    // make root relative imports easier
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  };
});
  