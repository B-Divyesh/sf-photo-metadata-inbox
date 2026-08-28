import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        app: new URL('./index.html', import.meta.url).pathname,
        privacy: new URL('./privacy/index.html', import.meta.url).pathname,
        terms: new URL('./terms/index.html', import.meta.url).pathname
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text'] }
  }
});
